#!/usr/bin/env node

/**
 * eBay Transaction Data Import Script
 * 
 * Fetches sold listings from eBay API and populates the transactions table.
 * This provides the raw data needed for CT Price calculations.
 * 
 * Usage:
 *   node scripts/import-ebay-transactions.js --limit 100
 *   node scripts/import-ebay-transactions.js --card-id 123
 *   node scripts/import-ebay-transactions.js --dry-run
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: 100,
  cardId: null,
  dryRun: false,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--card-id' && args[i + 1]) {
    options.cardId = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--dry-run') {
    options.dryRun = true;
  }
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// eBay API configuration
const EBAY_CONFIG = {
  appId: process.env.EBAY_APP_ID,
  certId: process.env.EBAY_CERT_ID,
  devId: process.env.EBAY_DEV_ID,
  environment: process.env.EBAY_ENVIRONMENT || 'sandbox',
};

if (!EBAY_CONFIG.appId || !EBAY_CONFIG.certId) {
  console.error('❌ Missing eBay API credentials in .env.local');
  console.error('   Required: EBAY_APP_ID, EBAY_CERT_ID, EBAY_DEV_ID');
  console.error('\n📖 Get credentials from: https://developer.ebay.com/my/keys');
  process.exit(1);
}

/**
 * Fetch cards from database
 */
async function fetchCards() {
  console.log('📦 Fetching cards from database...\n');
  
  let query = supabase
    .from('card_jp')
    .select('id, card_name, set_name, set_slug, card_index')
    .not('card_name', 'is', null)
    .order('id', { ascending: true });
  
  if (options.cardId) {
    query = query.eq('id', options.cardId);
  } else {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch cards: ${error.message}`);
  }
  
  console.log(`✓ Found ${data.length} cards to process\n`);
  return data;
}

/**
 * Build eBay search keywords for a card
 */
function buildSearchKeywords(card, grade = 'psa10') {
  const cardName = card.card_name;
  const setName = card.set_name;
  const cardNumber = card.card_index || '';
  
  // Extract grade info
  let gradeKeyword = '';
  if (grade === 'psa10') gradeKeyword = 'PSA 10';
  else if (grade === 'psa9') gradeKeyword = 'PSA 9';
  else if (grade === 'psa8') gradeKeyword = 'PSA 8';
  else if (grade === 'bgs9_5') gradeKeyword = 'BGS 9.5';
  else if (grade === 'cgc9_5') gradeKeyword = 'CGC 9.5';
  
  // Build search query
  let keywords = `${cardName} ${setName}`;
  if (cardNumber) keywords += ` ${cardNumber}`;
  if (gradeKeyword) keywords += ` ${gradeKeyword}`;
  
  return keywords.trim();
}

/**
 * Fetch sold listings from eBay Finding API
 * 
 * Note: This is a simplified mock implementation.
 * In production, you would use the actual eBay Finding API.
 */
async function fetchEbaySoldListings(card, grade = 'psa10') {
  const keywords = buildSearchKeywords(card, grade);
  
  console.log(`  🔍 Searching eBay: "${keywords}"`);
  
  // TODO: Replace with actual eBay API call
  // const response = await fetch('https://svcs.ebay.com/services/search/FindingService/v1', {
  //   method: 'POST',
  //   headers: {
  //     'X-EBAY-SOA-SECURITY-APPNAME': EBAY_CONFIG.appId,
  //     'X-EBAY-SOA-OPERATION-NAME': 'findCompletedItems',
  //   },
  //   body: buildEbayRequest(keywords),
  // });
  
  // For now, return mock data for testing
  const mockTransactions = generateMockTransactions(card, grade, 5);
  
  console.log(`  ✓ Found ${mockTransactions.length} transactions`);
  return mockTransactions;
}

/**
 * Generate mock transaction data for testing
 */
function generateMockTransactions(card, grade, count) {
  const transactions = [];
  const basePrice = Math.random() * 500 + 50; // Random base price $50-$550
  
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 90); // Random date within 90 days
    const soldDate = new Date();
    soldDate.setDate(soldDate.getDate() - daysAgo);
    
    // Add some price variation
    const priceVariation = (Math.random() - 0.5) * 0.2; // ±10%
    const price = basePrice * (1 + priceVariation);
    
    transactions.push({
      ebay_item_id: `mock_${card.id}_${grade}_${i}_${Date.now()}`,
      card_id: card.id,
      title: `${card.card_name} ${grade.toUpperCase()} - Mock Listing ${i + 1}`,
      price: Math.round(price * 100) / 100,
      currency: 'USD',
      sold_date: soldDate.toISOString(),
      grading_company: grade.startsWith('psa') ? 'PSA' : grade.startsWith('bgs') ? 'BGS' : 'CGC',
      grade: grade.replace(/[a-z_]/g, '').replace('10', '10').replace('9', '9').replace('8', '8') || '10',
      metadata: {
        language: 'jp',
        listing_type: 'FixedPrice',
        is_active_listing: false,
        quantity: 1,
      },
    });
  }
  
  return transactions;
}

/**
 * Insert transactions into database
 */
async function insertTransactions(transactions) {
  if (transactions.length === 0) {
    return { inserted: 0, skipped: 0 };
  }
  
  if (options.dryRun) {
    console.log(`  [DRY RUN] Would insert ${transactions.length} transactions`);
    return { inserted: transactions.length, skipped: 0 };
  }
  
  const { data, error } = await supabase
    .from('transactions')
    .upsert(transactions, {
      onConflict: 'ebay_item_id',
      ignoreDuplicates: true,
    });
  
  if (error) {
    console.error(`  ❌ Error inserting transactions: ${error.message}`);
    return { inserted: 0, skipped: transactions.length };
  }
  
  console.log(`  ✓ Inserted ${transactions.length} transactions`);
  return { inserted: transactions.length, skipped: 0 };
}

/**
 * Process a single card
 */
async function processCard(card) {
  console.log(`\n📇 Processing Card #${card.id}: ${card.card_name}`);
  console.log(`   Set: ${card.set_name} (${card.set_slug})`);
  
  const grades = ['psa10', 'psa9', 'raw'];
  let totalInserted = 0;
  
  for (const grade of grades) {
    try {
      const transactions = await fetchEbaySoldListings(card, grade);
      const { inserted } = await insertTransactions(transactions);
      totalInserted += inserted;
      
      // Rate limiting: wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`  ❌ Error processing ${grade}: ${error.message}`);
    }
  }
  
  return totalInserted;
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  eBay Transaction Data Import Script                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('⚙️  Configuration:');
  console.log(`   Limit: ${options.limit} cards`);
  console.log(`   Card ID: ${options.cardId || 'All'}`);
  console.log(`   Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log(`   eBay Environment: ${EBAY_CONFIG.environment}\n`);
  
  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No data will be written to database\n');
  }
  
  const startTime = Date.now();
  
  try {
    // Fetch cards
    const cards = await fetchCards();
    
    if (cards.length === 0) {
      console.log('⚠️  No cards found to process');
      return;
    }
    
    // Process each card
    let totalTransactions = 0;
    for (const card of cards) {
      const inserted = await processCard(card);
      totalTransactions += inserted;
    }
    
    // Summary
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Import Complete                                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`✓ Processed: ${cards.length} cards`);
    console.log(`✓ Imported: ${totalTransactions} transactions`);
    console.log(`✓ Duration: ${duration}s\n`);
    
    if (!options.dryRun) {
      console.log('📊 Next Steps:');
      console.log('   1. Verify data: SELECT COUNT(*) FROM transactions;');
      console.log('   2. Run price sync: curl -X POST http://localhost:3000/api/internal/sync-prices');
      console.log('   3. Check UI: http://localhost:3000/cards/1\n');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();

