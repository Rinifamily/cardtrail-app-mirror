#!/usr/bin/env node

/**
 * 启动爬虫（带准备阶段）
 * 
 * 运行后会先打开浏览器，给你时间登录并导航到 Research 页面
 * 然后自动开始爬取
 * 
 * Usage:
 *   node scripts/start-crawler.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Pokemon 成交数据爬虫 - 启动脚本                          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📋 使用说明：');
console.log('   1. 浏览器窗口将自动打开');
console.log('   2. 请登录你的 eBay 账号');
console.log('   3. 导航到 Research 页面: https://www.ebay.com/sh/research');
console.log('   4. 爬虫会自动检测并开始爬取\n');

console.log('🚀 正在启动爬虫...\n');

// 运行爬虫脚本
const crawlerScript = path.join(__dirname, 'crawl-all-pokemon.js');
const child = spawn('node', [crawlerScript], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

child.on('error', (error) => {
  console.error('❌ 启动失败:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\n❌ 爬虫退出，代码: ${code}`);
  } else {
    console.log('\n✅ 爬虫已完成');
  }
  process.exit(code);
});

// 处理 Ctrl+C
process.on('SIGINT', () => {
  console.log('\n⚠️  正在停止爬虫...');
  child.kill('SIGINT');
  process.exit(0);
});


