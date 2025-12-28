#!/usr/bin/env node

/**
 * Test Supabase Connection
 * Verifies that we can connect to Supabase and query the card_jp table
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Check apps/web/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔌 Testing Supabase connection...\n');
  console.log('📊 Project:', supabaseUrl);
  console.log('🔑 Using anon key (read-only)\n');
  
  try {
    // Test 1: Query card_jp table
    console.log('Test 1: Query card_jp table');
    const { data, error, count } = await supabase
      .from('card_jp')
      .select('id, card_name', { count: 'exact', head: false })
      .limit(5);
    
    if (error) {
      console.log('   ❌ Failed:', error.message);
      return false;
    }
    
    console.log(`   ✅ Connected! Found ${count} cards total`);
    console.log(`   📋 Sample cards:`);
    data.forEach(card => {
      console.log(`      • ${card.card_name} (ID: ${card.id})`);
    });
    console.log('');
    
    // Test 2: Check if migration tables exist
    console.log('Test 2: Check if Phase 01 tables exist');
    const tables = ['price_history', 'market_indices', 'transactions'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        console.log(`   ⚠️  Table '${table}' does not exist (expected before migration)`);
      } else if (error) {
        console.log(`   ❌ Error checking '${table}': ${error.message}`);
      } else {
        console.log(`   ✅ Table '${table}' exists`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Connection test passed!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Apply migration via Supabase Dashboard');
    console.log('2. Run: node supabase/verify-migration.js');
    console.log('3. Generate types: cd apps/web && pnpm db:types');
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

testConnection();
