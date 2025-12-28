#!/usr/bin/env node

/**
 * Import Real eBay Data
 * Uses production API to fetch actual sold listings
 */

const https = require('https');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_ENVIRONMENT = process.env.EBAY_ENVIRONMENT || 'production';
const EBAY_ENDPOINT = EBAY_ENVIRONMENT === 'production' ? 'svcs.ebay.com' : 'svcs.sandbox.ebay.com';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔑 Configuration:');
console.log('   eBay App ID:', EBAY_APP_ID ? '✓ Set' : '✗ Missing');
console.log('   eBay Environment:', EBAY_ENVIRONMENT);
console.log('   Supabase URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('');

if (!EBAY_APP_ID || !supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required configuration!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Search terms for popular Pokemon cards (generic to avoid rate limits)
const searchTerms = [
  'Pokemon PSA 10',
  'Pokemon PSA 9',
  'Pokemon Card Graded',
];

function fetchEbayListings(keywords) {
  return new Promise((resolve, reject) => {
    const params = [
      `OPERATION-NAME=findCompletedItems`,
      `SERVICE-VERSION=1.0.0`,
      `SECURITY-APPNAME=${EBAY_APP_ID}`,
      `RESPONSE-DATA-FORMAT=JSON`,
      `keywords=${encodeURIComponent(keywords)}`,
      `itemFilter(0).name=SoldItemsOnly`,
      `itemFilter(0).value=true`,
      `itemFilter(1).name=ListingType`,
      `itemFilter(1).value=FixedPrice`,
      `itemFilter(2).name=CategoryId`,
      `itemFilter(2).value=183454`,  // Pokemon TCG category
      `paginationInput.entriesPerPage=100`,
    ].join('&');

    const options = {
      hostname: EBAY_ENDPOINT,
      path: `/services/search/FindingService/v1?${params}`,
      method: 'GET',
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.errorMessage) {
            reject(new Error(JSON.stringify(response.errorMessage)));
            return;
          }
          const searchResult = response.findCompletedItemsResponse?.[0]?.searchResult?.[0];
          const items = searchResult?.item || [];
          resolve(items);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function parseGrading(title) {
  const titleLower = title.toLowerCase();
  
  // Parse grading company
  let company = null;
  let grade = null;
  
  if (titleLower.includes('psa')) {
    company = 'PSA';
    const gradeMatch = title.match(/psa\s*(\d+(?:\.\d+)?)/i);
    if (gradeMatch) grade = gradeMatch[1];
  } else if (titleLower.includes('bgs') || titleLower.includes('beckett')) {
    company = 'BGS';
    const gradeMatch = title.match(/bgs\s*(\d+(?:\.\d+)?)/i);
    if (gradeMatch) grade = gradeMatch[1];
  } else if (titleLower.includes('cgc')) {
    company = 'CGC';
    const gradeMatch = title.match(/cgc\s*(\d+(?:\.\d+)?)/i);
    if (gradeMatch) grade = gradeMatch[1];
  }
  
  return { company, grade };
}

async function importTransactions(items) {
  if (items.length === 0) return 0;
  
  console.log(`   Converting ${items.length} items...`);
  
  const transactions = items.map(item => {
    const title = item.title?.[0] || 'Unknown';
    const price = parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0');
    const currency = item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD';
    const sold_date = item.listingInfo?.[0]?.endTime?.[0];
    const { company, grade } = parseGrading(title);
    
    return {
      ebay_item_id: item.itemId?.[0],
      card_id: null,  // Will match later
      title,
      price,
      currency,
      sold_date,
      grading_company: company,
      grade,
      metadata: {
        language: 'en',  // Assume English for now
        listing_type: 'FixedPrice',
        is_active_listing: false,
        quantity: 1,
      },
    };
  });
  
  const { data, error } = await supabase
    .from('transactions')
    .upsert(transactions, {
      onConflict: 'ebay_item_id',
      ignoreDuplicates: true,
    });
  
  if (error) {
    console.error('   ❌ Database error:', error.message);
    return 0;
  }
  
  console.log(`   ✓ Inserted ${transactions.length} transactions`);
  return transactions.length;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Real eBay Data Import (Production API)                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  let totalImported = 0;
  
  for (const searchTerm of searchTerms) {
    try {
      console.log(`\n🔍 Searching: "${searchTerm}"`);
      const items = await fetchEbayListings(searchTerm);
      console.log(`   Found ${items.length} items`);
      
      if (items.length > 0) {
        const imported = await importTransactions(items);
        totalImported += imported;
      }
      
      // Rate limiting: wait between requests
      console.log('   Waiting 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      
      // If rate limited, stop
      if (error.message.includes('RateLimiter') || error.message.includes('10001')) {
        console.log('\n⚠️  Rate limit reached. Stopping.');
        break;
      }
    }
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Import Summary                                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`✓ Total imported: ${totalImported} transactions\n`);
  
  if (totalImported > 0) {
    console.log('📊 Next steps:');
    console.log('   1. Match transactions to cards (update card_id)');
    console.log('   2. Run price sync: curl -X POST http://localhost:3000/api/internal/sync-prices');
    console.log('   3. Check UI: https://cardtrail.app/cards/1\n');
  }
}

main().catch(console.error);

