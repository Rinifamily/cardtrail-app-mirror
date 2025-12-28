-- Complete database reset with ID sequence restart
-- Run this in Supabase SQL Editor

-- Delete all records and reset ID sequence to start from 1
TRUNCATE TABLE card_jp RESTART IDENTITY CASCADE;

-- Verify
SELECT COUNT(*) as record_count FROM card_jp;
SELECT last_value FROM card_jp_id_seq;

