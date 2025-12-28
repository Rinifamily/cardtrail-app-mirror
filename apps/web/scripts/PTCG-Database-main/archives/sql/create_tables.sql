-- Drop existing table and recreate
DROP TABLE IF EXISTS card_jp CASCADE;

-- Create card_jp table
-- Note: Removed UNIQUE constraint on name to allow same card with different grades
-- Each card+grade combination is a separate record
CREATE TABLE card_jp (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    tag TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, tag)  -- Unique constraint on name+tag combination
);

-- Create index on name for faster lookups
CREATE INDEX idx_card_jp_name ON card_jp(name);

-- Create index on tag for filtering
CREATE INDEX idx_card_jp_tag ON card_jp(tag);

-- Add comment
COMMENT ON TABLE card_jp IS 'Pokemon TCG cards scraped from cardladder.com';
COMMENT ON COLUMN card_jp.name IS 'Full card name including year, set, and number';
COMMENT ON COLUMN card_jp.tag IS 'Card rarity/type tag';

