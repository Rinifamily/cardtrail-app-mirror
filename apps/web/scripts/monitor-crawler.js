#!/usr/bin/env node

/**
 * 实时监控爬虫进度
 * 检查数据库中的记录数变化
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

let lastCount = 0;

async function monitor() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Crawler Monitor - Real-time Progress                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('📊 Monitoring database for new records...');
  console.log('   Press Ctrl+C to stop\n');
  
  const interval = setInterval(async () => {
    try {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('metadata->>source', 'ebay_seller_hub_crawler');
      
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        return;
      }
      
      const currentCount = count || 0;
      
      if (currentCount > lastCount) {
        const newRecords = currentCount - lastCount;
        console.log(`✅ +${newRecords} new records! Total: ${currentCount} (${new Date().toLocaleTimeString()})`);
        lastCount = currentCount;
      } else if (currentCount === 0 && lastCount === 0) {
        console.log(`⏳ Waiting for data... (${new Date().toLocaleTimeString()})`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }, 5000); // 每 5 秒检查一次
  
  // 处理退出
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n\n📊 Final count:', lastCount);
    console.log('✅ Monitor stopped');
    process.exit(0);
  });
}

monitor();


