#!/usr/bin/env node

/**
 * 爬取所有 Pokemon 成交数据并导入 Supabase
 * 
 * 从 eBay Seller Hub Research 爬取所有 Pokemon 相关成交记录
 * 直到无法翻页为止，然后将数据导入到 transactions 表
 * 
 * Usage:
 *   node scripts/crawl-all-pokemon.js
 *   node scripts/crawl-all-pokemon.js --dry-run
 *   node scripts/crawl-all-pokemon.js --headless
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const crawler = require('./crawler/ebay-seller-hub-crawler');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: false,
  headless: false,
  searchKeyword: 'Pokemon',
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dry-run') {
    options.dryRun = true;
  } else if (args[i] === '--headless') {
    options.headless = true;
  } else if (args[i] === '--keyword' && args[i + 1]) {
    options.searchKeyword = args[i + 1];
    i++;
  }
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
} else if (!options.dryRun) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not found. Data will be saved to JSON file instead.');
  console.warn('   To import to database, add SUPABASE_SERVICE_ROLE_KEY to .env.local');
  console.warn('   Get it from: https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/settings/api\n');
}

/**
 * 解析评级信息从标题
 */
function parseGrading(title) {
  if (!title) return { company: null, grade: 'raw' };
  
  let company = null;
  let grade = 'raw';
  
  // 匹配 PSA
  const psaMatch = title.match(/PSA\s*(\d+(?:\.\d+)?)/i);
  if (psaMatch) {
    company = 'PSA';
    grade = `psa${psaMatch[1].replace('.', '_')}`;
  }
  
  // 匹配 BGS
  const bgsMatch = title.match(/BGS\s*(\d+(?:\.\d+)?)/i);
  if (bgsMatch) {
    company = 'BGS';
    grade = `bgs${bgsMatch[1].replace('.', '_')}`;
  }
  
  // 匹配 CGC
  const cgcMatch = title.match(/CGC\s*(\d+(?:\.\d+)?)/i);
  if (cgcMatch) {
    company = 'CGC';
    grade = `cgc${cgcMatch[1].replace('.', '_')}`;
  }
  
  return { company, grade };
}

/**
 * 解析商品状态
 */
function parseCondition(title) {
  if (!title) return 'New';
  
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('new') || lowerTitle.includes('mint') || lowerTitle.includes('sealed')) {
    return 'New';
  }
  if (lowerTitle.includes('used') || lowerTitle.includes('played')) {
    return 'Used';
  }
  if (lowerTitle.includes('parts') || lowerTitle.includes('not working')) {
    return 'For parts or not working';
  }
  
  return 'New';
}

/**
 * 转换爬虫数据为数据库格式
 */
function transformToTransactions(rawData) {
  return rawData.map(item => {
    const { company, grade } = parseGrading(item.title || '');
    const condition = parseCondition(item.title || '');
    
    return {
      ebay_item_id: item.itemId || `crawler_${Date.now()}_${Math.random()}`,
      card_id: null, // 暂时不匹配 card_id，后续可以通过标题匹配
      title: item.title || '',
      price: parseFloat(item.price || 0),
      currency: item.currency || 'USD',
      sold_date: item.soldDate || new Date().toISOString(),
      condition: condition,
      grade: grade,
      grading_company: company,
      seller: item.seller || null,
      metadata: {
        language: 'jp',
        listing_type: 'FixedPrice',
        is_active_listing: false,
        quantity: 1,
        source: 'ebay_seller_hub_crawler',
        crawled_at: new Date().toISOString(),
        link: item.link || null,
        image_url: item.imageUrl || null, // 默认图片（向后兼容）
        image_large: item.imageLarge || null, // Large 图片链接
        image_small: item.imageSmall || null, // Small 图片链接
        search_keyword: options.searchKeyword,
      },
    };
  });
}

/**
 * 保存数据到 JSON 文件
 */
function saveToJsonFile(transactions) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(__dirname, `pokemon-transactions-${timestamp}.json`);
  
  fs.writeFileSync(filename, JSON.stringify(transactions, null, 2), 'utf8');
  console.log(`  💾 Saved ${transactions.length} transactions to: ${filename}`);
  return filename;
}

/**
 * 批量插入交易数据
 */
async function insertTransactions(transactions, batchSize = 100) {
  if (transactions.length === 0) {
    return { inserted: 0, skipped: 0, errors: 0 };
  }
  
  if (options.dryRun) {
    console.log(`\n  [DRY RUN] Would insert ${transactions.length} transactions`);
    console.log('  Sample records:');
    transactions.slice(0, 3).forEach((t, i) => {
      console.log(`    ${i + 1}. ${t.title.substring(0, 60)}...`);
      console.log(`       Price: $${t.price}, Date: ${t.sold_date}, ID: ${t.ebay_item_id}`);
    });
    if (transactions.length > 3) {
      console.log(`    ... and ${transactions.length - 3} more`);
    }
    return { inserted: transactions.length, skipped: 0, errors: 0 };
  }
  
  // 如果没有 Supabase 连接，保存到文件
  if (!supabase) {
    const filename = saveToJsonFile(transactions);
    console.log(`\n  📝 To import later, run:`);
    console.log(`     node scripts/import-from-json.js ${filename}`);
    return { inserted: 0, skipped: 0, errors: 0, savedToFile: filename };
  }
  
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  // 分批插入
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .upsert(batch, {
          onConflict: 'ebay_item_id',
          ignoreDuplicates: false, // 更新已存在的记录
        })
        .select('ebay_item_id');
      
      if (error) {
        console.error(`  ❌ Error inserting batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        totalErrors += batch.length;
      } else {
        const inserted = data ? data.length : 0;
        totalInserted += inserted;
        totalSkipped += (batch.length - inserted);
        
        if (i % (batchSize * 10) === 0 || i + batchSize >= transactions.length) {
          console.log(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted} records (Total: ${totalInserted})`);
        }
      }
    } catch (error) {
      console.error(`  ❌ Exception inserting batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      totalErrors += batch.length;
    }
    
    // 避免速率限制
    if (i + batchSize < transactions.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return { inserted: totalInserted, skipped: totalSkipped, errors: totalErrors };
}

/**
 * 主执行函数
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Pokemon 成交数据全量爬取与导入                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('⚙️  Configuration:');
  console.log(`   Search Keyword: "${options.searchKeyword}"`);
  console.log(`   Max Pages: All (until no more pages)`);
  console.log(`   Headless: ${options.headless ? 'Yes' : 'No'}`);
  console.log(`   Dry Run: ${options.dryRun ? 'Yes' : 'No'}\n`);
  
  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No data will be written to database\n');
  }
  
  const startTime = Date.now();
  
  try {
    // 准备阶段 - 给用户时间登录和导航
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Preparation Phase - Please Login and Navigate            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('📋 Instructions:');
    console.log('   1. A browser window will open');
    console.log('   2. Please login to your eBay account');
    console.log('   3. Navigate to: https://www.ebay.com/sh/research');
    console.log('   4. Search for your keywords (e.g., "Pokemon") in the search box');
    console.log('   5. Wait for search results to load');
    console.log('   6. Press ENTER in this terminal when results are ready\n');
    console.log('⏳ Starting browser in 3 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 开始爬取（实时插入模式）
    console.log('🚀 Starting crawler (real-time insert mode)...\n');
    
    let totalCrawled = 0;
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    // 使用回调函数实时处理每页数据
    const rawData = await crawler.crawl(options.searchKeyword, {
      maxPages: Infinity, // 爬取所有页面
      headless: options.headless,
      waitForManualReady: true, // 等待用户准备
      onPageCrawled: async (pageData, pageNumber) => {
        // 每爬取一页就立即处理
        if (pageData.length === 0) {
          console.log(`  ⚠️  Page ${pageNumber}: No data found`);
          return;
        }
        
        totalCrawled += pageData.length;
        console.log(`\n  📄 Page ${pageNumber} crawled: ${pageData.length} transactions`);
        
        // 转换数据格式
        const transactions = transformToTransactions(pageData);
        
        // 立即插入数据库
        console.log(`  💾 Inserting page ${pageNumber} data...`);
        const result = await insertTransactions(transactions);
        
        totalInserted += result.inserted;
        totalSkipped += result.skipped;
        totalErrors += result.errors;
        
        console.log(`  ✓ Page ${pageNumber}: Inserted ${result.inserted}, Skipped ${result.skipped}, Errors ${result.errors}`);
        console.log(`  📊 Total so far: ${totalInserted} inserted, ${totalCrawled} crawled\n`);
      },
    });
    
    console.log(`\n✅ Crawling complete!`);
    console.log(`   Total transactions crawled: ${totalCrawled || rawData.length}\n`);
    
    if ((totalCrawled || rawData.length) === 0) {
      console.log('⚠️  No data found. Please check:');
      console.log('   1. Are you logged in to eBay Seller Hub?');
      console.log('   2. Does the search return results?');
      console.log('   3. Are the selectors correct?');
      return;
    }
    
    // 如果还有剩余数据（回调模式可能没有处理完）
    if (rawData.length > totalCrawled) {
      const remaining = rawData.slice(totalCrawled);
      if (remaining.length > 0) {
        console.log(`  💾 Inserting remaining ${remaining.length} records...`);
        const transactions = transformToTransactions(remaining);
        const result = await insertTransactions(transactions);
        totalInserted += result.inserted;
        totalSkipped += result.skipped;
        totalErrors += result.errors;
      }
    }
    
    const { inserted, skipped, errors } = {
      inserted: totalInserted,
      skipped: totalSkipped,
      errors: totalErrors,
    };
    
    // 总结
    const duration = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Import Complete                                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`✓ Crawled: ${rawData.length} transactions`);
    if (supabase) {
      console.log(`✓ Inserted: ${inserted} records`);
      console.log(`✓ Skipped (duplicates): ${skipped} records`);
      if (errors > 0) {
        console.log(`⚠️  Errors: ${errors} records`);
      }
    } else if (savedToFile) {
      console.log(`✓ Saved to file: ${savedToFile}`);
    }
    console.log(`✓ Duration: ${minutes}m ${seconds}s\n`);
    
    if (!options.dryRun) {
      if (supabase) {
        console.log('📊 Next Steps:');
        console.log('   1. Verify data: SELECT COUNT(*) FROM transactions WHERE metadata->>\'source\' = \'ebay_seller_hub_crawler\';');
        console.log('   2. Check recent records: SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;');
        console.log('   3. Run price sync: curl -X POST http://localhost:3000/api/internal/sync-prices');
        console.log('   4. View in UI: http://localhost:3000/market\n');
      } else {
        console.log('📊 Next Steps:');
        console.log('   1. Get SUPABASE_SERVICE_ROLE_KEY from: https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/settings/api');
        console.log('   2. Add it to apps/web/.env.local');
        console.log(`   3. Import data: node scripts/import-from-json.js ${savedToFile}\n`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();

