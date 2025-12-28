import { NextRequest, NextResponse } from 'next/server';
import { createClient, getFallbackCardRows, hasSupabaseCredentials } from '@/lib/supabase';
import { autocompleteSchema } from '@/lib/validations/search';

// Mark as dynamic to avoid static prerender warnings when using searchParams.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const validationResult = autocompleteSchema.safeParse(params);

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

    const { q, limit } = validationResult.data;

    if (!hasSupabaseCredentials()) {
      const normalized = q.toLowerCase();
      const data = getFallbackCardRows()
        .filter((card) => card.card_name.toLowerCase().startsWith(normalized))
        .slice(0, limit)
        .map((card) => ({
          id: card.id,
          card_name: card.card_name,
          set_name: card.set_name,
        }));
      return NextResponse.json({ data });
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('card_jp')
      .select('id, card_name, set_name')
      .ilike('card_name', `${q}%`)
      .order('card_name', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Supabase autocomplete error:', error);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch autocomplete suggestions',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Unexpected autocomplete error:', error);
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
