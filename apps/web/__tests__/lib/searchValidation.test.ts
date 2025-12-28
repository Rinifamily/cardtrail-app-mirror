import { describe, it, expect } from 'vitest';
import { searchCardsSchema, autocompleteSchema } from '@/lib/validations/search';

describe('searchCardsSchema', () => {
  it('validates correct params', () => {
    const result = searchCardsSchema.safeParse({
      q: 'Pikachu',
      rarity: 'Rare',
      sort: 'name_asc',
      page: '2',
      limit: '20',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(20);
    }
  });

  it('fails on invalid parameters', () => {
    const result = searchCardsSchema.safeParse({
      limit: '5',
    });

    expect(result.success).toBe(false);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('limit');
    }
  });
});

describe('autocompleteSchema', () => {
  it('enforces query length', () => {
    const result = autocompleteSchema.safeParse({ q: '', limit: 5 });
    expect(result.success).toBe(false);
  });

  it('defaults limit when not provided', () => {
    const result = autocompleteSchema.safeParse({ q: 'Char' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(8);
    }
  });
});
