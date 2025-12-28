interface RankBadgeProps {
  rank: number;
}

export function RankBadge({ rank }: RankBadgeProps) {
  const badgeStyles = {
    1: 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg',
    2: 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md',
    3: 'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-md',
  };

  const style = badgeStyles[rank as keyof typeof badgeStyles] || 'bg-muted text-muted-foreground';

  return (
    <div
      className={`
        flex items-center justify-center
        w-10 h-10 rounded-full font-bold text-sm
        ${style}
      `}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </div>
  );
}
