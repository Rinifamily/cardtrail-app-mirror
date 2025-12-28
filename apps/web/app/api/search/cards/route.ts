import { NextRequest, NextResponse } from 'next/server';
import { createClient, getFallbackCardRows, hasSupabaseCredentials } from '@/lib/supabase';
import { searchCardsSchema } from '@/lib/validations/search';

// Mark as dynamic to avoid static prerender warnings when using searchParams.
export const dynamic = 'force-dynamic';

const YEAR_REGEX = /(19|20)\d{2}/;
const MIN_YEAR = 1996;

function deriveYear(...candidates: Array<string | null | undefined>) {
  const currentYear = new Date().getFullYear();
  for (const value of candidates) {
    const match = value?.match(YEAR_REGEX);
    if (match) {
      const yearNumber = Number(match[0]);
      if (yearNumber >= MIN_YEAR && yearNumber <= currentYear) {
        return yearNumber;
      }
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = Object.fromEntries(searchParams.entries());

    const validationResult = searchCardsSchema.safeParse(params);

    if (!validationResult.success) {
      return NextResponse.json(
        {
        error: {
          code: 'INVALID_PARAMS',
          message: 'Validation failed',
          details: validationResult.error.issues,
        },
        },
        { status: 400 }
      );
    }

    const { q, rarity, set, sort, page, limit } = validationResult.data;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    if (!hasSupabaseCredentials()) {
      const fallback = buildFallbackCardResults(validationResult.data);
      return NextResponse.json(fallback);
    }

    const supabase = createClient();

    let query = supabase
      .from('card_jp')
      .select('id, card_name, card_index, rarity, set_name, set_slug, image_urls', { count: 'exact' })
      .range(from, to)
      .limit(limit);

    if (q) {
      // Intelligent multi-keyword search with AND logic
      // Search in: card_name, card_index, set_name (includes series code like "DP4:")
      const keywords = q.trim().split(/\s+/);
      
      if (keywords.length === 1) {
        // Single keyword: search in card_name, card_index, and set_name (OR logic)
        query = query.or(`card_name.ilike.%${q}%,card_index.ilike.%${q}%,set_name.ilike.%${q}%`);
      } else {
        // Multiple keywords: smart AND logic
        const numberPattern = /\d|#/;
        const numberKeywords = keywords.filter(k => numberPattern.test(k));
        const nameKeywords = keywords.filter(k => !numberPattern.test(k));
        
        // Build conditions for each keyword type
        if (nameKeywords.length > 0 && numberKeywords.length > 0) {
          // Mixed keywords: support multiple search patterns
          const nameConditions = nameKeywords.map(k => `card_name.ilike.%${k}%`).join(',');
          const indexConditions = numberKeywords.map(k => `card_index.ilike.%${k}%`).join(',');
          const setConditions = keywords.map(k => `set_name.ilike.%${k}%`).join(',');
          const numberSetConditions = numberKeywords.map(k => `set_name.ilike.%${k}%`).join(',');
          
          // Support: 
          // 1. card_name matches name keywords AND card_index matches number keywords
          // 2. set_name matches ALL keywords (e.g., "SV8a Mewtwo" where set has both)
          // 3. card_name matches name keywords AND set_name matches number keywords (e.g., "CP6 Pikachu")
          query = query.or(`and(${nameConditions},${indexConditions}),and(${setConditions}),and(${nameConditions},${numberSetConditions})`);
        } else if (nameKeywords.length > 0) {
          // Only name keywords: try matching all in card_name OR set_name
          const nameConditions = nameKeywords.map(k => `card_name.ilike.%${k}%`).join(',');
          const setConditions = nameKeywords.map(k => `set_name.ilike.%${k}%`).join(',');
          const indexFallback = `card_index.ilike.%${q}%`;
          query = query.or(`and(${nameConditions}),and(${setConditions}),${indexFallback}`);
        } else if (numberKeywords.length > 0) {
          // Only number keywords: try matching all in card_index OR set_name (for series codes)
          const indexConditions = numberKeywords.map(k => `card_index.ilike.%${k}%`).join(',');
          const setConditions = numberKeywords.map(k => `set_name.ilike.%${k}%`).join(',');
          const nameFallback = `card_name.ilike.%${q}%`;
          query = query.or(`and(${indexConditions}),and(${setConditions}),${nameFallback}`);
        }
      }
    }

    if (rarity) {
      query = query.eq('rarity', rarity);
    }

    if (set) {
      query = query.eq('set_slug', set);
    }

    switch (sort) {
      case 'name_asc':
        query = query.order('card_name', { ascending: true });
        break;
      case 'name_desc':
        query = query.order('card_name', { ascending: false });
        break;
      case 'year_desc':
        query = query.order('set_slug', { ascending: false });
        break;
      case 'relevance':
      default:
        if (q) {
          query = query.order('card_name', { ascending: true });
        }
        break;
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch cards',
          },
        },
        { status: 500 }
      );
    }

    const totalPages = count ? Math.ceil(count / limit) : 0;
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return NextResponse.json({
      data,
      pagination: {
        page,
        per_page: limit,
        total_items: count || 0,
        total_pages: totalPages,
        has_next: hasNext,
        has_prev: hasPrev,
      },
    });
  } catch (error) {
    console.error('Unexpected error in /api/search/cards:', error);

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

function buildFallbackCardResults(params: {
  q?: string | null;
  rarity?: string | null;
  set?: string | null;
  sort?: string | null;
  page: number;
  limit: number;
}) {
  const { q, rarity, set, sort, page, limit } = params;
  const query = q?.toLowerCase().trim();

  let rows = getFallbackCardRows();
  if (query) {
    const keywords = query.split(/\s+/);
    
    if (keywords.length === 1) {
      // Single keyword: search in card_name, card_index, and set_name (OR logic)
      rows = rows.filter((card) =>
        card.card_name.toLowerCase().includes(query) ||
        card.card_index?.toLowerCase().includes(query) ||
        card.set_name?.toLowerCase().includes(query)
      );
    } else {
      // Multiple keywords: smart AND logic
      const numberPattern = /\d|#/;
      const numberKeywords = keywords.filter(k => numberPattern.test(k));
      const nameKeywords = keywords.filter(k => !numberPattern.test(k));
      
      rows = rows.filter((card) => {
        const cardName = card.card_name.toLowerCase();
        const cardIndex = card.card_index?.toLowerCase() || '';
        const setName = card.set_name?.toLowerCase() || '';
        
        // Check if all name keywords are in card_name
        const nameMatch = nameKeywords.length === 0 || 
          nameKeywords.every(keyword => cardName.includes(keyword.toLowerCase()));
        
        // Check if all number keywords are in card_index
        const indexMatch = numberKeywords.length === 0 || 
          numberKeywords.every(keyword => cardIndex.includes(keyword.toLowerCase()));
        
        // Check if keywords match in set_name (for series code or name)
        const setMatch = keywords.every(keyword => setName.includes(keyword.toLowerCase()));
        
        // Check if name keywords in card_name AND number keywords in set_name
        const nameInCardAndNumberInSet = nameKeywords.length > 0 && numberKeywords.length > 0 &&
          nameMatch && numberKeywords.every(keyword => setName.includes(keyword.toLowerCase()));
        
        // If we have both types, support multiple patterns
        if (nameKeywords.length > 0 && numberKeywords.length > 0) {
          return (nameMatch && indexMatch) || setMatch || nameInCardAndNumberInSet;
        }
        
        // If only name keywords: match in card_name OR set_name OR card_index
        if (nameKeywords.length > 0) {
          return nameMatch || setMatch || cardIndex.includes(query);
        }
        
        // If only number keywords: match in card_index OR set_name OR card_name
        if (numberKeywords.length > 0) {
          return indexMatch || setMatch || cardName.includes(query);
        }
        
        return false;
      });
    }
  }
  if (rarity) {
    rows = rows.filter(
      (card) => card.rarity?.toLowerCase() === rarity.toLowerCase(),
    );
  }
  if (set) {
    rows = rows.filter((card) => card.set_slug === set);
  }

  switch (sort) {
    case 'name_desc':
      rows = rows.sort((a, b) => b.card_name.localeCompare(a.card_name));
      break;
    case 'year_desc':
      rows = rows.sort(
        (a, b) =>
          (deriveYear(b.set_slug, b.set_name) ?? 0) -
          (deriveYear(a.set_slug, a.set_name) ?? 0),
      );
      break;
    case 'name_asc':
    case 'relevance':
    default:
      rows = rows.sort((a, b) => a.card_name.localeCompare(b.card_name));
      break;
  }

  const totalItems = rows.length;
  const totalPages = Math.ceil(totalItems / limit);
  const start = (page - 1) * limit;
  const data = rows.slice(start, start + limit).map((card) => ({
    id: card.id,
    card_name: card.card_name,
    card_index: card.card_index,
    rarity: card.rarity,
    set_name: card.set_name,
    set_slug: card.set_slug,
    image_urls: card.image_urls,
  }));

  return {
    data,
    pagination: {
      page,
      per_page: limit,
      total_items: totalItems,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
}
