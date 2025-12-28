#!/usr/bin/env node

/**
 * Test Supabase Connection
 * Verifies that we can connect to Supabase and query the card_jp table
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      process.env[key.trim()] = value.trim();
    }
  });
}

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
    let tablesExist = 0;
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        console.log(`   ⚠️  Table '${table}' does not exist (needs migration)`);
      } else if (error) {
        console.log(`   ❌ Error checking '${table}': ${error.message}`);
      } else {
        console.log(`   ✅ Table '${table}' exists`);
        tablesExist++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    if (tablesExist === tables.length) {
      console.log('✅ All Phase 01 tables exist!');
      console.log('='.repeat(60));
      console.log('\nNext steps:');
      console.log('1. Generate types: pnpm db:types');
      console.log('2. Create query helpers in packages/db');
      console.log('3. Write tests');
    } else {
      console.log('⚠️  Migration needed');
      console.log('='.repeat(60));
      console.log('\nNext steps:');
      console.log('1. Open: https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/sql/new');
      console.log('2. Copy SQL from: supabase/migrations/20251205000000_core_public_tables.sql');
      console.log('3. Execute in SQL Editor');
      console.log('4. Run this script again to verify');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

testConnection();
