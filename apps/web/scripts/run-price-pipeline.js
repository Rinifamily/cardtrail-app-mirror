#!/usr/bin/env node

/**
 * 价格数据完整流程脚本
 * 
 * 1. 使用爬虫导入 eBay 交易数据
 * 2. 运行价格同步生成价格历史
 * 3. 验证数据完整性
 * 
 * Usage:
 *   node scripts/run-price-pipeline.js --crawler-limit 100 --sync-limit 1000
 */

const { spawn } = require('child_process');
const path = require('path');

// 解析命令行参数
const args = process.argv.slice(2);
const options = {
  crawlerLimit: 100,
  syncLimit: 1000,
  dryRun: false,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--crawler-limit' && args[i + 1]) {
    options.crawlerLimit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--sync-limit' && args[i + 1]) {
    options.syncLimit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--dry-run') {
    options.dryRun = true;
  }
}

/**
 * 运行命令并返回 Promise
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    proc.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 步骤 1: 导入爬虫数据
 */
async function step1ImportCrawlerData() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Step 1: Importing Crawler Data                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const args = [
    'scripts/import-crawler-data.js',
    '--limit',
    options.crawlerLimit.toString(),
  ];
  
  if (options.dryRun) {
    args.push('--dry-run');
  }
  
  try {
    await runCommand('node', args, { cwd: path.join(__dirname, '..') });
    console.log('\n✅ Step 1 Complete: Crawler data imported\n');
    return true;
  } catch (error) {
    console.error('\n❌ Step 1 Failed:', error.message);
    return false;
  }
}

/**
 * 步骤 2: 同步价格
 */
async function step2SyncPrices() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Step 2: Syncing Prices                                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // 加载环境变量
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
  
  const { syncPrices } = require('../lib/internal/sync-prices');
  
  try {
    const summary = await syncPrices({
      limit: options.syncLimit,
      offset: 0,
      dryRun: options.dryRun,
    });
    
    console.log('\n✅ Step 2 Complete: Prices synced');
    console.log(`   Processed: ${summary.processed} cards`);
    console.log(`   Successful: ${summary.successful}`);
    console.log(`   Failed: ${summary.failed}\n`);
    return true;
  } catch (error) {
    console.error('\n❌ Step 2 Failed:', error.message);
    return false;
  }
}

/**
 * 步骤 3: 验证数据
 */
async function step3VerifyData() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Step 3: Verifying Data                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const { createClient } = require('@supabase/supabase-js');
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    return false;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
  
  try {
    // 检查交易数据
    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Transactions: ${transactionCount || 0} total`);
    
    // 检查价格历史
    const { count: priceHistoryCount } = await supabase
      .from('price_history')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Price History Records: ${priceHistoryCount || 0} total`);
    
    // 检查有价格的卡片
    const { count: cardsWithPrice } = await supabase
      .from('card_extensions')
      .select('*', { count: 'exact', head: true })
      .not('current_price_psa10', 'is', null);
    
    console.log(`📊 Cards with Prices: ${cardsWithPrice || 0} total\n`);
    
    console.log('✅ Step 3 Complete: Data verified\n');
    return true;
  } catch (error) {
    console.error('❌ Step 3 Failed:', error.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Price Data Pipeline                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('⚙️  Configuration:');
  console.log(`   Crawler Limit: ${options.crawlerLimit} cards`);
  console.log(`   Sync Limit: ${options.syncLimit} cards`);
  console.log(`   Dry Run: ${options.dryRun ? 'Yes' : 'No'}\n`);
  
  const startTime = Date.now();
  
  // 执行步骤
  const step1Success = await step1ImportCrawlerData();
  if (!step1Success) {
    console.error('\n❌ Pipeline failed at Step 1');
    process.exit(1);
  }
  
  const step2Success = await step2SyncPrices();
  if (!step2Success) {
    console.error('\n❌ Pipeline failed at Step 2');
    process.exit(1);
  }
  
  const step3Success = await step3VerifyData();
  if (!step3Success) {
    console.error('\n❌ Pipeline failed at Step 3');
    process.exit(1);
  }
  
  // 完成
  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Pipeline Complete                                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ All steps completed successfully`);
  console.log(`⏱️  Total duration: ${duration}s\n`);
  console.log('📊 Next Steps:');
  console.log('   1. Visit http://localhost:3000/cards/1 to see prices');
  console.log('   2. Visit http://localhost:3000/market to see market data');
  console.log('   3. Visit http://localhost:3000/rankings to see rankings\n');
}

// 运行
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});


