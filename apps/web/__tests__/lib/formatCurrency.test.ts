import { describe, expect, it } from 'vitest';

import { formatCurrency } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats CNY without decimals for large numbers', () => {
    expect(formatCurrency(12345, 'CNY')).toBe('¥12,345');
  });

  it('formats USD correctly', () => {
    expect(formatCurrency(9876, 'USD')).toBe('$9,876');
  });

  it('formats JPY correctly', () => {
    expect(formatCurrency(5000, 'JPY')).toBe('￥5,000');
  });

  it('shows decimals for values under 1', () => {
    expect(formatCurrency(0.56, 'CNY')).toBe('¥0.56');
  });

  it('falls back to default currency when unknown', () => {
    expect(formatCurrency(1000, 'XYZ')).toBe('¥1,000');
  });

  it('returns placeholder for nullish inputs', () => {
    expect(formatCurrency(null)).toBe('--');
    expect(formatCurrency(undefined)).toBe('--');
  });
});
