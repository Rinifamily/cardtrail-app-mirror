#!/usr/bin/env node

/**
 * 检查数据库中的交易数据
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function checkDatabase() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Database Check - Transactions Table                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    // 检查所有交易数据
    const { count: totalCount, error: totalError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) {
      throw new Error(`Failed to count: ${totalError.message}`);
    }
    
    console.log(`📊 Total transactions in database: ${totalCount || 0}\n`);
    
    // 检查爬虫数据
    const { count: crawlerCount, error: crawlerError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->>source', 'ebay_seller_hub_crawler');
    
    if (crawlerError) {
      console.warn(`⚠️  Error checking crawler data: ${crawlerError.message}`);
    } else {
      console.log(`📊 Crawler transactions: ${crawlerCount || 0}\n`);
    }
    
    // 获取最近的记录
    const { data: recentData, error: recentError } = await supabase
      .from('transactions')
      .select('id, ebay_item_id, title, price, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentError) {
      console.warn(`⚠️  Error fetching recent records: ${recentError.message}`);
    } else if (recentData && recentData.length > 0) {
      console.log('📝 Recent 10 records:');
      recentData.forEach((record, i) => {
        const source = record.metadata?.source || 'unknown';
        console.log(`\n  ${i + 1}. ID: ${record.id}`);
        console.log(`     eBay Item ID: ${record.ebay_item_id}`);
        console.log(`     Title: ${(record.title || '').substring(0, 50)}...`);
        console.log(`     Price: $${record.price}`);
        console.log(`     Source: ${source}`);
        console.log(`     Created: ${new Date(record.created_at).toLocaleString()}`);
      });
    } else {
      console.log('⚠️  No records found in database\n');
    }
    
    // 按来源统计
    const { data: allData, error: allError } = await supabase
      .from('transactions')
      .select('metadata');
    
    if (!allError && allData) {
      const sources = {};
      allData.forEach(record => {
        const source = record.metadata?.source || 'unknown';
        sources[source] = (sources[source] || 0) + 1;
      });
      
      if (Object.keys(sources).length > 0) {
        console.log('\n📈 Records by source:');
        Object.entries(sources).forEach(([source, count]) => {
          console.log(`   ${source}: ${count}`);
        });
      }
    }
    
    console.log('\n💡 SQL Query to check:');
    console.log('   SELECT COUNT(*) FROM transactions WHERE metadata->>\'source\' = \'ebay_seller_hub_crawler\';');
    console.log('   SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkDatabase();


