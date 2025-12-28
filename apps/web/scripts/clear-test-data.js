#!/usr/bin/env node

/**
 * 清除测试数据
 * 删除所有来自爬虫的交易数据
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

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

async function clearTestData() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Clearing Test Data from Transactions Table                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    // 先查询有多少条数据
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->>source', 'ebay_seller_hub_crawler');
    
    if (countError) {
      throw new Error(`Failed to count records: ${countError.message}`);
    }
    
    console.log(`📊 Found ${count || 0} records to delete\n`);
    
    if (count === 0) {
      console.log('✅ No test data found. Database is clean.\n');
      return;
    }
    
    // 删除数据
    console.log('🗑️  Deleting records...');
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('metadata->>source', 'ebay_seller_hub_crawler');
    
    if (deleteError) {
      throw new Error(`Failed to delete records: ${deleteError.message}`);
    }
    
    console.log(`✅ Successfully deleted ${count} records\n`);
    
    // 验证删除
    const { count: remainingCount, error: verifyError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->>source', 'ebay_seller_hub_crawler');
    
    if (verifyError) {
      console.warn(`⚠️  Could not verify deletion: ${verifyError.message}`);
    } else {
      console.log(`✓ Verification: ${remainingCount || 0} records remaining\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

clearTestData();


