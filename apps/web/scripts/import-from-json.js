#!/usr/bin/env node

/**
 * 从 JSON 文件导入交易数据到 Supabase
 * 
 * Usage:
 *   node scripts/import-from-json.js pokemon-transactions-2025-12-26T10-30-00-000Z.json
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Parse command line arguments
const jsonFile = process.argv[2];

if (!jsonFile) {
  console.error('❌ Usage: node scripts/import-from-json.js <json-file>');
  process.exit(1);
}

const jsonPath = path.isAbsolute(jsonFile) ? jsonFile : path.join(__dirname, jsonFile);

if (!fs.existsSync(jsonPath)) {
  console.error(`❌ File not found: ${jsonPath}`);
  process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Get SERVICE_ROLE_KEY from: https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/settings/api');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

/**
 * 批量插入交易数据
 */
async function insertTransactions(transactions, batchSize = 100) {
  if (transactions.length === 0) {
    return { inserted: 0, skipped: 0, errors: 0 };
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
  console.log('║  Import Transactions from JSON File                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📁 File: ${jsonPath}\n`);
  
  const startTime = Date.now();
  
  try {
    // 读取 JSON 文件
    console.log('📖 Reading JSON file...');
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    const transactions = JSON.parse(fileContent);
    
    if (!Array.isArray(transactions)) {
      throw new Error('JSON file must contain an array of transactions');
    }
    
    console.log(`   ✓ Loaded ${transactions.length} transactions\n`);
    
    // 数据统计
    const withPrice = transactions.filter(t => t.price > 0).length;
    const withDate = transactions.filter(t => t.sold_date).length;
    const withItemId = transactions.filter(t => t.ebay_item_id).length;
    
    console.log('📊 Data Statistics:');
    console.log(`   Total records: ${transactions.length}`);
    console.log(`   With price: ${withPrice} (${(withPrice/transactions.length*100).toFixed(1)}%)`);
    console.log(`   With date: ${withDate} (${(withDate/transactions.length*100).toFixed(1)}%)`);
    console.log(`   With item ID: ${withItemId} (${(withItemId/transactions.length*100).toFixed(1)}%)\n`);
    
    // 插入数据库
    console.log('💾 Inserting into database...');
    const { inserted, skipped, errors } = await insertTransactions(transactions);
    
    // 总结
    const duration = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Import Complete                                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`✓ Total: ${transactions.length} transactions`);
    console.log(`✓ Inserted: ${inserted} records`);
    console.log(`✓ Skipped (duplicates): ${skipped} records`);
    if (errors > 0) {
      console.log(`⚠️  Errors: ${errors} records`);
    }
    console.log(`✓ Duration: ${minutes}m ${seconds}s\n`);
    
    console.log('📊 Next Steps:');
    console.log('   1. Verify data: SELECT COUNT(*) FROM transactions WHERE metadata->>\'source\' = \'ebay_seller_hub_crawler\';');
    console.log('   2. Check recent records: SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;');
    console.log('   3. Run price sync: curl -X POST http://localhost:3000/api/internal/sync-prices');
    console.log('   4. View in UI: http://localhost:3000/market\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();


