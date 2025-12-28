/**
 * CT Price API Endpoint
 * 
 * GET /api/v1/cards/[id]/price?grade=psa10&language=jp
 * 
 * Calculate CT Price for a specific card and grade.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculatePriceWithFallback,
  getCachedPrice,
  cachePrice,
  storePriceHistory,
} from '@/lib/price-algorithm';
import type { GradeType, LanguageCode } from '@/lib/price-algorithm/types';

/**
 * GET /api/v1/cards/[id]/price
 * 
 * Calculate CT Price for a card
 * 
 * Query params:
 * - grade: required (psa10, psa9, raw, etc.)
 * - language: optional (jp, en, cn)
 * - force_refresh: optional (bypass cache, default: false)
 * - store_history: optional (save to price_history, default: false)
 * 
 * @param request - Next.js request object
 * @param params - Route params with card ID
 * @returns CT Price result JSON
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Parse and validate card ID
    const card_id = parseInt(params.id, 10);

    if (isNaN(card_id) || card_id <= 0) {
      return NextResponse.json(
        { error: 'Invalid card ID. Must be a positive integer.' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const grade = searchParams.get('grade') as GradeType | null;
    const language = searchParams.get('language') as LanguageCode | null;
    const force_refresh = searchParams.get('force_refresh') === 'true';
    const store_history = searchParams.get('store_history') === 'true';

    // Validate grade parameter (required)
    if (!grade) {
      return NextResponse.json(
        {
          error: 'Grade parameter is required',
          valid_grades: [
            'raw',
            'psa7',
            'psa8',
            'psa9',
            'psa10',
            'bgs9',
            'bgs9_5',
            'bgs10',
            'cgc9_5',
            'cgc10',
          ],
        },
        { status: 400 }
      );
    }

    // Validate grade format
    const validGrades = [
      'raw',
      'psa7',
      'psa8',
      'psa9',
      'psa10',
      'bgs9',
      'bgs9_5',
      'bgs10',
      'cgc9_5',
      'cgc10',
      'sgc8',
      'sgc8_5',
      'sgc9',
      'sgc9_5',
      'sgc10',
    ];
    if (!validGrades.includes(grade)) {
      return NextResponse.json(
        {
          error: `Invalid grade: ${grade}`,
          valid_grades: validGrades,
        },
        { status: 400 }
      );
    }

    // Validate language if provided
    if (language && !['jp', 'en', 'cn'].includes(language)) {
      return NextResponse.json(
        {
          error: `Invalid language: ${language}`,
          valid_languages: ['jp', 'en', 'cn'],
        },
        { status: 400 }
      );
    }

    console.log(
      `[CT Price API] Request for card ${card_id}, grade ${grade}, language ${language || 'any'}`
    );

    // Check cache first (unless force refresh)
    if (!force_refresh) {
      const cached = await getCachedPrice(card_id, grade, language);
      if (cached) {
        console.log(`[CT Price API] Returning cached result`);
        return NextResponse.json(
          {
            data: cached,
            cached: true,
            calculated_at: cached.calculation_date,
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
          }
        );
      }
    }

    // Calculate CT Price with fallback (automatically estimates from other grades if needed)
    const startTime = Date.now();
    const result = await calculatePriceWithFallback(card_id, grade);
    const calculationTime = Date.now() - startTime;

    console.log(
      `[CT Price API] Calculated in ${calculationTime}ms: ${result.price || 'null'}`
    );

    // Cache the result
    await cachePrice(card_id, grade, language, result);

    // Store in price_history if requested
    if (store_history && result.price !== null) {
      await storePriceHistory(card_id, grade, result);
    }

    // Return response
    return NextResponse.json(
      {
        data: result,
        cached: false,
        calculated_at: result.calculation_date,
        calculation_time_ms: calculationTime,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('[CT Price API] Error:', error);

    // Return error response
    return NextResponse.json(
      {
        error: 'Failed to calculate price',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/cards/[id]/price
 * 
 * Calculate and store CT Price for multiple grades
 * 
 * Request body:
 * {
 *   "grades": ["raw", "psa9", "psa10"],
 *   "language": "jp",
 *   "force_refresh": true
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const card_id = parseInt(params.id, 10);

    if (isNaN(card_id) || card_id <= 0) {
      return NextResponse.json(
        { error: 'Invalid card ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { grades, language } = body;

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return NextResponse.json(
        { error: 'grades array is required' },
        { status: 400 }
      );
    }

    // Calculate prices for all grades with fallback
    const results: Record<string, any> = {};
    const startTime = Date.now();

    for (const grade of grades) {
      const result = await calculatePriceWithFallback(
        card_id,
        grade as GradeType
      );

      results[grade] = result;

      // Cache and store
      await cachePrice(card_id, grade, language, result);
      if (result.price !== null) {
        await storePriceHistory(card_id, grade, result);
      }
    }

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      data: results,
      calculation_time_ms: totalTime,
      calculated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CT Price API] Error in POST:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate prices',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
