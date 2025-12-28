import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankBadge } from '@/components/rankings/RankBadge';

describe('RankBadge', () => {
  it('should render rank number', () => {
    render(<RankBadge rank={1} />);
    expect(screen.getByLabelText('Rank 1')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should apply gold gradient for rank 1', () => {
    const { container } = render(<RankBadge rank={1} />);
    const badge = container.querySelector('[aria-label="Rank 1"]');
    expect(badge?.className).toContain('from-yellow-400');
    expect(badge?.className).toContain('to-yellow-600');
  });

  it('should apply silver gradient for rank 2', () => {
    const { container } = render(<RankBadge rank={2} />);
    const badge = container.querySelector('[aria-label="Rank 2"]');
    expect(badge?.className).toContain('from-gray-300');
    expect(badge?.className).toContain('to-gray-500');
  });

  it('should apply bronze gradient for rank 3', () => {
    const { container } = render(<RankBadge rank={3} />);
    const badge = container.querySelector('[aria-label="Rank 3"]');
    expect(badge?.className).toContain('from-amber-600');
    expect(badge?.className).toContain('to-amber-800');
  });

  it('should apply default styling for ranks > 3', () => {
    const { container } = render(<RankBadge rank={10} />);
    const badge = container.querySelector('[aria-label="Rank 10"]');
    expect(badge?.className).toContain('bg-muted');
    expect(badge?.className).not.toContain('gradient');
  });
});
