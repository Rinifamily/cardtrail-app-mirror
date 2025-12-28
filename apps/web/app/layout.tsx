import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import { cn } from "@/lib/utils";
import { BottomNav, DesktopNav } from "@/components/layout/BottomNav";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { WatchlistDrawerProvider } from "@/components/watchlist/WatchlistDrawerProvider";
import "./globals.css";

const notoSans = Noto_Sans_SC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CardTrail 卡迹",
  description:
    "CardTrail 卡迹帮助中国口袋妖怪卡牌收藏者追踪价格、管理持仓并实时监控市场。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={cn("bg-background text-foreground antialiased", notoSans.variable)}>
        <QueryProvider>
          <WatchlistDrawerProvider>
            <DesktopNav />
            <main className="min-h-screen pb-20 pt-4 md:pb-0 md:pt-6">{children}</main>
            <BottomNav />
          </WatchlistDrawerProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
