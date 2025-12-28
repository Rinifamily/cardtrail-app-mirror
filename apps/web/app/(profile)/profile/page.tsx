import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  return (
    <section className="container mx-auto space-y-5 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">我的</h1>
        <p className="text-base-content/70">账户设置、偏好等功能即将上线。</p>
        <p className="text-base-content/60">敬请期待</p>
      </div>

      <div className="rounded-3xl border border-gray-200 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Watchlist · 价格提醒</p>
            <h2 className="text-lg font-semibold">本地关注列表</h2>
            <p className="text-sm text-muted-foreground">
              设置目标价并接收本地提醒。Phase 09 将自动迁移至云端。
            </p>
          </div>
          <Button asChild className="gap-2 rounded-full">
            <Link href="/profile/watchlist">
              打开关注列表
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
