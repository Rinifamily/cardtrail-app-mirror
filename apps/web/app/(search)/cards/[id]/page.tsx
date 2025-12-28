import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { CardCTABar } from '@/components/cards/CardCTABar';
import { CardHero } from '@/components/cards/CardHero';
import { PriceHistoryChart } from '@/components/cards/PriceHistoryChart';
import { PriceSnapshot } from '@/components/cards/PriceSnapshot';
import { RecentTransactions } from '@/components/cards/RecentTransactions';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase';

// Disable caching for card detail pages to always show fresh price data
export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface CardDetailPageProps {
  params: {
    id: string;
  };
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const cardId = Number(params.id);

  if (!Number.isInteger(cardId) || cardId <= 0) {
    notFound();
  }

  const supabase = createClient();

  const cardPromise = supabase
    .from('card_jp')
    .select('id, card_name, set_name, rarity, image_urls, card_index')
    .eq('id', cardId)
    .limit(1)
    .maybeSingle();

  const priceHistoryPromise = getPriceHistoryQuery(supabase, cardId);
  const transactionsPromise = getTransactionsQuery(supabase, cardId);

  const { data: card, error } = await cardPromise;

  if (error || !card) {
    console.error('[card-detail] failed to load card', { error, cardId });
    notFound();
  }

  return (
    <div className="bg-canvas">
      <div className="container mx-auto px-4 py-8 pb-32 md:pb-12">
        <div className="grid gap-8 md:grid-cols-2">
          <CardHero
            imageUrl={card.image_urls ?? null}
            cardName={card.card_name}
            setName={card.set_name}
            rarity={card.rarity}
            cardNumber={card.card_index}
          />

          <Suspense fallback={<PriceSnapshotSkeleton />}>
            <PriceSnapshotSection cardId={card.id} priceHistoryPromise={priceHistoryPromise} />
          </Suspense>
        </div>

        <Suspense fallback={<Skeleton className="mt-8 h-[360px] w-full rounded-2xl" />}>
          <PriceHistorySection cardId={card.id} priceHistoryPromise={priceHistoryPromise} />
        </Suspense>

        <Suspense fallback={<Skeleton className="mt-8 h-[320px] w-full rounded-2xl" />}>
          <RecentTransactionsSection transactionsPromise={transactionsPromise} />
        </Suspense>
      </div>

      <CardCTABar cardId={card.id} cardName={card.card_name} />
    </div>
  );
}

async function PriceSnapshotSection({
  priceHistoryPromise,
  cardId,
}: {
  priceHistoryPromise: ReturnType<typeof getPriceHistoryQuery>;
  cardId: number;
}) {
  const { data, error } = await priceHistoryPromise;

  if (error) {
    console.error('[card-detail] price history error', error);
  }

  return <PriceSnapshot cardId={cardId} priceHistory={data ?? []} />;
}

async function PriceHistorySection({
  priceHistoryPromise,
  cardId,
}: {
  priceHistoryPromise: ReturnType<typeof getPriceHistoryQuery>;
  cardId: number;
}) {
  const { data, error } = await priceHistoryPromise;

  if (error) {
    console.error('[card-detail] price chart error', error);
  }

  return <PriceHistoryChart cardId={cardId} data={data ?? []} />;
}

async function RecentTransactionsSection({
  transactionsPromise,
}: {
  transactionsPromise: ReturnType<typeof getTransactionsQuery>;
}) {
  const { data, error } = await transactionsPromise;

  if (error) {
    console.error('[card-detail] transactions error', error);
  }

  return <RecentTransactions transactions={data ?? []} />;
}

function getPriceHistoryQuery(client: ReturnType<typeof createClient>, cardId: number) {
  return client
    .from('price_history')
    .select('date, price_raw, price_psa9, price_psa10, volume')
    .eq('card_id', cardId)
    .order('date', { ascending: true })
    .limit(180)
    .then((response) => response);
}

function getTransactionsQuery(client: ReturnType<typeof createClient>, cardId: number) {
  return client
    .from('transactions')
    .select('sold_date, price, currency, grade, grading_company, condition, seller')
    .eq('card_id', cardId)
    .order('sold_date', { ascending: false })
    .limit(10)
    .then((response) => response);
}

function PriceSnapshotSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-surface p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
