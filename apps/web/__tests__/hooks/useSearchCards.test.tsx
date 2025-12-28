import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useSearchCards } from '@/hooks/useSearchCards';

global.fetch = vi.fn();

describe('useSearchCards', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches search results successfully', async () => {
    const mockResponse = {
      data: [
        {
          id: 1,
          card_name: 'Pikachu',
          set_name: 'Base Set',
          rarity: 'Common',
          set_slug: '1996-base',
          image_urls: null,
        },
      ],
      pagination: {
        page: 1,
        per_page: 20,
        total_items: 1,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    };

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useSearchCards({ q: 'Pikachu' }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0].data).toHaveLength(1);
    expect(result.current.data?.pages[0].data[0].card_name).toBe('Pikachu');
  });

  it('fetches all cards when no params provided', async () => {
    const mockResponse = {
      data: [
        {
          id: 1,
          card_name: 'Pikachu',
          set_name: 'Base Set',
          rarity: 'Common',
          set_slug: '1996-base',
          image_urls: null,
        },
        {
          id: 2,
          card_name: 'Charizard',
          set_name: 'Base Set',
          rarity: 'Rare',
          set_slug: '1996-base',
          image_urls: null,
        },
      ],
      pagination: {
        page: 1,
        per_page: 20,
        total_items: 2,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    };

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useSearchCards({}), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0].data).toHaveLength(2);
  });
});
