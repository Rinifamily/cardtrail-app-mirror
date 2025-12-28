# Best of XY Troubleshooting Summary

## Current Pain Points
- **Missing card indices** – DOM nodes show strings like `None, #077/171`, but the old regex expected the entire string to be `#/###`, so many entries were stored with blank `card_index`.
- **Variant collisions** – Supabase uses the unique key `(card_name, set_name, card_index)`. When the index is blank for both normal and mirror versions (e.g., `Zubat` vs. `Zubat (Mirror Holofoil)`), one variant overwrites the other.
- **Stale comparison data** – The original `best_of_xy_full_dump.txt` was generated before the scraper fixes and still contains empty indices, so comparing against it falsely reports 200+ “missing” cards.

## Resolutions in Place
- **Regex fallback updated** – `_normalize_card_index()` now searches anywhere in the text for `\d{1,3}/\d{1,3}`, so strings like `None, #077/171` convert to `#077/171`. Titles are also re-read via `textContent`, `innerText`, and `img.alt`.
- **Fresh Supabase crawl** – After clearing `sm-the-best-of-xy`, running `scrapy crawl tcgplayer_jp -a sets=sm-the-best-of-xy -a "target_set_name=SM: The Best of XY"` repopulates all 322 cards with correct indices (Yveltal variants included).
- **Text-only spider** – `tcgplayer_jp_txt` + `TextDumpPipeline` can dump raw results to any `.txt` file without touching Supabase, useful for auditing (`best_of_xy_full_dump_latest.txt`).

## Recommended Workflow
1. **Reset and scrape**
   ```bash
   source .venv/bin/activate
   python - <<'PY'
   from supabase import create_client; from dotenv import load_dotenv, find_dotenv
   import os; load_dotenv(find_dotenv())
   client = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))
   client.table('card_jp').delete().eq('slug', 'sm-the-best-of-xy').execute()
   PY
   scrapy crawl tcgplayer_jp -a sets=sm-the-best-of-xy -a "target_set_name=SM: The Best of XY"
   ```
2. **Audit with txt dump**
   ```bash
   scrapy crawl tcgplayer_jp_txt -a sets=sm-the-best-of-xy \
     -a "target_set_name=SM: The Best of XY" \
     -a dump_file=best_of_xy_full_dump_latest.txt
   ```
3. **Compare (optional)**
   Use the Python diff helper (`best_of_xy_missing_after_rescrape.txt`) or load the txt dump into Excel/SQL for further checks.

## Next Improvements
- Consider storing a `variant_label` (e.g., `Mirror Holofoil`) and expanding the unique constraint to `(slug, card_name, card_index, variant_label)` to avoid collisions.
- Generalize the improved index extraction for all sets; any re-run after the fixes will automatically benefit.

