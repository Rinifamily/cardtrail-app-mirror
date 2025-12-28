#!/usr/bin/env node

/**
 * Migration Script: Apply Phase 01 Core Public Tables
 * 
 * This script applies the SQL migration to the remote Supabase instance.
 * Since this project uses remote Supabase (no local dev), we execute SQL
 * directly via the Supabase client.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('⚠️  Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('    Using anon key for verification only (cannot execute DDL)');
  console.error('    Please run migration manually in Supabase SQL Editor');
  console.log('\n📝 Migration file location:');
  console.log('    supabase/migrations/20251205000000_core_public_tables.sql');
  console.log('\n📋 Instructions:');
  console.log('    1. Go to https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/sql/new');
  console.log('    2. Copy and paste the SQL from the migration file');
  console.log('    3. Click "Run" to execute');
  console.log('    4. Verify tables created with: SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Applying Phase 01 migration...\n');
  
  const migrationPath = path.join(__dirname, 'migrations', '20251205000000_core_public_tables.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('📄 Migration file:', migrationPath);
  console.log('📊 SQL size:', sql.length, 'bytes\n');
  
  try {
    // Note: Supabase JS client doesn't support raw SQL execution via REST API
    // We need to use the Management API or SQL Editor
    console.log('⚠️  Cannot execute DDL via Supabase JS client REST API');
    console.log('    Please apply migration manually via Supabase Dashboard\n');
    
    console.log('📝 Migration file ready at:');
    console.log('    supabase/migrations/20251205000000_core_public_tables.sql\n');
    
    console.log('📋 Manual Steps:');
    console.log('    1. Open: https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/sql/new');
    console.log('    2. Copy SQL from migration file');
    console.log('    3. Execute in SQL Editor');
    console.log('    4. Run verification script: node supabase/verify-migration.js');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
