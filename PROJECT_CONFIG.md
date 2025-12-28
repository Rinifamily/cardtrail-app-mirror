# CardTrail Project Configuration

**Last Updated:** December 5, 2025

---

## 📋 Project Status

- **Environment:** Development
- **Phase:** Phase 0 - Ready to Start
- **Supabase:** ✅ Configured
- **Database:** ✅ 28,154 cards available
- **GitHub:** ✅ gh CLI authenticated
- **Deployment:** ⏳ To be configured (Vercel)

---

## 🔐 Environment Variables

### Configured
```env
NEXT_PUBLIC_SUPABASE_URL=https://dmsvsfsbytemtbbqxqyi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Location:** `.env.local` (created, not committed)

### To Be Configured Later
- eBay API credentials (Phase 7 - eBay Integration)
- Vercel environment variables (after deployment)

---

## 🗄️ Database Information

### Supabase Project
- **Project URL:** https://dmsvsfsbytemtbbqxqyi.supabase.co
- **Region:** Auto-selected by Supabase
- **Plan:** Free tier (upgradable)

### Card Data (`card_jp` table)
- **Total Cards:** 28,154 Japanese Pokemon cards
- **Status:** ✅ Production data available
- **Access:** Read-only (NEVER modify this table)

**Table Structure:**
```sql
CREATE TABLE card_jp (
  id              BIGINT PRIMARY KEY,
  card_name       TEXT NOT NULL,
  set_name        TEXT NOT NULL,
  set_slug        TEXT NOT NULL,
  card_index      TEXT,              -- e.g., "#003/009"
  rarity          TEXT,              -- e.g., "Rare", "Holo Rare"
  image_urls      TEXT,              -- Multi-resolution images (see below)
  product_slug    TEXT,
  product_id      TEXT
);
```

**Sample Data:**
```json
{
  "id": 12,
  "card_name": "Pikachu",
  "set_name": "11th Movie Commemoration Set",
  "set_slug": "11th-movie-commemoration-set",
  "card_index": "#003/009",
  "rarity": "None",
  "image_urls": "https://tcgplayer-cdn.tcgplayer.com/product/613768_in_200x200.jpg|...",
  "product_slug": "pokemon-japan-11th-movie-commemoration-set-pikachu",
  "product_id": "613768"
}
```

### Image URLs Format
The `image_urls` column contains pipe-separated URLs:
```
[base_url] | [srcset_string]
```

**Example:**
```
https://tcgplayer-cdn.tcgplayer.com/product/613768_in_200x200.jpg|https://tcgplayer-cdn.tcgplayer.com/product/613768_in_200x200.jpg 200w,https://tcgplayer-cdn.tcgplayer.com/product/613768_in_400x400.jpg 400w,https://tcgplayer-cdn.tcgplayer.com/product/613768_in_600x600.jpg 600w,https://tcgplayer-cdn.tcgplayer.com/product/613768_in_800x800.jpg 800w,https://tcgplayer-cdn.tcgplayer.com/product/613768_in_1000x1000.jpg 1000w
```

**Available Resolutions:**
- 200x200 (thumbnail)
- 400x400 (small)
- 600x600 (medium)
- 800x800 (large)
- 1000x1000 (extra large)

**Usage in Code:**
```typescript
// Parse image URLs
const [baseUrl, srcset] = card.image_urls.split('|');

// Use in Next.js Image component
<Image
  src={baseUrl}
  srcSet={srcset}
  alt={card.card_name}
  width={200}
  height={280}
/>
```

### Related Tables
- `sets_jp` (431 sets) - Japanese set metadata
- `rarity_jp` (32 rarities) - Rarity types
- `sets_en` (empty) - English sets (to be populated)

---

## 🛠️ Development Tools

### Installed & Configured
- ✅ **gh CLI** - GitHub CLI authenticated and ready
- ✅ **Node.js** - Version 20+
- ✅ **pnpm** - Version 8+

### To Be Installed (Phase 0)
- Turborepo
- Next.js 14
- Supabase client
- shadcn/ui + DaisyUI
- Playwright + Vitest
- Husky + lint-staged

---

## 📦 Repository Information

### Git Configuration
- **Remote:** To be set up
- **Branch Strategy:** main (production), feat/* (features)
- **CI/CD:** GitHub Actions (to be configured in Task 03)

### GitHub CLI Status
✅ Authenticated - Can use `gh` commands for:
- Creating repositories
- Managing PRs
- Triggering workflows
- Creating releases

---

## 🚀 Deployment Strategy

### Vercel (Recommended)
- **Status:** ⚠️ Pending CLI login
- **Plan:** Free tier (Hobby)
- **Auto-deploy:** On push to main
- **Preview:** On pull requests

**Setup Steps (Task 02):**
1. Install Vercel CLI (`pnpm dlx vercel login`) using an authorized account.
2. Link the repository root to the Vercel project, setting **rootDirectory = apps/web**.
3. Add required environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) for production/preview/dev.
4. Deploy via `pnpm dlx vercel --cwd apps/web --prod` and capture the resulting URL here.

---

## ⚠️ Critical Constraints

### Database Rules
1. **NEVER modify `card_jp` table**
   - No ALTER TABLE
   - No UPDATE/DELETE operations
   - Only SELECT queries allowed

2. **For additional card data:**
   - Create `card_extensions` table
   - Reference `card_jp.id` via foreign key
   - Store extensions there

### Example:
```sql
-- ✅ CORRECT: Extend with separate table
CREATE TABLE card_extensions (
  card_id BIGINT PRIMARY KEY REFERENCES card_jp(id),
  current_price_psa10 DECIMAL(10,2),
  popularity_score INTEGER,
  last_price_update TIMESTAMPTZ
);
```

---

## 📝 Next Steps (Phase 0)

### Task 01: Monorepo Setup (8h)
- Create monorepo structure
- Configure pnpm workspaces + Turborepo
- Set up shared packages
- Configure Taskfile

### Task 02: Next.js + Supabase (8h)
- Initialize Next.js 14 app
- Connect to Supabase (credentials already available)
- Install shadcn/ui + DaisyUI
- Query card_jp table
- Deploy to Vercel

### Task 03: Testing & DevTools (6h)
- Set up Playwright + Vitest
- Configure GitHub Actions CI/CD
- Set up Husky + lint-staged

### Task 04: Bottom Navigation (4h)
- Create bottom navigation component
- Implement responsive layout

---

## 🔗 Quick Links

- **Planning Docs:** `planning/` directory
- **Design System:** `planning/design.md`
- **Development Guidelines:** `planning/agents.md`
- **Implementation Tasks:** `implementation/` directory
- **Supabase Dashboard:** https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi

---

## 📞 Support Resources

### Documentation
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com

### Tools
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Actions: https://github.com/features/actions
- Turborepo Docs: https://turbo.build/repo/docs

---

**Status:** ✅ Ready to begin Phase 0 implementation

