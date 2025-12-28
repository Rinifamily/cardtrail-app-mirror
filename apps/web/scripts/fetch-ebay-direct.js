#!/usr/bin/env node

/**
 * Direct eBay API Test
 * Bypasses TypeScript to test raw API connection
 */

const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_ENVIRONMENT = process.env.EBAY_ENVIRONMENT || 'sandbox';
const EBAY_ENDPOINT = EBAY_ENVIRONMENT === 'production'
  ? 'svcs.ebay.com'
  : 'svcs.sandbox.ebay.com';

console.log('🔑 eBay Configuration:');
console.log('   App ID:', EBAY_APP_ID ? '✓ Set' : '✗ Missing');
console.log('   Environment:', EBAY_ENVIRONMENT);
console.log('   Endpoint:', EBAY_ENDPOINT);
console.log('');

if (!EBAY_APP_ID) {
  console.error('❌ EBAY_APP_ID not set!');
  process.exit(1);
}

// Build eBay API request
const keywords = encodeURIComponent('Pikachu VMAX PSA 10');
const operation = 'findCompletedItems';

const params = [
  `OPERATION-NAME=${operation}`,
  `SERVICE-VERSION=1.0.0`,
  `SECURITY-APPNAME=${EBAY_APP_ID}`,
  `RESPONSE-DATA-FORMAT=JSON`,
  `keywords=${keywords}`,
  `itemFilter(0).name=SoldItemsOnly`,
  `itemFilter(0).value=true`,
  `itemFilter(1).name=ListingType`,
  `itemFilter(1).value=FixedPrice`,
  `paginationInput.entriesPerPage=10`,
].join('&');

const url = `/services/search/FindingService/v1?${params}`;

console.log('📡 Calling eBay API...');
console.log(`   ${operation}: "Pikachu VMAX PSA 10"`);
console.log('');

const options = {
  hostname: EBAY_ENDPOINT,
  path: url,
  method: 'GET',
  headers: {
    'X-EBAY-SOA-SECURITY-APPNAME': EBAY_APP_ID,
    'X-EBAY-SOA-OPERATION-NAME': operation,
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      console.log('✅ API Response received!');
      console.log('');
      
      // Check for errors
      if (response.errorMessage) {
        console.error('❌ eBay API Error:');
        console.error(JSON.stringify(response.errorMessage, null, 2));
        process.exit(1);
      }
      
      // Parse results
      const searchResult = response.findCompletedItemsResponse?.[0]?.searchResult?.[0];
      const count = parseInt(searchResult?.['@count'] || '0');
      const items = searchResult?.item || [];
      
      console.log(`📦 Found ${count} items`);
      console.log('');
      
      if (items.length > 0) {
        console.log('🎯 Sample results:');
        items.slice(0, 3).forEach((item, idx) => {
          const title = item.title?.[0] || 'N/A';
          const price = item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 'N/A';
          const currency = item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD';
          const endTime = item.listingInfo?.[0]?.endTime?.[0] || 'N/A';
          
          console.log(`\n   ${idx + 1}. ${title}`);
          console.log(`      Price: ${price} ${currency}`);
          console.log(`      Sold: ${endTime}`);
        });
        console.log('');
        console.log('✅ eBay API is working! Real data available.');
        console.log('');
        
        // Save sample for import
        const fs = require('fs');
        fs.writeFileSync(
          path.join(__dirname, 'ebay-sample-response.json'),
          JSON.stringify(response, null, 2)
        );
        console.log('💾 Full response saved to: scripts/ebay-sample-response.json');
        
      } else {
        console.log('⚠️  No items found.');
        console.log('');
        console.log('This is normal for sandbox environment.');
        console.log('Sandbox has limited test data.');
        console.log('');
        console.log('💡 Options:');
        console.log('   1. Try different keywords');
        console.log('   2. Use production credentials (when ready)');
        console.log('   3. Populate with your own test data');
      }
      
    } catch (error) {
      console.error('❌ Parse error:', error.message);
      console.log('Raw response:', data.substring(0, 500));
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.end();

