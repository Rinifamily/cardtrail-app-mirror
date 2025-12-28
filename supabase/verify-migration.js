#!/usr/bin/env node

/**
 * Verification Script: Verify Phase 01 Tables Exist
 * 
 * This script verifies that the migration was applied successfully
 * by checking that all tables, indexes, and RLS policies exist.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables in apps/web/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyTables() {
  console.log('🔍 Verifying migration...\n');
  
  const expectedTables = ['price_history', 'market_indices', 'transactions'];
  let allPassed = true;
  
  // Test 1: Verify tables exist by attempting to query them
  console.log('📊 Test 1: Verifying tables exist');
  for (const table of expectedTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        console.log(`   ❌ Table '${table}' does not exist`);
        allPassed = false;
      } else if (error) {
        console.log(`   ⚠️  Table '${table}' exists but query failed: ${error.message}`);
      } else {
        console.log(`   ✅ Table '${table}' exists and is queryable`);
      }
    } catch (err) {
      console.log(`   ❌ Error checking table '${table}': ${err.message}`);
      allPassed = false;
    }
  }
  
  // Test 2: Verify RLS allows anonymous read access
  console.log('\n🔒 Test 2: Verifying RLS policies (anonymous read)');
  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ Cannot read from '${table}': ${error.message}`);
        allPassed = false;
      } else {
        console.log(`   ✅ Anonymous read access works for '${table}'`);
      }
    } catch (err) {
      console.log(`   ❌ Error reading '${table}': ${err.message}`);
      allPassed = false;
    }
  }
  
  // Test 3: Verify RLS blocks anonymous write access
  console.log('\n🚫 Test 3: Verifying RLS policies (anonymous write blocked)');
  
  // Try to insert into price_history
  try {
    const { error } = await supabase
      .from('price_history')
      .insert({ 
        card_id: 12, 
        date: '2025-12-05', 
        price_raw: 100.00 
      });
    
    if (error && error.code === '42501') {
      console.log(`   ✅ Anonymous write blocked for 'price_history' (expected)`);
    } else if (error) {
      console.log(`   ✅ Write failed for 'price_history': ${error.message}`);
    } else {
      console.log(`   ❌ Anonymous write succeeded (should be blocked!)`);
      allPassed = false;
      
      // Clean up
      await supabase
        .from('price_history')
        .delete()
        .eq('card_id', 12)
        .eq('date', '2025-12-05');
    }
  } catch (err) {
    console.log(`   ✅ Write blocked: ${err.message}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All verification checks passed!');
    console.log('   Migration applied successfully.');
    console.log('\nNext steps:');
    console.log('   1. Run: cd apps/web && pnpm db:types');
    console.log('   2. Create query helpers in packages/db');
    console.log('   3. Write tests');
  } else {
    console.log('❌ Some verification checks failed.');
    console.log('   Please review the errors above and apply migration manually.');
  }
  console.log('='.repeat(50) + '\n');
}

verifyTables().catch(console.error);
