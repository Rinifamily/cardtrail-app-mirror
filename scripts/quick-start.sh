#!/bin/bash

# CardTrail Quick Start Script
# Helps you set up the price functionality step by step

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  CardTrail Price Functionality Setup                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.local exists
ENV_FILE="apps/web/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}❌ $ENV_FILE not found${NC}"
  echo ""
  echo "Please create $ENV_FILE with the following variables:"
  echo ""
  cat ENV_SETUP.md
  exit 1
fi

echo -e "${GREEN}✓${NC} Found $ENV_FILE"
echo ""

# Load environment variables
export $(cat $ENV_FILE | grep -v '^#' | xargs)

# Check required variables
echo "🔍 Checking required environment variables..."
echo ""

REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "EBAY_APP_ID"
  "EBAY_CERT_ID"
  "EBAY_DEV_ID"
  "INTERNAL_API_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}✗${NC} $var is not set"
    MISSING_VARS+=("$var")
  else
    echo -e "${GREEN}✓${NC} $var is set"
  fi
done

echo ""

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
  echo -e "${RED}❌ Missing required variables:${NC}"
  printf '   - %s\n' "${MISSING_VARS[@]}"
  echo ""
  echo "Please add them to $ENV_FILE"
  echo "See ENV_SETUP.md for instructions"
  exit 1
fi

echo -e "${GREEN}✓ All required variables are set!${NC}"
echo ""

# Step 1: Database Migration
echo "═══════════════════════════════════════════════════════════"
echo "Step 1: Database Migration"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "You need to execute the card_extensions migration in Supabase."
echo ""
echo "📋 Instructions:"
echo "1. Open: https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/sql/new"
echo "2. Copy the SQL from: supabase/migrations/20251209000000_card_extensions.sql"
echo "3. Paste and execute in SQL Editor"
echo ""
read -p "Press Enter when migration is complete..."
echo ""

# Step 2: Install Dependencies
echo "═══════════════════════════════════════════════════════════"
echo "Step 2: Install Dependencies"
echo "═══════════════════════════════════════════════════════════"
echo ""
pnpm install
echo ""
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Import eBay Transactions
echo "═══════════════════════════════════════════════════════════"
echo "Step 3: Import eBay Transaction Data"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "This will import mock transaction data for testing."
echo "(Real eBay API integration requires valid credentials)"
echo ""
read -p "How many cards to process? (default: 10): " CARD_LIMIT
CARD_LIMIT=${CARD_LIMIT:-10}
echo ""

cd apps/web
node scripts/import-ebay-transactions.js --limit $CARD_LIMIT
cd ../..
echo ""

# Step 4: Run Price Sync
echo "═══════════════════════════════════════════════════════════"
echo "Step 4: Calculate CT Prices"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Starting development server to run price sync..."
echo ""

# Start dev server in background
pnpm dev &
DEV_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 10

# Trigger price sync
echo ""
echo "Triggering price sync..."
curl -X POST "http://localhost:3000/api/internal/sync-prices?limit=$CARD_LIMIT" \
  -H "x-internal-api-key: $INTERNAL_API_KEY" \
  -s | jq '.'

echo ""

# Kill dev server
kill $DEV_PID 2>/dev/null || true

echo -e "${GREEN}✓ Price sync complete${NC}"
echo ""

# Step 5: Verify
echo "═══════════════════════════════════════════════════════════"
echo "Step 5: Verification"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Checking database for data..."
echo ""

# This would require psql or similar, skipping for now
echo "Please verify manually:"
echo ""
echo "1. Check transactions table:"
echo "   SELECT COUNT(*) FROM transactions;"
echo ""
echo "2. Check price_history table:"
echo "   SELECT COUNT(*) FROM price_history;"
echo ""
echo "3. Check card_extensions table:"
echo "   SELECT card_id, current_price_psa10 FROM card_extensions LIMIT 5;"
echo ""

# Final Instructions
echo "═══════════════════════════════════════════════════════════"
echo "🎉 Setup Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "1. Start development server:"
echo "   ${BLUE}pnpm dev${NC}"
echo ""
echo "2. Visit a card page:"
echo "   ${BLUE}http://localhost:3000/cards/1${NC}"
echo ""
echo "3. You should see:"
echo "   ✓ Real CT Price (not '暂未收录')"
echo "   ✓ Price history chart"
echo "   ✓ Recent transactions"
echo ""
echo "4. Deploy to Vercel:"
echo "   ${BLUE}git push origin main${NC}"
echo ""
echo "📖 Full documentation: SETUP_INSTRUCTIONS.md"
echo ""

