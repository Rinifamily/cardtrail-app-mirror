#!/usr/bin/env node

/**
 * Test Real eBay API Connection
 * Fetch actual sold listings and import to database
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Test eBay credentials
console.log('🔑 eBay API Configuration:');
console.log('   App ID:', process.env.EBAY_APP_ID ? '✓ Set' : '✗ Missing');
console.log('   Cert ID:', process.env.EBAY_CERT_ID ? '✓ Set' : '✗ Missing');
console.log('   Dev ID:', process.env.EBAY_DEV_ID ? '✓ Set' : '✗ Missing');
console.log('   Environment:', process.env.EBAY_ENVIRONMENT || 'sandbox');
console.log('');

if (!process.env.EBAY_APP_ID || !process.env.EBAY_CERT_ID || !process.env.EBAY_DEV_ID) {
  console.error('❌ Missing eBay credentials!');
  process.exit(1);
}

// Import eBay client
async function testEbayAPI() {
  console.log('📡 Testing eBay API connection...\n');
  
  try {
    // Dynamic import to use ESM modules
    const { EbayClient } = await import('../lib/ebay/client.ts');
    const { createClient } = await import('../lib/supabase/index.ts');
    
    const ebay = new EbayClient();
    const supabase = createClient();
    
    // Test with a popular Pokemon card
    const testKeywords = 'Pikachu VMAX PSA 10';
    console.log(`🔍 Searching eBay for: "${testKeywords}"\n`);
    
    const results = await ebay.findCompletedItems({
      keywords: testKeywords,
      entriesPerPage: 10,
    });
    
    console.log(`✅ Found ${results.length} completed listings!\n`);
    
    if (results.length > 0) {
      console.log('📦 Sample result:');
      const sample = results[0];
      console.log(`   Title: ${sample.title}`);
      console.log(`   Price: $${sample.price} ${sample.currency}`);
      console.log(`   Sold: ${sample.sold_date}`);
      console.log(`   Grade: ${sample.grading_company} ${sample.grade || 'N/A'}`);
      console.log('');
      
      // Insert into database
      console.log('💾 Importing to database...');
      
      const transactions = results.map(item => ({
        ebay_item_id: item.ebay_item_id,
        card_id: null, // Will need to match later
        title: item.title,
        price: item.price,
        currency: item.currency,
        sold_date: item.sold_date,
        grading_company: item.grading_company,
        grade: item.grade,
        metadata: item.metadata,
      }));
      
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactions);
      
      if (error) {
        console.error('❌ Database error:', error.message);
      } else {
        console.log(`✅ Inserted ${transactions.length} transactions into database!\n`);
      }
    } else {
      console.log('⚠️  No results found. This might be normal for sandbox environment.');
      console.log('   Sandbox data is limited. Try different keywords or use production.\n');
    }
    
    return results.length;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run test
testEbayAPI()
  .then((count) => {
    console.log('🎉 Test complete!');
    if (count > 0) {
      console.log('\n📊 Next steps:');
      console.log('   1. Match transactions to cards (set card_id)');
      console.log('   2. Run price sync to calculate CT Prices');
      console.log('   3. Verify UI displays real data');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

