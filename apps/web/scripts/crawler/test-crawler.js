#!/usr/bin/env node

/**
 * Test eBay Seller Hub Crawler
 * 测试爬取 2 页数据（约 100 条记录）
 */

const crawler = require('./ebay-seller-hub-crawler');

async function test() {
  console.log('🚀 Starting crawler test...');
  console.log('   Searching: "Pokemon"');
  console.log('   Max pages: 2\n');
  
  try {
    const results = await crawler.crawl('Pokemon', {
      maxPages: 2,
      headless: false, // 显示浏览器窗口
    });
    
    console.log('\n✅ Crawling complete!');
    console.log(`📊 Total transactions found: ${results.length}\n`);
    
    if (results.length > 0) {
      console.log('First 5 records:');
      results.slice(0, 5).forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.title}`);
        console.log(`   Item ID: ${item.itemId}`);
        console.log(`   Price: $${item.price}`);
        console.log(`   Date: ${item.soldDate}`);
        console.log(`   Image: ${item.imageUrl ? 'Yes' : 'No'}`);
        console.log(`   Link: ${item.link || 'N/A'}`);
      });
      
      // Statistics
      const withPrice = results.filter(r => r.price > 0).length;
      const withDate = results.filter(r => r.soldDate).length;
      const withImage = results.filter(r => r.imageUrl).length;
      const withItemId = results.filter(r => r.itemId).length;
      
      console.log('\n📈 Statistics:');
      console.log(`   Total records: ${results.length}`);
      console.log(`   With price: ${withPrice} (${(withPrice/results.length*100).toFixed(1)}%)`);
      console.log(`   With date: ${withDate} (${(withDate/results.length*100).toFixed(1)}%)`);
      console.log(`   With image: ${withImage} (${(withImage/results.length*100).toFixed(1)}%)`);
      console.log(`   With item ID: ${withItemId} (${(withItemId/results.length*100).toFixed(1)}%)`);
      
      // Check data quality
      console.log('\n🔍 Data Quality Check:');
      const validRecords = results.filter(r => r.itemId && r.title && r.price > 0);
      console.log(`   Valid records: ${validRecords.length} / ${results.length}`);
      
      if (validRecords.length < results.length * 0.8) {
        console.log('   ⚠️  Warning: Less than 80% of records are valid');
      } else {
        console.log('   ✅ Data quality looks good!');
      }
    } else {
      console.log('⚠️  No transactions found. Please check:');
      console.log('   1. Are you logged in to eBay Seller Hub?');
      console.log('   2. Does the search return results?');
      console.log('   3. Are the selectors correct?');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();


