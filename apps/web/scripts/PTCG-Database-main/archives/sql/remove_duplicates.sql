DELETE FROM card_jp a USING (
    SELECT min(id) as id, card_name, set_name
    FROM card_jp 
    GROUP BY card_name, set_name
    HAVING count(*) > 1
) b 
WHERE a.card_name = b.card_name 
  AND a.set_name = b.set_name 
  AND a.id <> b.id;
