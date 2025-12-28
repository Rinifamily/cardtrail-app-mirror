import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComparisonDrawer } from '@/components/rankings/ComparisonDrawer';
import type { RankingCard } from '@/types/rankings';

const mockCards: RankingCard[] = [
  {
    rank: 1,
    cardId: '1',
    cardName: 'Charizard',
    cardNameJa: 'リザードン',
    thumbnailUrl: '/test1.png',
    currentPrice: 100,
    priceChange: 20,
    priceChangePercent: 20,
    volume: 50,
    rarity: 'rare',
  },
  {
    rank: 2,
    cardId: '2',
    cardName: 'Pikachu',
    cardNameJa: 'ピカチュウ',
    thumbnailUrl: '/test2.png',
    currentPrice: 80,
    priceChange: 10,
    priceChangePercent: 12.5,
    volume: 40,
    rarity: 'uncommon',
  },
];

describe('ComparisonDrawer', () => {
  it('should render selected cards', () => {
    const onClear = vi.fn();
    const onRemoveCard = vi.fn();

    render(
      <ComparisonDrawer
        selectedCards={mockCards}
        onClear={onClear}
        onRemoveCard={onRemoveCard}
      />
    );

    expect(screen.getByText('リザードン')).toBeInTheDocument();
    expect(screen.getByText('ピカチュウ')).toBeInTheDocument();
  });

  it('should display card count', () => {
    const onClear = vi.fn();
    const onRemoveCard = vi.fn();

    render(
      <ComparisonDrawer
        selectedCards={mockCards}
        onClear={onClear}
        onRemoveCard={onRemoveCard}
      />
    );

    expect(screen.getByText(/2.*of.*3/i)).toBeInTheDocument();
  });

  it('should generate correct comparison URL', () => {
    const onClear = vi.fn();
    const onRemoveCard = vi.fn();

    render(
      <ComparisonDrawer
        selectedCards={mockCards}
        onClear={onClear}
        onRemoveCard={onRemoveCard}
      />
    );

    const compareLink = screen.getByRole('link', { name: /Compare|对比/i });
    expect(compareLink).toHaveAttribute('href', '/compare?ids=1,2');
  });

  it('should call onClear when close button clicked', () => {
    const onClear = vi.fn();
    const onRemoveCard = vi.fn();

    render(
      <ComparisonDrawer
        selectedCards={mockCards}
        onClear={onClear}
        onRemoveCard={onRemoveCard}
      />
    );

    const closeButton = screen.getByLabelText('Close drawer');
    fireEvent.click(closeButton);

    expect(onClear).toHaveBeenCalled();
  });

  it('should call onRemoveCard when card remove button clicked', () => {
    const onClear = vi.fn();
    const onRemoveCard = vi.fn();

    render(
      <ComparisonDrawer
        selectedCards={mockCards}
        onClear={onClear}
        onRemoveCard={onRemoveCard}
      />
    );

    const removeButtons = screen.getAllByLabelText(/Remove/);
    fireEvent.click(removeButtons[0]);

    expect(onRemoveCard).toHaveBeenCalledWith('1');
  });

  it('should call onClear when ESC key pressed', () => {
    const onClear = vi.fn();
    const onRemoveCard = vi.fn();

    const { container } = render(
      <ComparisonDrawer
        selectedCards={mockCards}
        onClear={onClear}
        onRemoveCard={onRemoveCard}
      />
    );

    const drawer = container.querySelector('[role="dialog"]');
    if (drawer) {
      fireEvent.keyDown(drawer, { key: 'Escape' });
    }

    expect(onClear).toHaveBeenCalled();
  });

  it('should call onClear when Clear Selection button clicked', () => {
    const onClear = vi.fn();
    const onRemoveCard = vi.fn();

    render(
      <ComparisonDrawer
        selectedCards={mockCards}
        onClear={onClear}
        onRemoveCard={onRemoveCard}
      />
    );

    const clearButton = screen.getByRole('button', { name: /Clear|清空/i });
    fireEvent.click(clearButton);

    expect(onClear).toHaveBeenCalled();
  });
});
