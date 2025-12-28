-- Setup card_jp table for TCGPlayer data
-- Drop existing table and recreate with new structure
DROP TABLE IF EXISTS card_jp CASCADE;

-- Create card_jp table for TCGPlayer data
CREATE TABLE card_jp (
    id BIGSERIAL PRIMARY KEY,
    info TEXT NOT NULL,
    card_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(info, card_name)  -- Unique constraint on info+card_name combination
);

-- Create indexes for faster lookups
CREATE INDEX idx_card_jp_info ON card_jp(info);
CREATE INDEX idx_card_jp_card_name ON card_jp(card_name);

-- Add comments
COMMENT ON TABLE card_jp IS 'Pokemon TCG Japan cards scraped from TCGPlayer';
COMMENT ON COLUMN card_jp.info IS 'Product info from TCGPlayer (e.g., "Pokemon Japan, M2: Inferno X, Double Rare, #013/080")';
COMMENT ON COLUMN card_jp.card_name IS 'Card name from TCGPlayer (e.g., "Mega Charizard X ex - 013/080")';

-- Display table info
SELECT 
    'Table created successfully!' as status,
    count(*) as record_count 
FROM card_jp;

