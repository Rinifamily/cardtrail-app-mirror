import Image from "next/image";
import { fetchSampleCards } from "@/lib/supabase";
import { getPrimaryImageUrl } from "@/lib/utils";

export const dynamic = 'force-dynamic'; // 强制动态渲染，跳过构建时预渲染

export default async function TestPage() {
  try {
    const cards = await fetchSampleCards(10);

    return (
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-base-content/70">
            CardTrail
          </p>
          <h1 className="text-2xl font-bold">数据库连接测试</h1>
          <p className="text-base-content/70">
            连接成功 - 已加载 {cards.length} 张日文卡牌
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {cards.map((card) => {
            const cover = getPrimaryImageUrl(card.image_urls);
            return (
              <div
                key={card.id}
                className="card bg-base-100 shadow-md transition hover:-translate-y-0.5"
              >
                <figure className="overflow-hidden rounded-xl bg-base-200">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={card.card_name}
                      width={320}
                      height={448}
                      className="h-auto w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center text-sm text-base-content/60">
                      无图片
                    </div>
                  )}
                </figure>
                <div className="card-body gap-2 p-3">
                  <h3 className="card-title text-sm font-semibold leading-snug">
                    {card.card_name}
                  </h3>
                  <p className="text-xs text-base-content/60">{card.set_name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="container mx-auto space-y-3 px-4 py-8">
        <h1 className="text-2xl font-bold text-error">数据库错误</h1>
        <p className="text-base-content/70">
          {(error as Error).message || "无法获取卡牌数据，请检查数据库配置"}
        </p>
      </div>
    );
  }
}
