import Image from 'next/image';

import { cn, getPrimaryImageUrl } from '@/lib/utils';

interface CardHeroProps {
  imageUrl: string | null;
  cardName: string;
  setName: string;
  rarity: string | null;
  cardNumber: string | null;
}

const blurPlaceholder =
  'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22736%22 height=%221024%22 viewBox=%220 0 736 1024%22%3E%3Crect width=%22736%22 height=%221024%22 fill=%22%23f5f1ea%22/%3E%3C/svg%3E';

export function CardHero({ imageUrl, cardName, setName, rarity, cardNumber }: CardHeroProps) {
  const heroUrl = getPrimaryImageUrl(imageUrl);

  return (
    <section aria-labelledby="card-hero-heading" className="space-y-4">
      <div
        className={cn(
          'relative aspect-[2.5/3.5] w-full overflow-hidden rounded-2xl bg-[#f5f1ea]',
          'shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
        )}
      >
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt={`${cardName} image`}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 45vw, 40vw"
            priority
            placeholder="blur"
            blurDataURL={blurPlaceholder}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-secondary">暂无卡图</div>
        )}
      </div>

      <div className="space-y-2">
        <h1 id="card-hero-heading" className="text-2xl font-semibold text-text-primary">
          {cardName}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
          <span>{setName}</span>
          {rarity ? <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-text-primary">{rarity}</span> : null}
          {cardNumber ? (
            <span className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-text-secondary">#{cardNumber}</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
