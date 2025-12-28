-- Smart cleanup: Remove low-quality duplicates
-- If multiple records exist for the same (slug, card_name):
-- Prioritize keeping records with non-empty card_index
-- Then prioritize records with non-null rarity
-- Then prioritize older records (original scrape)

DELETE FROM card_jp a
WHERE EXISTS (
    SELECT 1
    FROM card_jp b
    WHERE a.slug = b.slug
      AND a.card_name = b.card_name
      AND a.id <> b.id
      -- Logic: b is "better" than a if:
      AND (
          -- b has index but a doesn't
          (b.card_index IS NOT NULL AND b.card_index <> '' AND (a.card_index IS NULL OR a.card_index = ''))
          OR 
          -- both have same index status, but b has rarity and a doesn't
          (
             (b.card_index IS NOT NULL AND b.card_index <> '') = (a.card_index IS NOT NULL AND a.card_index <> '')
             AND b.rarity IS NOT NULL AND a.rarity IS NULL
          )
          OR
          -- both equality quality, keep b (older/smaller id)
          (
             (b.card_index IS NOT NULL AND b.card_index <> '') = (a.card_index IS NOT NULL AND a.card_index <> '')
             AND (b.rarity IS NOT NULL) = (a.rarity IS NOT NULL)
             AND b.id < a.id
          )
      )
);
