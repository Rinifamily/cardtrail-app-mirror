#!/usr/bin/env node

/**
 * Apply Migration Script
 * 
 * This script provides instructions and helps apply the Phase 01 migration.
 * Since Supabase doesn't support DDL via REST API, migration must be applied
 * manually via the Supabase Dashboard SQL Editor.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');
const migrationPath = join(projectRoot, 'supabase/migrations/20251205000000_core_public_tables.sql');

console.log('🚀 CardTrail Phase 01 Migration\n');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 Migration Details:');
console.log('   • Tables: price_history, market_indices, transactions');
console.log('   • Features: RLS policies, indexes, foreign keys');
console.log('   • Location:', migrationPath);
console.log('');

// Read migration file
const sql = readFileSync(migrationPath, 'utf-8');
const lineCount = sql.split('\n').length;

console.log('📊 Migration File:');
console.log('   • Size:', sql.length, 'bytes');
console.log('   • Lines:', lineCount);
console.log('');

console.log('🔧 How to Apply:\n');
console.log('1. Open Supabase SQL Editor:');
console.log('   https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/sql/new\n');

console.log('2. Copy the SQL from:');
console.log('   ' + migrationPath + '\n');

console.log('3. Paste into SQL Editor and click "Run"\n');

console.log('4. Verify migration succeeded:');
console.log('   pnpm --filter web exec node scripts/verify-migration.mjs\n');

console.log('═══════════════════════════════════════════════════════════\n');

// Display first few lines of migration for reference
console.log('📄 Migration Preview (first 20 lines):\n');
const previewLines = sql.split('\n').slice(0, 20);
previewLines.forEach((line, i) => {
  console.log(`   ${(i + 1).toString().padStart(3, ' ')} | ${line}`);
});
console.log('   ...\n');

console.log('✅ Ready to apply migration!');
console.log('   Follow the steps above to execute in Supabase Dashboard.\n');
