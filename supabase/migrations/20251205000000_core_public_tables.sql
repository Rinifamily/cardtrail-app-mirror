-- =====================================================
-- CardTrail Phase 01: Core Public Tables
-- Purpose: Market data accessible without authentication
-- Dependencies: card_jp table (read-only)
-- Task ID: phase-01-task-01
-- Created: 2025-12-05
-- Updated: 2025-12-05 (Added transaction wrapper, idempotent policies, updated_at tracking)
-- =====================================================

-- Begin transaction for atomic migration
BEGIN;

-- -----------------------------------------------------
-- Table: price_history
-- Purpose: Per-card daily price tracking (raw + grades)
-- Usage: Powers price charts on Search and Card Detail pages
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  card_id BIGINT NOT NULL REFERENCES card_jp(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price_raw DECIMAL(10,2),        -- Raw card price (ungraded)
  price_psa9 DECIMAL(10,2),       -- PSA 9 graded price
  price_psa10 DECIMAL(10,2),      -- PSA 10 graded price
  volume INTEGER DEFAULT 0,        -- Number of sales for this date
  data_source TEXT DEFAULT 'ebay', -- Source identifier (future: 'yahoo_jp', etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Business constraint: one price record per card/date/source
  CONSTRAINT unique_price_record UNIQUE(card_id, date, data_source)
);

-- Index for common query: "Show me price history for card X"
CREATE INDEX IF NOT EXISTS idx_price_history_card_date 
  ON price_history(card_id, date DESC);

-- Index for dashboard query: "Recent prices across all cards"
CREATE INDEX IF NOT EXISTS idx_price_history_date 
  ON price_history(date DESC);

COMMENT ON TABLE price_history IS 'Daily price snapshots per card, supporting multi-grade tracking';
COMMENT ON COLUMN price_history.card_id IS 'Foreign key to card_jp(id), CASCADE delete if card removed';
COMMENT ON COLUMN price_history.volume IS 'Number of confirmed sales, 0 if no transactions';
COMMENT ON COLUMN price_history.data_source IS 'Data source identifier for multi-source support';
COMMENT ON COLUMN price_history.updated_at IS 'Last update timestamp, auto-updated via trigger';

-- -----------------------------------------------------
-- Table: market_indices
-- Purpose: CTI (CardTrail Index) + sub-index time series
-- Usage: Powers market dashboard charts and trend analysis
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS market_indices (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  index_type TEXT NOT NULL,       -- 'cti', 'cti_vintage', 'cti_modern', etc.
  value DECIMAL(10,2) NOT NULL,   -- Index value (typically 1000 = base)
  change_24h DECIMAL(5,2),        -- 24-hour percentage change
  change_7d DECIMAL(5,2),         -- 7-day percentage change
  volume BIGINT,                  -- Total transaction volume (optional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Business constraint: one index value per type/date
  CONSTRAINT unique_index_record UNIQUE(date, index_type)
);

-- Index for common query: "Show me CTI chart over time"
CREATE INDEX IF NOT EXISTS idx_market_indices_type_date 
  ON market_indices(index_type, date DESC);

COMMENT ON TABLE market_indices IS 'Market index calculations powering dashboard charts';
COMMENT ON COLUMN market_indices.index_type IS 'Index identifier: cti (main), cti_vintage, cti_modern';
COMMENT ON COLUMN market_indices.value IS 'Index value, typically normalized to 1000 at baseline';
COMMENT ON COLUMN market_indices.change_24h IS 'Percentage change over 24 hours';
COMMENT ON COLUMN market_indices.change_7d IS 'Percentage change over 7 days';

-- -----------------------------------------------------
-- Table: transactions
-- Purpose: eBay sold listings cache (powers CT Price)
-- Usage: Raw transaction data for price algorithm and trend analysis
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  card_id BIGINT REFERENCES card_jp(id) ON DELETE SET NULL, -- Allow orphans for unmatched listings
  ebay_item_id TEXT UNIQUE NOT NULL, -- eBay item ID (must be unique)
  title TEXT,                        -- Original listing title
  price DECIMAL(10,2) NOT NULL,      -- Sold price
  currency TEXT DEFAULT 'USD',       -- Price currency
  sold_date TIMESTAMPTZ,             -- When item sold (eBay timestamp)
  condition TEXT,                    -- 'used', 'new', 'for parts'
  grade TEXT,                        -- 'psa10', 'psa9', 'raw', etc.
  grading_company TEXT,              -- 'PSA', 'BGS', 'CGC', or NULL
  seller TEXT,                       -- Seller username (optional)
  is_outlier BOOLEAN DEFAULT FALSE,  -- Flagged by outlier detection (Phase 07)
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional transaction data (flexible storage)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Validate currency code
  CONSTRAINT valid_currency CHECK (currency IN ('USD', 'CNY', 'JPY', 'EUR', 'GBP'))
);

-- Index for common query: "Show recent sales for card X"
CREATE INDEX IF NOT EXISTS idx_transactions_card_date 
  ON transactions(card_id, sold_date DESC NULLS LAST);

-- Index for outlier detection queries
CREATE INDEX IF NOT EXISTS idx_transactions_outlier 
  ON transactions(is_outlier) WHERE is_outlier = FALSE;

-- Index for eBay item lookup
CREATE INDEX IF NOT EXISTS idx_transactions_ebay_item 
  ON transactions(ebay_item_id);

COMMENT ON TABLE transactions IS 'eBay sold listings cache, powering CT Price algorithm';
COMMENT ON COLUMN transactions.card_id IS 'Foreign key to card_jp(id), SET NULL if card deleted to preserve unmatched listings';
COMMENT ON COLUMN transactions.ebay_item_id IS 'eBay unique item identifier, must be unique to prevent duplicates';
COMMENT ON COLUMN transactions.is_outlier IS 'TRUE if flagged by IQR or Z-score outlier detection';
COMMENT ON COLUMN transactions.sold_date IS 'Timestamp when item was sold on eBay, may be NULL for active listings';
COMMENT ON COLUMN transactions.metadata IS 'Flexible JSONB storage for eBay-specific data, seller info, or future extensions';
COMMENT ON COLUMN transactions.updated_at IS 'Last update timestamp, auto-updated via trigger';

-- =====================================================
-- Triggers for updated_at Timestamp Tracking
-- Purpose: Automatically update updated_at on row changes
-- =====================================================

-- Create trigger function (reusable for multiple tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Auto-update updated_at timestamp on row UPDATE';

-- Add trigger to price_history
DROP TRIGGER IF EXISTS update_price_history_updated_at ON price_history;
CREATE TRIGGER update_price_history_updated_at
    BEFORE UPDATE ON price_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row-Level Security (RLS) Policies
-- Purpose: Public read-only access, no writes from anon
-- Service role bypasses RLS by default for writes
-- =====================================================

-- Enable RLS
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Idempotent public read-only policies
-- Drop existing policies first to allow re-running migration

DROP POLICY IF EXISTS "public_read_price_history" ON price_history;
CREATE POLICY "public_read_price_history" 
  ON price_history FOR SELECT 
  USING (TRUE);

DROP POLICY IF EXISTS "public_read_market_indices" ON market_indices;
CREATE POLICY "public_read_market_indices" 
  ON market_indices FOR SELECT 
  USING (TRUE);

DROP POLICY IF EXISTS "public_read_transactions" ON transactions;
CREATE POLICY "public_read_transactions" 
  ON transactions FOR SELECT 
  USING (TRUE);

-- Add comments to policies
COMMENT ON POLICY "public_read_price_history" ON price_history IS 
  'Anonymous users can SELECT but not INSERT/UPDATE/DELETE. Service role bypasses RLS for writes.';

COMMENT ON POLICY "public_read_market_indices" ON market_indices IS 
  'Anonymous users can SELECT but not INSERT/UPDATE/DELETE. Service role bypasses RLS for writes.';

COMMENT ON POLICY "public_read_transactions" ON transactions IS 
  'Anonymous users can SELECT but not INSERT/UPDATE/DELETE. Service role bypasses RLS for writes.';

-- =====================================================
-- End of Migration
-- =====================================================

-- Commit transaction
COMMIT;
