import { describe, it, expect, beforeAll, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

describe('useIntersectionObserver', () => {
  beforeAll(() => {
    class MockIntersectionObserver {
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe = vi.fn((element?: Element | null) => {
        this.callback([
          {
            isIntersecting: true,
            target: element as Element,
            intersectionRatio: 1,
            boundingClientRect: {} as DOMRectReadOnly,
            intersectionRect: {} as DOMRectReadOnly,
            rootBounds: null,
            time: Date.now(),
          },
        ], this as unknown as IntersectionObserver);
      });
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);
    }

    // @ts-expect-error - override global for tests
    global.IntersectionObserver = MockIntersectionObserver;
  });

  it('updates state when element intersects', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    const element = document.createElement('div');

    act(() => {
      result.current.targetRef(element);
    });

    expect(result.current.isIntersecting).toBe(true);
  });
});
