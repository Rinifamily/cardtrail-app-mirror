#!/usr/bin/env node

/**
 * Slow Real eBay Data Import
 * Uses very conservative rate limiting to avoid hitting limits
 */

const https = require('https');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const APP_ID = process.env.EBAY_APP_ID;
const ENDPOINT = 'svcs.ebay.com';  // Production

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('🚀 Real eBay Data Import (SLOW MODE)');
console.log('   App ID:', APP_ID ? '✓' : '✗');
console.log('   Mode: Production API');
console.log('   Rate: 1 request per 5 seconds');
console.log('');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchEbay(keywords) {
  return new Promise((resolve, reject) => {
    const params = [
      'OPERATION-NAME=findCompletedItems',
      'SERVICE-VERSION=1.0.0',
      `SECURITY-APPNAME=${APP_ID}`,
      'RESPONSE-DATA-FORMAT=JSON',
      `keywords=${encodeURIComponent(keywords)}`,
      'itemFilter(0).name=SoldItemsOnly',
      'itemFilter(0).value=true',
      'categoryId=183454',  // Pokemon
      'paginationInput.entriesPerPage=50',
    ].join('&');

    const req = https.get(`https://${ENDPOINT}/services/search/FindingService/v1?${params}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.errorMessage) {
            const errorCode = response.errorMessage[0]?.error?.[0]?.errorId?.[0];
            const errorMsg = response.errorMessage[0]?.error?.[0]?.message?.[0];
            
            if (errorCode === '10001') {
              reject(new Error('RATE_LIMIT'));
            } else {
              reject(new Error(`eBay Error ${errorCode}: ${errorMsg}`));
            }
            return;
          }

          const items = response.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];
          resolve(items);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => reject(new Error('Timeout')));
  });
}

function parseGrade(title) {
  const titleLower = title.toLowerCase();
  let company = null;
  let grade = null;

  if (titleLower.includes('psa')) {
    company = 'PSA';
    const match = title.match(/psa\s*(\d+)/i);
    if (match) grade = match[1];
  } else if (titleLower.includes('bgs') || titleLower.includes('beckett')) {
    company = 'BGS';
    const match = title.match(/bgs\s*(\d+(?:\.\d)?)/i);
    if (match) grade = match[1];
  } else if (titleLower.includes('cgc')) {
    company = 'CGC';
    const match = title.match(/cgc\s*(\d+(?:\.\d)?)/i);
    if (match) grade = match[1];
  }

  return { company, grade };
}

async function processCard(card, grade) {
  const keywords = `${card.card_name} ${card.card_index || ''} ${grade.toUpperCase()} Pokemon Japanese`;
  
  console.log(`\n📦 Card #${card.id}: ${card.card_name}`);
  console.log(`   Grade: ${grade}`);
  console.log(`   Searching: "${keywords.substring(0, 60)}..."`);

  try {
    const items = await fetchEbay(keywords);
    
    if (items.length === 0) {
      console.log('   No results found');
      return { imported: 0, rateLimited: false };
    }

    console.log(`   Found ${items.length} items`);

    // Convert to transactions
    const transactions = items.map(item => {
      const { company, grade: parsedGrade } = parseGrade(item.title?.[0] || '');
      
      return {
        ebay_item_id: item.itemId?.[0],
        card_id: card.id,
        title: item.title?.[0],
        price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0'),
        currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD',
        sold_date: item.listingInfo?.[0]?.endTime?.[0],
        grading_company: company,
        grade: parsedGrade,
        metadata: {
          language: 'jp',
          listing_type: 'FixedPrice',
          is_active_listing: false,
          quantity: 1,
        },
      };
    });

    // Insert to database
    const { error } = await supabase
      .from('transactions')
      .upsert(transactions, {
        onConflict: 'ebay_item_id',
        ignoreDuplicates: true,
      });

    if (error) {
      console.error('   Database error:', error.message);
      return { imported: 0, rateLimited: false };
    }

    console.log(`   ✅ Imported ${transactions.length} transactions`);
    return { imported: transactions.length, rateLimited: false };

  } catch (error) {
    if (error.message === 'RATE_LIMIT') {
      console.log('   ⚠️ RATE LIMIT HIT');
      return { imported: 0, rateLimited: true };
    }
    
    console.error('   Error:', error.message);
    return { imported: 0, rateLimited: false };
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Phase 07: Real eBay Data Import                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get card count from args or default to 10
  const maxCards = parseInt(process.argv[2]) || 10;
  
  console.log(`📊 Configuration:`);
  console.log(`   Max cards: ${maxCards}`);
  console.log(`   Grades: PSA 10, PSA 9`);
  console.log(`   Delay: 5 seconds between requests`);
  console.log('');

  // Get cards
  const { data: cards } = await supabase
    .from('card_jp')
    .select('id, card_name, set_name, card_index')
    .not('card_name', 'is', null)
    .order('id')
    .limit(maxCards);

  if (!cards || cards.length === 0) {
    console.error('❌ No cards found');
    process.exit(1);
  }

  console.log(`✓ Found ${cards.length} cards to process\n`);

  let totalImported = 0;
  let rateLimited = false;

  for (const card of cards) {
    for (const grade of ['PSA 10', 'PSA 9']) {
      const { imported, rateLimited: hitLimit } = await processCard(card, grade);
      totalImported += imported;

      if (hitLimit) {
        rateLimited = true;
        break;
      }

      // Wait 5 seconds between requests
      await sleep(5000);
    }

    if (rateLimited) {
      console.log('\n⚠️ Rate limit reached. Stopping.');
      console.log('   Try again in 24 hours or contact eBay support for higher limits.');
      break;
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Import Summary                                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`✓ Total imported: ${totalImported} real eBay transactions`);
  console.log(`✓ Cards processed: ${cards.length}`);
  console.log('');

  if (totalImported > 0) {
    console.log('📊 Next: Calculate CT Prices');
    console.log('   Run: curl -X POST http://localhost:3000/api/internal/sync-prices');
  }
}

main().catch(console.error);

