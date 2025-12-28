#!/usr/bin/env node

/**
 * eBay Crawler Data Import Script
 * 
 * 使用爬虫插件获取 eBay 价格数据并导入到 Supabase
 * 
 * Usage:
 *   node scripts/import-crawler-data.js --limit 100
 *   node scripts/import-crawler-data.js --card-id 123
 *   node scripts/import-crawler-data.js --dry-run
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: 100,
  cardId: null,
  dryRun: false,
  crawlerPath: null,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--card-id' && args[i + 1]) {
    options.cardId = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--dry-run') {
    options.dryRun = true;
  } else if (args[i] === '--crawler-path' && args[i + 1]) {
    options.crawlerPath = args[i + 1];
    i++;
  }
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

/**
 * 加载 eBay Seller Hub 爬虫插件
 */
async function loadCrawler() {
  const crawlerPath = options.crawlerPath || path.join(__dirname, 'crawler', 'ebay-seller-hub-crawler.js');
  
  if (fs.existsSync(crawlerPath)) {
    const crawler = require(crawlerPath);
    return {
      crawl: async (keywords) => {
        // 使用 eBay Seller Hub 爬虫
        return await crawler.crawl(keywords, {
          maxPages: Infinity, // 爬取所有页面
          headless: false, // 显示浏览器窗口，方便调试和登录
        });
      }
    };
  }
  
  throw new Error(`Crawler not found at ${crawlerPath}. Please ensure the crawler is in apps/web/scripts/crawler/`);
}

/**
 * 从数据库获取卡片列表
 */
async function fetchCards() {
  console.log('📦 Fetching cards from database...\n');
  
  let query = supabase
    .from('card_jp')
    .select('id, card_name, set_name, set_slug, card_index')
    .not('card_name', 'is', null)
    .order('id', { ascending: true });
  
  if (options.cardId) {
    query = query.eq('id', options.cardId);
  } else {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch cards: ${error.message}`);
  }
  
  console.log(`✓ Found ${data.length} cards to process\n`);
  return data;
}

/**
 * 构建 eBay 搜索关键词
 */
function buildSearchKeywords(card, grade = 'psa10') {
  const cardName = card.card_name;
  const setName = card.set_name;
  const cardNumber = card.card_index || '';
  
  // 提取评级信息
  let gradeKeyword = '';
  if (grade === 'psa10') gradeKeyword = 'PSA 10';
  else if (grade === 'psa9') gradeKeyword = 'PSA 9';
  else if (grade === 'psa8') gradeKeyword = 'PSA 8';
  else if (grade === 'bgs9_5') gradeKeyword = 'BGS 9.5';
  else if (grade === 'cgc9_5') gradeKeyword = 'CGC 9.5';
  
  // 构建搜索查询
  let keywords = `${cardName} ${setName}`;
  if (cardNumber) keywords += ` ${cardNumber}`;
  if (gradeKeyword) keywords += ` ${gradeKeyword}`;
  keywords += ' Pokemon Japanese';
  
  return keywords.trim();
}

/**
 * 解析评级信息从标题
 */
function parseGrading(title) {
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
 * 使用爬虫获取 eBay 数据
 */
async function fetchEbayDataWithCrawler(card, grade = 'psa10') {
  const keywords = buildSearchKeywords(card, grade);
  
  console.log(`  🔍 Crawling eBay Seller Hub: "${keywords}"`);
  
  try {
    const crawler = await loadCrawler();
    const rawData = await crawler.crawl(keywords);
    
    // 转换数据格式
    const transactions = rawData.map(item => {
      const { company, grade: parsedGrade } = parseGrading(item.title || '');
      
      return {
        ebay_item_id: item.itemId || `crawler_${Date.now()}_${Math.random()}`,
        card_id: card.id,
        title: item.title || '',
        price: parseFloat(item.price || 0),
        currency: item.currency || 'USD',
        sold_date: item.soldDate || new Date().toISOString(),
        condition: item.condition || 'New',
        grading_company: company || item.grading_company,
        grade: parsedGrade || item.grade || 'raw',
        seller: item.seller || null,
        metadata: {
          language: 'jp',
          listing_type: 'FixedPrice',
          is_active_listing: false,
          quantity: 1,
          source: 'ebay_seller_hub_crawler',
          crawled_at: new Date().toISOString(),
          link: item.link || null,
          image_url: item.imageUrl || null, // 保存图片URL
        },
      };
    });
    
    console.log(`  ✓ Found ${transactions.length} transactions`);
    return transactions;
    
  } catch (error) {
    console.error(`  ❌ Crawler error: ${error.message}`);
    return [];
  }
}

/**
 * 插入交易数据到数据库
 */
async function insertTransactions(transactions) {
  if (transactions.length === 0) {
    return { inserted: 0, skipped: 0 };
  }
  
  if (options.dryRun) {
    console.log(`  [DRY RUN] Would insert ${transactions.length} transactions`);
    transactions.slice(0, 5).forEach(t => {
      console.log(`    - ${t.title}: $${t.price} (${t.ebay_item_id})`);
    });
    if (transactions.length > 5) {
      console.log(`    ... and ${transactions.length - 5} more`);
    }
    return { inserted: transactions.length, skipped: 0 };
  }
  
  const { data, error } = await supabase
    .from('transactions')
    .upsert(transactions, {
      onConflict: 'ebay_item_id',
      ignoreDuplicates: true,
    });
  
  if (error) {
    console.error(`  ❌ Error inserting transactions: ${error.message}`);
    return { inserted: 0, skipped: transactions.length };
  }
  
  console.log(`  ✓ Inserted ${transactions.length} transactions`);
  return { inserted: transactions.length, skipped: 0 };
}

/**
 * 处理单个卡片
 */
async function processCard(card) {
  console.log(`\n📇 Processing Card #${card.id}: ${card.card_name}`);
  console.log(`   Set: ${card.set_name} (${card.set_slug})`);
  
  const grades = ['psa10', 'psa9', 'raw'];
  let totalInserted = 0;
  
  for (const grade of grades) {
    try {
      const transactions = await fetchEbayDataWithCrawler(card, grade);
      const { inserted } = await insertTransactions(transactions);
      totalInserted += inserted;
      
      // 速率限制：请求之间等待 2 秒
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`  ❌ Error processing ${grade}: ${error.message}`);
    }
  }
  
  return totalInserted;
}

/**
 * 主执行函数
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  eBay Crawler Data Import Script                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('⚙️  Configuration:');
  console.log(`   Limit: ${options.limit} cards`);
  console.log(`   Card ID: ${options.cardId || 'All'}`);
  console.log(`   Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log(`   Crawler Path: ${options.crawlerPath || 'Default'}\n`);
  
  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No data will be written to database\n');
  }
  
  const startTime = Date.now();
  
  try {
    // 加载爬虫插件
    console.log('🔧 Loading crawler plugin...');
    await loadCrawler();
    console.log('✓ Crawler loaded\n');
    
    // 获取卡片
    const cards = await fetchCards();
    
    if (cards.length === 0) {
      console.log('⚠️  No cards found to process');
      return;
    }
    
    // 处理每个卡片
    let totalTransactions = 0;
    for (const card of cards) {
      const inserted = await processCard(card);
      totalTransactions += inserted;
    }
    
    // 总结
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Import Complete                                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`✓ Processed: ${cards.length} cards`);
    console.log(`✓ Imported: ${totalTransactions} transactions`);
    console.log(`✓ Duration: ${duration}s\n`);
    
    if (!options.dryRun) {
      console.log('📊 Next Steps:');
      console.log('   1. Verify data: SELECT COUNT(*) FROM transactions WHERE metadata->>\'source\' = \'ebay_seller_hub_crawler\';');
      console.log('   2. Run price sync: curl -X POST http://localhost:3000/api/internal/sync-prices');
      console.log('   3. Check UI: http://localhost:3000/cards/1\n');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行脚本
main();
