-- Migration: Card Extensions Table
-- Purpose: Store extended card data (prices, view stats, etc.) without modifying card_jp
-- Created: 2024-12-09

-- ============================================
-- Table: card_extensions
-- ============================================
-- Extends card_jp with mutable fields like prices and view counts
-- Uses card_jp.id as foreign key (READ-ONLY reference)

CREATE TABLE IF NOT EXISTS card_extensions (
  card_id BIGINT PRIMARY KEY REFERENCES card_jp(id) ON DELETE CASCADE,
  
  -- Current Prices (CT Price calculated values)
  current_price_raw DECIMAL(10,2) DEFAULT NULL,
  current_price_psa8 DECIMAL(10,2) DEFAULT NULL,
  current_price_psa9 DECIMAL(10,2) DEFAULT NULL,
  current_price_psa10 DECIMAL(10,2) DEFAULT NULL,
  current_price_bgs9_5 DECIMAL(10,2) DEFAULT NULL,
  current_price_cgc9_5 DECIMAL(10,2) DEFAULT NULL,
  
  -- Price metadata
  price_updated_at TIMESTAMPTZ DEFAULT NULL,
  price_confidence VARCHAR(10) DEFAULT NULL CHECK (price_confidence IN ('high', 'medium', 'low')),
  
  -- User engagement metrics
  view_count INT DEFAULT 0 NOT NULL,
  last_viewed_at TIMESTAMPTZ DEFAULT NULL,
  watchlist_count INT DEFAULT 0 NOT NULL,
  collection_count INT DEFAULT 0 NOT NULL,
  
  -- Popularity score (computed field)
  popularity_score INT DEFAULT 0 NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- Indexes
-- ============================================

-- Index for price updates (find stale prices)
CREATE INDEX idx_card_extensions_price_updated 
  ON card_extensions(price_updated_at) 
  WHERE price_updated_at IS NOT NULL;

-- Index for popularity queries
CREATE INDEX idx_card_extensions_popularity 
  ON card_extensions(popularity_score DESC);

-- Index for recently viewed
CREATE INDEX idx_card_extensions_last_viewed 
  ON card_extensions(last_viewed_at DESC NULLS LAST);

-- Index for PSA 10 price sorting
CREATE INDEX idx_card_extensions_price_psa10 
  ON card_extensions(current_price_psa10 DESC NULLS LAST);

-- ============================================
-- Trigger: Auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_card_extensions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_card_extensions_updated_at
  BEFORE UPDATE ON card_extensions
  FOR EACH ROW
  EXECUTE FUNCTION update_card_extensions_updated_at();

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE card_extensions ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read all card extensions (public data)
CREATE POLICY "card_extensions_select_all"
  ON card_extensions
  FOR SELECT
  USING (true);

-- Policy: Only service role can insert/update (price sync pipeline)
CREATE POLICY "card_extensions_insert_service"
  ON card_extensions
  FOR INSERT
  WITH CHECK (false); -- Will be accessed via service role key

CREATE POLICY "card_extensions_update_service"
  ON card_extensions
  FOR UPDATE
  USING (false); -- Will be accessed via service role key

-- ============================================
-- Helper Function: Increment view count
-- ============================================

CREATE OR REPLACE FUNCTION increment_card_view(p_card_id BIGINT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO card_extensions (card_id, view_count, last_viewed_at)
  VALUES (p_card_id, 1, NOW())
  ON CONFLICT (card_id) 
  DO UPDATE SET
    view_count = card_extensions.view_count + 1,
    last_viewed_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Helper Function: Update popularity score
-- ============================================

CREATE OR REPLACE FUNCTION update_popularity_score(p_card_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_score INT;
BEGIN
  -- Popularity = views + (watchlist * 5) + (collection * 3)
  SELECT 
    COALESCE(view_count, 0) + 
    (COALESCE(watchlist_count, 0) * 5) + 
    (COALESCE(collection_count, 0) * 3)
  INTO v_score
  FROM card_extensions
  WHERE card_id = p_card_id;
  
  UPDATE card_extensions
  SET 
    popularity_score = COALESCE(v_score, 0),
    updated_at = NOW()
  WHERE card_id = p_card_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE card_extensions IS 'Extended card data (prices, stats) - complements read-only card_jp table';
COMMENT ON COLUMN card_extensions.card_id IS 'Foreign key to card_jp.id (read-only reference)';
COMMENT ON COLUMN card_extensions.current_price_psa10 IS 'Current CT Price for PSA 10 grade in CNY';
COMMENT ON COLUMN card_extensions.price_updated_at IS 'When prices were last calculated';
COMMENT ON COLUMN card_extensions.popularity_score IS 'Computed popularity metric';
COMMENT ON FUNCTION increment_card_view IS 'Safely increment view count for a card';
COMMENT ON FUNCTION update_popularity_score IS 'Recalculate popularity score';

