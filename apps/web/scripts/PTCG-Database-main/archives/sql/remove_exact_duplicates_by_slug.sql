-- Remove duplicates based on slug, card_name, card_index, and rarity
-- Keeps the record with the smallest ID (earliest inserted)

DELETE FROM card_jp a USING (
    SELECT min(id) as id, slug, card_name, card_index, rarity
    FROM card_jp 
    GROUP BY slug, card_name, card_index, rarity
    HAVING count(*) > 1
) b 
WHERE a.slug = b.slug 
  AND a.card_name = b.card_name 
  -- Handle potential NULLs in card_index by treating them as equal
  AND (a.card_index = b.card_index OR (a.card_index IS NULL AND b.card_index IS NULL))
  -- Handle potential NULLs in rarity by treating them as equal
  AND (a.rarity = b.rarity OR (a.rarity IS NULL AND b.rarity IS NULL))
  AND a.id <> b.id;
