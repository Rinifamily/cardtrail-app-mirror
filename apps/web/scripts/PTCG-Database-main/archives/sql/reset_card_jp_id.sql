-- Reset card_jp table and ID sequence to start from 1

-- Step 1: Delete all records
DELETE FROM card_jp;

-- Step 2: Reset the sequence to start from 1
ALTER SEQUENCE card_jp_id_seq RESTART WITH 1;

-- Step 3: Verify the sequence is reset (should return 1)
SELECT currval('card_jp_id_seq');

-- Optional: Check current table status
SELECT 
    COUNT(*) as total_records,
    MAX(id) as max_id
FROM card_jp;

