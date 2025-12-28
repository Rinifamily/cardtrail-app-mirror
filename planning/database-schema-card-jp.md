# card_jp Table Schema Documentation

**Table Name:** `card_jp`  
**Records:** 28,154 Japanese Pokemon cards  
**Access:** READ-ONLY (Never modify this table)

---

## Table Structure

```sql
CREATE TABLE card_jp (
  id              BIGINT PRIMARY KEY,
  card_name       TEXT NOT NULL,
  set_name        TEXT NOT NULL,
  set_slug        TEXT NOT NULL,
  card_index      TEXT,
  rarity          TEXT,
  image_urls      TEXT,
  product_slug    TEXT,
  product_id      TEXT
);
```

---

## Column Descriptions

| Column | Type | Nullable | Description | Example |
|--------|------|----------|-------------|---------|
| `id` | BIGINT | No | Primary key, unique card ID | `12` |
| `card_name` | TEXT | No | Card name in English | `"Pikachu"` |
| `set_name` | TEXT | No | Full set name | `"11th Movie Commemoration Set"` |
| `set_slug` | TEXT | No | URL-friendly set identifier | `"11th-movie-commemoration-set"` |
| `card_index` | TEXT | Yes | Card number in set | `"#003/009"` |
| `rarity` | TEXT | Yes | Rarity tier | `"Rare"`, `"Holo Rare"`, `"None"` |
| `image_urls` | TEXT | Yes | Multi-resolution images (see below) | `"https://...jpg\|srcset..."` |
| `product_slug` | TEXT | Yes | TCGPlayer product slug | `"pokemon-japan-11th-movie..."` |
| `product_id` | TEXT | Yes | TCGPlayer product ID | `"613768"` |

---

## Sample Records

### Example 1: Pikachu
```json
{
  "id": 12,
  "card_name": "Pikachu",
  "set_name": "11th Movie Commemoration Set",
  "set_slug": "11th-movie-commemoration-set",
  "card_index": "#003/009",
  "rarity": "None",
  "image_urls": "https://tcgplayer-cdn.tcgplayer.com/product/613768_in_200x200.jpg|https://tcgplayer-cdn.tcgplayer.com/product/613768_in_200x200.jpg 200w,...",
  "product_slug": "pokemon-japan-11th-movie-commemoration-set-pikachu",
  "product_id": "613768"
}
```

### Example 2: Visitor Deoxys
```json
{
  "id": 1,
  "card_name": "Visitor Deoxys",
  "set_name": "10th Movie Commemoration Set",
  "set_slug": "10th-movie-commemoration-set",
  "card_index": "",
  "rarity": "None",
  "image_urls": "https://tcgplayer-cdn.tcgplayer.com/product/613782_in_200x200.jpg|...",
  "product_slug": "pokemon-japan-10th-movie-commemoration-set-visitor-deoxys",
  "product_id": "613782"
}
```

---

## Image URLs Format

The `image_urls` column uses a special format:

```
[base_url]|[srcset_string]
```

**Structure:**
- **Part 1 (before `|`):** Base URL for default image (200x200)
- **Part 2 (after `|`):** Complete srcset string with multiple resolutions

**Available Resolutions:**
- 200x200 - Thumbnail
- 400x400 - Small
- 600x600 - Medium
- 800x800 - Large
- 1000x1000 - Extra Large

**Full Example:**
```
https://tcgplayer-cdn.tcgplayer.com/product/613768_in_200x200.jpg|https://tcgplayer-cdn.tcgplayer.com/product/613768_in_200x200.jpg 200w,https://tcgplayer-cdn.tcgplayer.com/product/613768_in_400x400.jpg 400w,https://tcgplayer-cdn.tcgplayer.com/product/613768_in_600x600.jpg 600w,https://tcgplayer-cdn.tcgplayer.com/product/613768_in_800x800.jpg 800w,https://tcgplayer-cdn.tcgplayer.com/product/613768_in_1000x1000.jpg 1000w
```

---

## Usage Examples

### TypeScript Type Definition

```typescript
// packages/shared-types/src/database.ts
export interface CardJP {
  id: number;
  card_name: string;
  set_name: string;
  set_slug: string;
  card_index: string | null;
  rarity: string | null;
  image_urls: string | null;
  product_slug: string | null;
  product_id: string | null;
}

// Helper type for parsed images
export interface CardImages {
  baseUrl: string;
  srcset: string;
  resolutions: {
    thumbnail: string;   // 200x200
    small: string;       // 400x400
    medium: string;      // 600x600
    large: string;       // 800x800
    xlarge: string;      // 1000x1000
  };
}
```

### Parsing Image URLs

```typescript
// lib/utils/parse-card-images.ts
export function parseCardImages(imageUrls: string): CardImages {
  const [baseUrl, srcset] = imageUrls.split('|');
  
  // Extract individual resolutions
  const srcsetParts = srcset.split(',').map(s => s.trim());
  const resolutions = {
    thumbnail: srcsetParts.find(s => s.includes('200w'))?.split(' ')[0] || baseUrl,
    small: srcsetParts.find(s => s.includes('400w'))?.split(' ')[0] || baseUrl,
    medium: srcsetParts.find(s => s.includes('600w'))?.split(' ')[0] || baseUrl,
    large: srcsetParts.find(s => s.includes('800w'))?.split(' ')[0] || baseUrl,
    xlarge: srcsetParts.find(s => s.includes('1000w'))?.split(' ')[0] || baseUrl,
  };
  
  return { baseUrl, srcset, resolutions };
}
```

### Querying Cards

```typescript
// packages/db/src/queries/cards.ts
import { supabase } from '../client';
import type { CardJP } from '@cardtrail/shared-types';

export async function getCardById(id: number): Promise<CardJP | null> {
  const { data, error } = await supabase
    .from('card_jp')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function searchCards(
  query: string,
  limit: number = 20
): Promise<CardJP[]> {
  const { data, error } = await supabase
    .from('card_jp')
    .select('*')
    .ilike('card_name', `%${query}%`)
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

export async function getCardsBySet(
  setSlug: string,
  limit: number = 100
): Promise<CardJP[]> {
  const { data, error } = await supabase
    .from('card_jp')
    .select('*')
    .eq('set_slug', setSlug)
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}
```

### Using in Next.js Component

```typescript
// app/(main)/cards/[id]/page.tsx
import Image from 'next/image';
import { getCardById } from '@cardtrail/db/queries/cards';
import { parseCardImages } from '@/lib/utils/parse-card-images';

export default async function CardDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const card = await getCardById(parseInt(params.id));
  if (!card) return <div>Card not found</div>;
  
  const images = parseCardImages(card.image_urls);
  
  return (
    <div>
      <h1>{card.card_name}</h1>
      <p>{card.set_name}</p>
      
      {/* Use Next.js Image with srcset */}
      <Image
        src={images.baseUrl}
        srcSet={images.srcset}
        alt={card.card_name}
        width={600}
        height={840}
        priority
      />
      
      {/* Or use specific resolution */}
      <Image
        src={images.resolutions.large}
        alt={card.card_name}
        width={800}
        height={1120}
      />
    </div>
  );
}
```

---

## Query Performance Tips

### Indexes
The table has a primary key index on `id`. Consider adding indexes for:
- `set_slug` (frequent filtering)
- `card_name` (search queries)
- `rarity` (filtering)

```sql
-- ✅ SAFE: Create indexes (read-only optimization)
CREATE INDEX CONCURRENTLY idx_card_jp_set_slug ON card_jp(set_slug);
CREATE INDEX CONCURRENTLY idx_card_jp_card_name ON card_jp(card_name);
CREATE INDEX CONCURRENTLY idx_card_jp_rarity ON card_jp(rarity);
```

### Always Limit Results

```typescript
// ❌ BAD: Unbounded query (could return 28,154 rows!)
const { data } = await supabase.from('card_jp').select('*');

// ✅ GOOD: Always limit
const { data } = await supabase
  .from('card_jp')
  .select('*')
  .limit(100);
```

---

## Related Tables

### sets_jp (431 records)
Set metadata for card_jp.

```sql
CREATE TABLE sets_jp (
  set_name TEXT PRIMARY KEY,
  set_slug TEXT,
  card_count INTEGER,
  display_name TEXT
);
```

### rarity_jp (32 records)
Valid rarity values.

```sql
CREATE TABLE rarity_jp (
  rarity_name TEXT PRIMARY KEY
);
```

---

## Extending with Additional Data

**NEVER modify card_jp directly.** Instead, create extension tables:

```sql
-- ✅ CORRECT: Create extension table
CREATE TABLE card_extensions (
  card_id BIGINT PRIMARY KEY REFERENCES card_jp(id) ON DELETE CASCADE,
  current_price_psa10 DECIMAL(10,2),
  current_price_psa9 DECIMAL(10,2),
  current_price_raw DECIMAL(10,2),
  popularity_score INTEGER DEFAULT 0,
  last_price_update TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for joins
CREATE INDEX idx_card_extensions_card_id ON card_extensions(card_id);

-- Example query with extension
SELECT 
  c.id,
  c.card_name,
  c.image_urls,
  e.current_price_psa10,
  e.popularity_score
FROM card_jp c
LEFT JOIN card_extensions e ON c.id = e.card_id
WHERE c.set_slug = 'base-set'
LIMIT 20;
```

---

## ⚠️ Critical Rules

1. **NEVER run these operations on card_jp:**
   ```sql
   -- ❌ ABSOLUTELY FORBIDDEN
   ALTER TABLE card_jp ...
   UPDATE card_jp SET ...
   DELETE FROM card_jp ...
   TRUNCATE TABLE card_jp;
   DROP TABLE card_jp;
   ```

2. **Only SELECT queries allowed:**
   ```sql
   -- ✅ ALLOWED
   SELECT * FROM card_jp WHERE id = 123;
   SELECT card_name, image_urls FROM card_jp LIMIT 100;
   ```

3. **For foreign keys, reference card_jp.id:**
   ```sql
   -- ✅ CORRECT
   CREATE TABLE collections (
     id SERIAL PRIMARY KEY,
     user_id UUID NOT NULL,
     card_id BIGINT NOT NULL REFERENCES card_jp(id),
     quantity INTEGER DEFAULT 1
   );
   ```

---

**Last Updated:** December 5, 2025  
**Maintained by:** CardTrail Development Team

