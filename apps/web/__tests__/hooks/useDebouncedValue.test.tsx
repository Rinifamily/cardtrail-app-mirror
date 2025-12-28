import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 200));
    expect(result.current).toBe('initial');
  });

  it('updates value after the debounce delay', () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200),
      {
        initialProps: { value: 'start' },
      }
    );

    rerender({ value: 'updated' });

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe('start');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('updated');

    vi.useRealTimers();
  });
});
