#!/usr/bin/env node

/**
 * 调试爬虫 - 检查爬虫是否正常工作
 */

const crawler = require('./crawler/ebay-seller-hub-crawler');

async function debug() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Crawler Debug - Test Single Page Crawl                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 This will test crawling just 1 page to see if it works\n');
  
  try {
    console.log('🚀 Starting test crawl (1 page only)...\n');
    
    const results = await crawler.crawl('Pokemon', {
      maxPages: 1, // 只爬 1 页测试
      headless: false,
      waitForManualReady: true,
    });
    
    console.log(`\n✅ Test complete!`);
    console.log(`   Found ${results.length} transactions\n`);
    
    if (results.length > 0) {
      console.log('Sample data:');
      results.slice(0, 3).forEach((item, i) => {
        console.log(`\n  ${i + 1}. Item ID: ${item.itemId}`);
        console.log(`     Title: ${item.title}`);
        console.log(`     Price: $${item.price}`);
        console.log(`     Date: ${item.soldDate}`);
        console.log(`     Large Image: ${item.imageLarge ? 'Yes' : 'No'}`);
        console.log(`     Small Image: ${item.imageSmall ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('⚠️  No data found. Possible issues:');
      console.log('   1. Search returned no results');
      console.log('   2. Selectors are incorrect');
      console.log('   3. Page structure changed');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

debug();


