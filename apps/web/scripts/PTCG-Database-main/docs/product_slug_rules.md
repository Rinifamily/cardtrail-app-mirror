# Product Slug Naming Rules

When scraping TCGPlayer product cards, we derive a `product_slug` so that every variant (normal, mirror, ball-pattern, etc.) has a reproducible identifier. The slug helps prevent collisions when different cards share the same `card_name` and `card_index`.

## Derivation
1. Read the product hyperlink from the card node:
   ```html
   <a href="/product/665828/pokemon-japan-m2a-high-class-pack-mega-dream-ex-budew-011-193?page=1">
   ```
2. Strip query parameters and keep the path segment after `/product/{id}/`.
   - Product ID: `665828`
   - Product slug: `pokemon-japan-m2a-high-class-pack-mega-dream-ex-budew-011-193`
3. Store both values:
   - `product_id = 665828`
   - `product_slug = pokemon-japan-m2a-high-class-pack-mega-dream-ex-budew-011-193`

## Notes
- Slug always matches the path segment from TCGPlayer, so variants (e.g. `(Energy Symbol Pattern)`) receive distinct slugs.
- Use the slug as a uniqueness key if you need to join with upserted data later; it survives pagination order changes and keeps mirror versions separate.
- Image URLs are stored as a pipe-separated string combining `src` and `srcset`, so each slug can be mapped back to its images if needed.

