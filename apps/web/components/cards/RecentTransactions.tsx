import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

// Static exchange rate: USD to CNY
const USD_TO_CNY_RATE = 7.25;

interface Transaction {
  sold_date: string | null;
  price: number;
  currency: string;
  grade: string | null;
  grading_company: string | null;
  condition: string | null;
  seller: string | null;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (!transactions.length) {
    return (
      <Card className="mt-8 rounded-2xl border-0 bg-surface p-6 text-center text-text-secondary shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <p className="text-sm font-medium">暂无成交记录</p>
        <p className="text-xs mt-1">成为第一位记录该卡牌行情的收藏家</p>
      </Card>
    );
  }

  return (
    <Card
      role="region"
      aria-label="近期成交列表"
      className="mt-8 rounded-2xl border-0 bg-surface p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">近期成交</h2>
        <p className="text-xs text-text-secondary">最近 10 笔</p>
      </div>

      <div role="table" className="mt-6 divide-y divide-gray-100">
        {transactions.slice(0, 10).map((tx, index) => (
          <div
            key={`${tx.sold_date ?? 'unknown'}-${index}`}
            role="row"
            className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between"
          >
            <div role="cell" className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {tx.grade && tx.grading_company ? (
                  <Badge variant={resolveBadgeVariant(tx.grade)}>
                    {tx.grading_company} {tx.grade}
                  </Badge>
                ) : null}
                {tx.condition ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-text-secondary">{tx.condition}</span>
                ) : null}
              </div>
              <div className="text-sm text-text-secondary">
                {formatDate(tx.sold_date)}
                {tx.seller ? <span className="ml-2 text-text-secondary/80">· {tx.seller}</span> : null}
              </div>
            </div>
            <div role="cell" className="text-right text-base font-semibold text-text-primary">
              {(() => {
                // Convert USD to CNY for display
                const displayPrice = tx.currency === 'USD' ? tx.price * USD_TO_CNY_RATE : tx.price;
                const displayCurrency = tx.currency === 'USD' ? 'CNY' : tx.currency;
                return formatCurrency(displayPrice, displayCurrency);
              })()}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return '--';
  }
  try {
    return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

function resolveBadgeVariant(grade: string) {
  if (grade.includes('10')) return 'info' as const;
  if (grade.includes('9')) return 'warning' as const;
  return 'secondary' as const;
}
