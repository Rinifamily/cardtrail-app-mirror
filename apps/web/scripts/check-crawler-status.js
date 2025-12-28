#!/usr/bin/env node

/**
 * 检查爬虫状态和数据库中的记录数
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function checkStatus() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Crawler Status Check                                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    // 检查总记录数
    const { count: totalCount, error: totalError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->>source', 'ebay_seller_hub_crawler');
    
    if (totalError) {
      throw new Error(`Failed to count records: ${totalError.message}`);
    }
    
    console.log(`📊 Total Records: ${totalCount || 0}\n`);
    
    if (totalCount > 0) {
      // 获取最近的记录
      const { data: recentData, error: recentError } = await supabase
        .from('transactions')
        .select('ebay_item_id, title, price, sold_date, created_at')
        .eq('metadata->>source', 'ebay_seller_hub_crawler')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!recentError && recentData && recentData.length > 0) {
        console.log('📝 Recent Records:');
        recentData.forEach((record, i) => {
          console.log(`\n  ${i + 1}. Item ID: ${record.ebay_item_id}`);
          console.log(`     Title: ${(record.title || '').substring(0, 60)}...`);
          console.log(`     Price: $${record.price}`);
          console.log(`     Sold Date: ${record.sold_date || 'N/A'}`);
          console.log(`     Imported: ${new Date(record.created_at).toLocaleString()}`);
        });
        console.log('');
      }
      
      // 统计信息
      const { data: statsData, error: statsError } = await supabase
        .from('transactions')
        .select('price, sold_date, grading_company')
        .eq('metadata->>source', 'ebay_seller_hub_crawler');
      
      if (!statsError && statsData) {
        const withPrice = statsData.filter(r => r.price > 0).length;
        const withDate = statsData.filter(r => r.sold_date).length;
        const withGrading = statsData.filter(r => r.grading_company).length;
        const avgPrice = statsData
          .filter(r => r.price > 0)
          .reduce((sum, r) => sum + r.price, 0) / withPrice;
        
        console.log('📈 Statistics:');
        console.log(`   Records with price: ${withPrice} (${(withPrice/statsData.length*100).toFixed(1)}%)`);
        console.log(`   Records with date: ${withDate} (${(withDate/statsData.length*100).toFixed(1)}%)`);
        console.log(`   Records with grading: ${withGrading} (${(withGrading/statsData.length*100).toFixed(1)}%)`);
        if (avgPrice > 0) {
          console.log(`   Average price: $${avgPrice.toFixed(2)}`);
        }
        console.log('');
      }
      
      // 按日期分组统计
      const { data: dateData, error: dateError } = await supabase
        .from('transactions')
        .select('created_at')
        .eq('metadata->>source', 'ebay_seller_hub_crawler')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!dateError && dateData && dateData.length > 0) {
        const lastImport = new Date(dateData[0].created_at);
        const now = new Date();
        const minutesAgo = Math.floor((now - lastImport) / 1000 / 60);
        
        console.log('⏰ Last Import:');
        console.log(`   Time: ${lastImport.toLocaleString()}`);
        console.log(`   ${minutesAgo} minutes ago`);
        
        if (minutesAgo < 5) {
          console.log('   ✅ Crawler appears to be actively running!\n');
        } else if (minutesAgo < 30) {
          console.log('   ⚠️  Crawler may have finished or paused\n');
        } else {
          console.log('   ⏸️  Crawler appears to have stopped\n');
        }
      }
    } else {
      console.log('⚠️  No records found yet. The crawler may still be running or hasn\'t started.\n');
    }
    
    console.log('💡 To view in Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/editor\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkStatus();


