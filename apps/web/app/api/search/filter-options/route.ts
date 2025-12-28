import { NextResponse } from 'next/server';
import { createClient, getFallbackCardRows, hasSupabaseCredentials } from '@/lib/supabase';

const YEAR_REGEX = /(19|20)\d{2}/;
const MIN_YEAR = 1996;

function deriveYear(...candidates: Array<string | null | undefined>) {
  const currentYear = new Date().getFullYear();
  for (const candidate of candidates) {
    const match = candidate?.match(YEAR_REGEX);
    if (match) {
      const yearNumber = Number(match[0]);
      if (yearNumber >= MIN_YEAR && yearNumber <= currentYear) {
        return yearNumber;
      }
    }
  }
  return null;
}

export async function GET() {
  try {
    if (!hasSupabaseCredentials()) {
      const sets = new Map<string, { slug: string; name: string }>();
      const years = new Set<number>();

      getFallbackCardRows().forEach((card) => {
        if (card.set_slug) {
          sets.set(card.set_slug, { slug: card.set_slug, name: card.set_name });
        }
        const derivedYear = deriveYear(card.set_slug, card.set_name);
        if (derivedYear) {
          years.add(derivedYear);
        }
      });

      return NextResponse.json({
        sets: Array.from(sets.values()),
        years: Array.from(years).sort((a, b) => b - a),
      });
    }

    const supabase = createClient();

    // Fetch sets from sets_jp table (431 rows instead of 28K cards)
    const { data: setsData, error: setsError } = await supabase
      .from('sets_jp')
      .select('set_name, set_slug')
      .order('set_name', { ascending: true });

    if (setsError) {
      console.error('Supabase sets error:', setsError);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch filter options',
          },
        },
        { status: 500 }
      );
    }

    // Process sets and derive years
    const sets: Array<{ slug: string; name: string }> = [];
    const years = new Set<number>();

    (setsData ?? []).forEach((item) => {
      if (!item.set_slug || !item.set_name) {
        return;
      }

      sets.push({
        slug: item.set_slug,
        name: item.set_name,
      });

      const derivedYear = deriveYear(item.set_slug, item.set_name);
      if (derivedYear) {
        years.add(derivedYear);
      }
    });

    const normalizedYears = Array.from(years).sort((a, b) => b - a);

    return NextResponse.json({ sets, years: normalizedYears });
  } catch (error) {
    console.error('Unexpected filter options error:', error);
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
