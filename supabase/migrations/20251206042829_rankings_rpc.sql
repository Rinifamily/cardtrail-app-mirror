-- =====================================================
-- CardTrail Phase 04: Rankings RPC Functions (FIXED)
-- Purpose: Server-side ranking calculations for leaderboards
-- Dependencies: price_history, transactions tables
-- Task ID: phase-04-task-01
-- Created: 2025-12-06
-- Updated: 2025-12-06 (Fixed image_urls, implemented grade filter)
-- =====================================================

-- Begin transaction for atomic migration
BEGIN;

-- =====================================================
-- Function: get_price_gainers
-- Purpose: Calculate top price gainers by percentage
-- Returns: Cards with highest price increase over timeframe
-- Grade Filter: Selects appropriate price column based on grade
-- =====================================================
CREATE OR REPLACE FUNCTION get_price_gainers(
  timeframe_param TEXT DEFAULT '24h',
  limit_count INT DEFAULT 100,
  rarity_filter TEXT DEFAULT NULL,
  grade_filter TEXT DEFAULT NULL,
  language_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  card_id BIGINT,
  card_name TEXT,
  card_name_ja TEXT,
  image_urls TEXT,
  rarity TEXT,
  current_price DECIMAL(10,2),
  price_change DECIMAL(10,2),
  price_change_percent DECIMAL(10,2),
  volume INTEGER
) AS $$
DECLARE
  days_interval INTERVAL;
BEGIN
  -- Convert timeframe to interval
  days_interval := CASE timeframe_param
    WHEN '24h' THEN INTERVAL '1 day'
    WHEN '7d' THEN INTERVAL '7 days'
    WHEN '30d' THEN INTERVAL '30 days'
    ELSE INTERVAL '1 day'
  END;

  RETURN QUERY
  WITH price_data AS (
    SELECT 
      ph.card_id,
      ph.date,
      -- Select price column based on grade filter
      CASE 
        WHEN grade_filter = 'psa10' THEN ph.price_psa10
        WHEN grade_filter = 'psa9' THEN ph.price_psa9
        WHEN grade_filter = 'raw' THEN ph.price_raw
        ELSE COALESCE(ph.price_psa10, ph.price_psa9, ph.price_raw)
      END AS price,
      ph.volume
    FROM price_history ph
    WHERE ph.date >= CURRENT_DATE - days_interval
      AND (
        (grade_filter = 'psa10' AND ph.price_psa10 IS NOT NULL) OR
        (grade_filter = 'psa9' AND ph.price_psa9 IS NOT NULL) OR
        (grade_filter = 'raw' AND ph.price_raw IS NOT NULL) OR
        (grade_filter IS NULL AND (ph.price_psa10 IS NOT NULL OR ph.price_psa9 IS NOT NULL OR ph.price_raw IS NOT NULL))
      )
  ),
  latest_prices AS (
    SELECT 
      pd.card_id,
      MAX(pd.price) FILTER (WHERE pd.date = CURRENT_DATE) AS latest_price,
      MAX(pd.price) FILTER (WHERE pd.date = CURRENT_DATE - days_interval) AS prior_price,
      SUM(pd.volume) AS total_volume
    FROM price_data pd
    GROUP BY pd.card_id
  )
  SELECT 
    c.id AS card_id,
    c.card_name AS card_name,
    c.card_name_ja AS card_name_ja,
    c.image_urls,
    c.rarity,
    lp.latest_price AS current_price,
    (lp.latest_price - lp.prior_price) AS price_change,
    ((lp.latest_price - lp.prior_price) / NULLIF(lp.prior_price, 0) * 100) AS price_change_percent,
    lp.total_volume::INTEGER AS volume
  FROM latest_prices lp
  INNER JOIN card_jp c ON c.id = lp.card_id
  WHERE lp.latest_price IS NOT NULL 
    AND lp.prior_price IS NOT NULL
    AND lp.prior_price > 0
    AND (rarity_filter IS NULL OR c.rarity = rarity_filter)
    AND (language_filter IS NULL OR c.language = language_filter)
  ORDER BY price_change_percent DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_price_gainers IS 
  'Calculate top price gainers by percentage change over specified timeframe. Grade filter selects price_psa10, price_psa9, or price_raw column.';

-- =====================================================
-- Function: get_price_fallers
-- Purpose: Calculate top price fallers by percentage
-- Returns: Cards with highest price decrease over timeframe
-- Grade Filter: Selects appropriate price column based on grade
-- =====================================================
CREATE OR REPLACE FUNCTION get_price_fallers(
  timeframe_param TEXT DEFAULT '24h',
  limit_count INT DEFAULT 100,
  rarity_filter TEXT DEFAULT NULL,
  grade_filter TEXT DEFAULT NULL,
  language_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  card_id BIGINT,
  card_name TEXT,
  card_name_ja TEXT,
  image_urls TEXT,
  rarity TEXT,
  current_price DECIMAL(10,2),
  price_change DECIMAL(10,2),
  price_change_percent DECIMAL(10,2),
  volume INTEGER
) AS $$
DECLARE
  days_interval INTERVAL;
BEGIN
  -- Convert timeframe to interval
  days_interval := CASE timeframe_param
    WHEN '24h' THEN INTERVAL '1 day'
    WHEN '7d' THEN INTERVAL '7 days'
    WHEN '30d' THEN INTERVAL '30 days'
    ELSE INTERVAL '1 day'
  END;

  RETURN QUERY
  WITH price_data AS (
    SELECT 
      ph.card_id,
      ph.date,
      -- Select price column based on grade filter
      CASE 
        WHEN grade_filter = 'psa10' THEN ph.price_psa10
        WHEN grade_filter = 'psa9' THEN ph.price_psa9
        WHEN grade_filter = 'raw' THEN ph.price_raw
        ELSE COALESCE(ph.price_psa10, ph.price_psa9, ph.price_raw)
      END AS price,
      ph.volume
    FROM price_history ph
    WHERE ph.date >= CURRENT_DATE - days_interval
      AND (
        (grade_filter = 'psa10' AND ph.price_psa10 IS NOT NULL) OR
        (grade_filter = 'psa9' AND ph.price_psa9 IS NOT NULL) OR
        (grade_filter = 'raw' AND ph.price_raw IS NOT NULL) OR
        (grade_filter IS NULL AND (ph.price_psa10 IS NOT NULL OR ph.price_psa9 IS NOT NULL OR ph.price_raw IS NOT NULL))
      )
  ),
  latest_prices AS (
    SELECT 
      pd.card_id,
      MAX(pd.price) FILTER (WHERE pd.date = CURRENT_DATE) AS latest_price,
      MAX(pd.price) FILTER (WHERE pd.date = CURRENT_DATE - days_interval) AS prior_price,
      SUM(pd.volume) AS total_volume
    FROM price_data pd
    GROUP BY pd.card_id
  )
  SELECT 
    c.id AS card_id,
    c.card_name AS card_name,
    c.card_name_ja AS card_name_ja,
    c.image_urls,
    c.rarity,
    lp.latest_price AS current_price,
    (lp.latest_price - lp.prior_price) AS price_change,
    ((lp.latest_price - lp.prior_price) / NULLIF(lp.prior_price, 0) * 100) AS price_change_percent,
    lp.total_volume::INTEGER AS volume
  FROM latest_prices lp
  INNER JOIN card_jp c ON c.id = lp.card_id
  WHERE lp.latest_price IS NOT NULL 
    AND lp.prior_price IS NOT NULL
    AND lp.prior_price > 0
    AND (rarity_filter IS NULL OR c.rarity = rarity_filter)
    AND (language_filter IS NULL OR c.language = language_filter)
  ORDER BY price_change_percent ASC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_price_fallers IS 
  'Calculate top price fallers by percentage change over specified timeframe. Grade filter selects price_psa10, price_psa9, or price_raw column.';

-- =====================================================
-- Function: get_volume_leaders
-- Purpose: Calculate cards with highest transaction volume
-- Returns: Cards sorted by transaction volume
-- Grade Filter: Filters transactions by grading_company and grade
-- =====================================================
CREATE OR REPLACE FUNCTION get_volume_leaders(
  timeframe_param TEXT DEFAULT '24h',
  limit_count INT DEFAULT 100,
  rarity_filter TEXT DEFAULT NULL,
  grade_filter TEXT DEFAULT NULL,
  language_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  card_id BIGINT,
  card_name TEXT,
  card_name_ja TEXT,
  image_urls TEXT,
  rarity TEXT,
  current_price DECIMAL(10,2),
  price_change DECIMAL(10,2),
  price_change_percent DECIMAL(10,2),
  volume INTEGER
) AS $$
DECLARE
  days_interval INTERVAL;
BEGIN
  -- Convert timeframe to interval
  days_interval := CASE timeframe_param
    WHEN '24h' THEN INTERVAL '1 day'
    WHEN '7d' THEN INTERVAL '7 days'
    WHEN '30d' THEN INTERVAL '30 days'
    ELSE INTERVAL '1 day'
  END;

  RETURN QUERY
  WITH volume_data AS (
    SELECT 
      t.card_id,
      COUNT(*) AS transaction_count
    FROM transactions t
    WHERE t.sold_date >= CURRENT_DATE - days_interval
      AND t.card_id IS NOT NULL
      AND t.is_outlier = FALSE
      AND (
        (grade_filter = 'psa10' AND t.grading_company = 'PSA' AND t.grade = '10') OR
        (grade_filter = 'psa9' AND t.grading_company = 'PSA' AND t.grade = '9') OR
        (grade_filter = 'raw' AND (t.grading_company IS NULL OR t.grade IS NULL)) OR
        (grade_filter IS NULL)
      )
    GROUP BY t.card_id
  ),
  price_data AS (
    SELECT 
      ph.card_id,
      ph.date,
      CASE 
        WHEN grade_filter = 'psa10' THEN ph.price_psa10
        WHEN grade_filter = 'psa9' THEN ph.price_psa9
        WHEN grade_filter = 'raw' THEN ph.price_raw
        ELSE COALESCE(ph.price_psa10, ph.price_psa9, ph.price_raw)
      END AS price
    FROM price_history ph
    WHERE ph.date >= CURRENT_DATE - days_interval
  ),
  latest_prices AS (
    SELECT 
      pd.card_id,
      MAX(pd.price) FILTER (WHERE pd.date = CURRENT_DATE) AS latest_price,
      MAX(pd.price) FILTER (WHERE pd.date = CURRENT_DATE - days_interval) AS prior_price
    FROM price_data pd
    GROUP BY pd.card_id
  )
  SELECT 
    c.id AS card_id,
    c.card_name AS card_name,
    c.card_name_ja AS card_name_ja,
    c.image_urls,
    c.rarity,
    COALESCE(lp.latest_price, 0) AS current_price,
    (lp.latest_price - lp.prior_price) AS price_change,
    ((lp.latest_price - lp.prior_price) / NULLIF(lp.prior_price, 0) * 100) AS price_change_percent,
    vd.transaction_count::INTEGER AS volume
  FROM volume_data vd
  INNER JOIN card_jp c ON c.id = vd.card_id
  LEFT JOIN latest_prices lp ON lp.card_id = vd.card_id
  WHERE (rarity_filter IS NULL OR c.rarity = rarity_filter)
    AND (language_filter IS NULL OR c.language = language_filter)
  ORDER BY vd.transaction_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_volume_leaders IS 
  'Calculate cards with highest transaction volume over specified timeframe. Grade filter applies to transaction grading.';

-- =====================================================
-- Function: get_popularity_rankings
-- Purpose: Calculate most popular cards by transaction frequency
-- Returns: Cards sorted by transaction count (popularity metric)
-- Grade Filter: Filters transactions by grading_company and grade
-- =====================================================
CREATE OR REPLACE FUNCTION get_popularity_rankings(
  timeframe_param TEXT DEFAULT '24h',
  limit_count INT DEFAULT 100,
  rarity_filter TEXT DEFAULT NULL,
  grade_filter TEXT DEFAULT NULL,
  language_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  card_id BIGINT,
  card_name TEXT,
  card_name_ja TEXT,
  image_urls TEXT,
  rarity TEXT,
  current_price DECIMAL(10,2),
  price_change DECIMAL(10,2),
  price_change_percent DECIMAL(10,2),
  transaction_count INTEGER
) AS $$
DECLARE
  days_interval INTERVAL;
BEGIN
  -- Convert timeframe to interval
  days_interval := CASE timeframe_param
    WHEN '24h' THEN INTERVAL '1 day'
    WHEN '7d' THEN INTERVAL '7 days'
    WHEN '30d' THEN INTERVAL '30 days'
    ELSE INTERVAL '1 day'
  END;

  RETURN QUERY
  WITH popularity_data AS (
    SELECT 
      t.card_id,
      COUNT(*) AS tx_count,
      COUNT(DISTINCT t.seller) AS unique_sellers
    FROM transactions t
    WHERE t.sold_date >= CURRENT_DATE - days_interval
      AND t.card_id IS NOT NULL
      AND t.is_outlier = FALSE
      AND (
        (grade_filter = 'psa10' AND t.grading_company = 'PSA' AND t.grade = '10') OR
        (grade_filter = 'psa9' AND t.grading_company = 'PSA' AND t.grade = '9') OR
        (grade_filter = 'raw' AND (t.grading_company IS NULL OR t.grade IS NULL)) OR
        (grade_filter IS NULL)
      )
    GROUP BY t.card_id
  ),
  price_data AS (
    SELECT 
      ph.card_id,
      ph.date,
      CASE 
        WHEN grade_filter = 'psa10' THEN ph.price_psa10
        WHEN grade_filter = 'psa9' THEN ph.price_psa9
        WHEN grade_filter = 'raw' THEN ph.price_raw
        ELSE COALESCE(ph.price_psa10, ph.price_psa9, ph.price_raw)
      END AS price
    FROM price_history ph
    WHERE ph.date >= CURRENT_DATE - days_interval
  ),
  latest_prices AS (
    SELECT 
      pd.card_id,
      MAX(pd.price) FILTER (WHERE pd.date = CURRENT_DATE) AS latest_price,
      MAX(pd.price) FILTER (WHERE pd.date = CURRENT_DATE - days_interval) AS prior_price
    FROM price_data pd
    GROUP BY pd.card_id
  )
  SELECT 
    c.id AS card_id,
    c.card_name AS card_name,
    c.card_name_ja AS card_name_ja,
    c.image_urls,
    c.rarity,
    COALESCE(lp.latest_price, 0) AS current_price,
    (lp.latest_price - lp.prior_price) AS price_change,
    ((lp.latest_price - lp.prior_price) / NULLIF(lp.prior_price, 0) * 100) AS price_change_percent,
    pd.tx_count::INTEGER AS transaction_count
  FROM popularity_data pd
  INNER JOIN card_jp c ON c.id = pd.card_id
  LEFT JOIN latest_prices lp ON lp.card_id = pd.card_id
  WHERE (rarity_filter IS NULL OR c.rarity = rarity_filter)
    AND (language_filter IS NULL OR c.language = language_filter)
  ORDER BY pd.tx_count DESC, pd.unique_sellers DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_popularity_rankings IS 
  'Calculate most popular cards by transaction frequency over specified timeframe. Grade filter applies to transaction grading.';

-- =====================================================
-- Add indexes to optimize ranking queries
-- =====================================================

-- Composite index for price history lookups by date range
CREATE INDEX IF NOT EXISTS idx_price_history_date_range 
  ON price_history(date DESC, card_id) 
  WHERE price_psa10 IS NOT NULL OR price_psa9 IS NOT NULL OR price_raw IS NOT NULL;

-- Index for transaction date filtering
CREATE INDEX IF NOT EXISTS idx_transactions_sold_date_card 
  ON transactions(sold_date DESC, card_id) 
  WHERE card_id IS NOT NULL AND is_outlier = FALSE;

-- Index for transaction grade filtering
CREATE INDEX IF NOT EXISTS idx_transactions_grade 
  ON transactions(grading_company, grade, sold_date) 
  WHERE card_id IS NOT NULL AND is_outlier = FALSE;

-- Composite index for card filtering
CREATE INDEX IF NOT EXISTS idx_card_jp_rarity_language 
  ON card_jp(rarity, language) 
  WHERE rarity IS NOT NULL;

-- =====================================================
-- End of Migration
-- =====================================================

COMMIT;
