# CardTrail Internationalization (i18n)

**Document Version:** 1.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - Ready for Implementation  
**Owner:** Development Team  
**Related Docs:** [Frontend Architecture](frontend-architecture.md), [Backend Architecture](backend-architecture.md), [Feature Breakdown](feature-breakdown.md)

---

## 📖 Overview

This document defines the comprehensive internationalization (i18n) strategy for CardTrail, a Pokemon TCG price tracking application. While primarily targeting the Chinese market, CardTrail will support multiple languages to serve global collectors and ensure the Japanese card names are displayed accurately.

### i18n Philosophy

**Chinese-First, Global-Ready**

Our i18n approach:
1. **Chinese is Primary**: UI designed for Chinese characters first
2. **Graceful Degradation**: English fallback when translations missing
3. **Preserve Authenticity**: Card names in original language (Japanese) with translations
4. **Locale-Specific Formatting**: Dates, numbers, currency adapted to each region
5. **SEO Optimized**: Separate URLs for each language

### Why i18n Matters for CardTrail

1. **Target Market**: Primary audience is Chinese collectors
2. **Global Expansion**: English/Japanese support enables international growth
3. **Card Authenticity**: Pokemon cards have official names in multiple languages
4. **User Experience**: Users expect UI in their native language
5. **SEO**: Better search rankings in each region (Baidu, Google)

---

## 🎯 Supported Languages

### Priority Matrix

```
Language           Priority   Coverage         Launch Phase   Users %
──────────────────────────────────────────────────────────────────────
简体中文 (zh-CN)     P0        100% (UI + content)    MVP (Phase 2)    70%
English (en)        P1        100% (UI + content)    MVP (Phase 2)    20%
日本語 (ja)          P2        50% (card names only)  Phase 3          5%
繁體中文 (zh-TW)     P3        100% (UI + content)    Phase 4          5%
```

### Language Details

#### 1. 简体中文 (Simplified Chinese)

**Target Users:** Mainland China collectors
**Why First:** Primary target market (70%+ users)
**Characteristics:**
- Simplified Chinese characters
- RMB (¥) currency
- Chinese date format: 2024年12月4日
- Chinese number format: 1,234.56 (comma separator)

#### 2. English

**Target Users:** International collectors, expatriates in China
**Why Second:** Global language, fallback option (20% users)
**Characteristics:**
- Latin alphabet
- Multiple currencies (USD, EUR, GBP)
- Date format: December 4, 2024 or 12/4/2024
- Number format: 1,234.56

#### 3. 日本語 (Japanese)

**Target Users:** Japanese collectors, Pokemon enthusiasts
**Why Third:** Original Pokemon TCG language (5% users)
**Characteristics:**
- Japanese characters (Hiragana, Katakana, Kanji)
- JPY (¥) currency
- Date format: 2024年12月4日
- Number format: 1,234.56

#### 4. 繁體中文 (Traditional Chinese)

**Target Users:** Taiwan, Hong Kong, Macau collectors
**Why Fourth:** Regional variant (5% users)
**Characteristics:**
- Traditional Chinese characters
- TWD, HKD currencies
- Similar date format to Simplified Chinese

---

## 🏗️ Technical Implementation

### i18n Library: next-intl

**Why next-intl?**
- ✅ Built for Next.js App Router
- ✅ Type-safe translations
- ✅ Server and client components support
- ✅ Automatic language detection
- ✅ Namespace support (organize translations)
- ✅ Pluralization and formatting
- ✅ Lightweight bundle size (< 5KB)

**Installation:**

```bash
pnpm add next-intl
```

### Project Structure

```
apps/web/
├── i18n/
│   ├── config.ts                      # i18n configuration
│   ├── request.ts                     # Middleware integration
│   └── messages/
│       ├── zh-CN/
│       │   ├── common.json           # 通用文本
│       │   ├── navigation.json       # 导航菜单
│       │   ├── search.json           # 搜索功能
│       │   ├── collection.json       # 收藏功能
│       │   ├── card.json             # 卡牌详情
│       │   ├── market.json           # 市场大盘
│       │   ├── auth.json             # 认证登录
│       │   ├── profile.json          # 用户档案
│       │   └── errors.json           # 错误信息
│       ├── en/
│       │   ├── common.json           # Common text
│       │   ├── navigation.json       # Navigation menu
│       │   ├── search.json           # Search features
│       │   ├── collection.json       # Collection features
│       │   ├── card.json             # Card details
│       │   ├── market.json           # Market dashboard
│       │   ├── auth.json             # Authentication
│       │   ├── profile.json          # User profile
│       │   └── errors.json           # Error messages
│       └── ja/
│           └── cards.json            # カード名のみ (card names only)
│
├── app/
│   └── [locale]/                      # Locale-based routing
│       ├── layout.tsx
│       ├── page.tsx
│       ├── search/
│       │   ├── page.tsx
│       │   └── cards/
│       │       └── [id]/
│       │           └── page.tsx
│       ├── collection/
│       │   └── page.tsx
│       ├── market/
│       │   └── page.tsx
│       └── profile/
│           └── page.tsx
│
└── middleware.ts                      # Language detection
```

### Configuration

```typescript
// i18n/config.ts
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['zh-CN', 'en', 'ja', 'zh-TW'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh-CN';

export const localeNames: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'en': 'English',
  'ja': '日本語',
  'zh-TW': '繁體中文',
};

export default getRequestConfig(async ({ locale }) => {
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  return {
    messages: (await import(`./messages/${locale}/common.json`)).default,
    timeZone: locale === 'zh-CN' ? 'Asia/Shanghai' : 'UTC',
    now: new Date(),
  };
});
```

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always', // Always include locale in URL
});

export const config = {
  matcher: ['/', '/(zh-CN|en|ja|zh-TW)/:path*'],
};
```

### Layout with i18n

```typescript
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validate locale
  if (!locales.includes(locale as any)) {
    notFound();
  }
  
  // Load messages
  const messages = await getMessages();
  
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

---

## 🏗️ Translation Files

### Common Translations

```json
// i18n/messages/zh-CN/common.json
{
  "appName": "卡迹",
  "appDescription": "宝可梦TCG价格追踪",
  
  "actions": {
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑",
    "confirm": "确认",
    "search": "搜索",
    "filter": "筛选",
    "sort": "排序",
    "export": "导出",
    "import": "导入"
  },
  
  "common": {
    "loading": "加载中...",
    "error": "错误",
    "success": "成功",
    "empty": "暂无数据",
    "notFound": "未找到",
    "comingSoon": "即将推出"
  },
  
  "currency": {
    "CNY": "人民币",
    "USD": "美元",
    "JPY": "日元",
    "symbol": {
      "CNY": "¥",
      "USD": "$",
      "JPY": "¥"
    }
  },
  
  "time": {
    "today": "今天",
    "yesterday": "昨天",
    "thisWeek": "本周",
    "thisMonth": "本月",
    "thisYear": "今年",
    "justNow": "刚刚",
    "minutesAgo": "{minutes}分钟前",
    "hoursAgo": "{hours}小时前",
    "daysAgo": "{days}天前"
  }
}
```

```json
// i18n/messages/en/common.json
{
  "appName": "CardTrail",
  "appDescription": "Pokemon TCG Price Tracker",
  
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "confirm": "Confirm",
    "search": "Search",
    "filter": "Filter",
    "sort": "Sort",
    "export": "Export",
    "import": "Import"
  },
  
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "empty": "No data",
    "notFound": "Not found",
    "comingSoon": "Coming soon"
  },
  
  "currency": {
    "CNY": "Chinese Yuan",
    "USD": "US Dollar",
    "JPY": "Japanese Yen",
    "symbol": {
      "CNY": "¥",
      "USD": "$",
      "JPY": "¥"
    }
  },
  
  "time": {
    "today": "Today",
    "yesterday": "Yesterday",
    "thisWeek": "This week",
    "thisMonth": "This month",
    "thisYear": "This year",
    "justNow": "Just now",
    "minutesAgo": "{minutes} minutes ago",
    "hoursAgo": "{hours} hours ago",
    "daysAgo": "{days} days ago"
  }
}
```

### Search Translations

```json
// i18n/messages/zh-CN/search.json
{
  "title": "搜索卡牌",
  "description": "搜索 28,000+ 张宝可梦卡牌",
  "placeholder": "输入卡牌名称或编号",
  
  "filters": {
    "title": "筛选条件",
    "language": "语言",
    "rarity": "稀有度",
    "set": "系列",
    "type": "类型",
    "priceRange": "价格区间",
    "reset": "重置筛选"
  },
  
  "sort": {
    "title": "排序方式",
    "nameAsc": "名称 (A-Z)",
    "nameDesc": "名称 (Z-A)",
    "priceAsc": "价格 (低到高)",
    "priceDesc": "价格 (高到低)",
    "popularityDesc": "热度 (高到低)"
  },
  
  "results": {
    "found": "找到 {count} 张卡牌",
    "none": "未找到卡牌",
    "showing": "显示 {start}-{end} 共 {total} 张"
  },
  
  "hotSearches": {
    "title": "热门搜索",
    "recent": "最近搜索"
  }
}
```

```json
// i18n/messages/en/search.json
{
  "title": "Search Cards",
  "description": "Search 28,000+ Pokemon cards",
  "placeholder": "Enter card name or number",
  
  "filters": {
    "title": "Filters",
    "language": "Language",
    "rarity": "Rarity",
    "set": "Set",
    "type": "Type",
    "priceRange": "Price Range",
    "reset": "Reset Filters"
  },
  
  "sort": {
    "title": "Sort By",
    "nameAsc": "Name (A-Z)",
    "nameDesc": "Name (Z-A)",
    "priceAsc": "Price (Low to High)",
    "priceDesc": "Price (High to Low)",
    "popularityDesc": "Popularity (High to Low)"
  },
  
  "results": {
    "found": "Found {count} cards",
    "none": "No cards found",
    "showing": "Showing {start}-{end} of {total}"
  },
  
  "hotSearches": {
    "title": "Hot Searches",
    "recent": "Recent Searches"
  }
}
```

### Collection Translations

```json
// i18n/messages/zh-CN/collection.json
{
  "title": "我的收藏",
  "subtitle": "管理你的宝可梦卡牌收藏",
  
  "portfolio": {
    "title": "投资组合概览",
    "totalInvested": "总投入",
    "currentValue": "当前价值",
    "profitLoss": "盈亏",
    "roi": "投资回报率",
    "totalCards": "总卡牌数",
    "totalQuantity": "总数量"
  },
  
  "addModal": {
    "title": "添加到收藏",
    "card": "卡牌",
    "quantity": "数量",
    "quantityPlaceholder": "输入数量",
    "purchasePrice": "购入价格",
    "pricePlaceholder": "输入价格",
    "currency": "货币",
    "purchaseDate": "购入日期",
    "grading": "评级",
    "gradingCompany": "评级公司",
    "grade": "分数",
    "certNumber": "证书号",
    "storage": "存放位置",
    "storagePlaceholder": "例如：书柜第2层",
    "notes": "备注",
    "notesPlaceholder": "添加备注信息",
    "submit": "添加到收藏",
    "cancel": "取消"
  },
  
  "editModal": {
    "title": "编辑收藏",
    "submit": "保存更改"
  },
  
  "deleteDialog": {
    "title": "删除确认",
    "message": "确定要从收藏中移除此卡牌吗？",
    "confirm": "确认删除",
    "cancel": "取消"
  },
  
  "list": {
    "sortBy": "排序方式",
    "sortOptions": {
      "dateDesc": "添加时间（新到旧）",
      "dateAsc": "添加时间（旧到新）",
      "profitDesc": "盈亏（高到低）",
      "profitAsc": "盈亏（低到高）",
      "nameAsc": "名称（A-Z）",
      "nameDesc": "名称（Z-A）"
    },
    "filterBy": "筛选",
    "filterOptions": {
      "all": "全部",
      "profitable": "盈利中",
      "losing": "亏损中",
      "graded": "已评级",
      "raw": "原卡"
    }
  },
  
  "item": {
    "quantity": "数量：×{count}",
    "purchased": "购于 {date}",
    "purchasePrice": "购入价：{price}",
    "currentPrice": "当前价：{price}",
    "profitLoss": "盈亏：{amount}",
    "profitPercent": "{percent}%",
    "grade": "{company} {grade}",
    "actions": {
      "edit": "编辑",
      "delete": "删除",
      "viewCard": "查看详情"
    }
  },
  
  "analytics": {
    "title": "收藏分析",
    "distribution": {
      "byRarity": "按稀有度分布",
      "bySet": "按系列分布",
      "byGrade": "按评级分布",
      "byYear": "按年份分布"
    },
    "topHoldings": "最高持仓",
    "topMovers": "最大涨跌",
    "recentActivity": "最近活动"
  },
  
  "export": {
    "button": "导出",
    "format": "格式",
    "csv": "CSV 表格",
    "json": "JSON 数据",
    "exporting": "导出中...",
    "success": "导出成功"
  },
  
  "empty": {
    "title": "你还没有收藏",
    "description": "开始添加卡牌来追踪你的投资组合",
    "action": "搜索卡牌"
  },
  
  "toast": {
    "added": "已添加到收藏",
    "updated": "收藏已更新",
    "deleted": "已从收藏中移除",
    "error": "操作失败，请重试"
  }
}
```

```json
// i18n/messages/en/collection.json
{
  "title": "My Collection",
  "subtitle": "Manage your Pokemon TCG collection",
  
  "portfolio": {
    "title": "Portfolio Overview",
    "totalInvested": "Total Invested",
    "currentValue": "Current Value",
    "profitLoss": "Profit/Loss",
    "roi": "ROI",
    "totalCards": "Total Cards",
    "totalQuantity": "Total Quantity"
  },
  
  "addModal": {
    "title": "Add to Collection",
    "card": "Card",
    "quantity": "Quantity",
    "quantityPlaceholder": "Enter quantity",
    "purchasePrice": "Purchase Price",
    "pricePlaceholder": "Enter price",
    "currency": "Currency",
    "purchaseDate": "Purchase Date",
    "grading": "Grading",
    "gradingCompany": "Grading Company",
    "grade": "Grade",
    "certNumber": "Certification Number",
    "storage": "Storage Location",
    "storagePlaceholder": "e.g., Shelf 2",
    "notes": "Notes",
    "notesPlaceholder": "Add notes",
    "submit": "Add to Collection",
    "cancel": "Cancel"
  },
  
  "editModal": {
    "title": "Edit Collection",
    "submit": "Save Changes"
  },
  
  "deleteDialog": {
    "title": "Confirm Deletion",
    "message": "Are you sure you want to remove this card from your collection?",
    "confirm": "Delete",
    "cancel": "Cancel"
  },
  
  "list": {
    "sortBy": "Sort By",
    "sortOptions": {
      "dateDesc": "Date Added (Newest)",
      "dateAsc": "Date Added (Oldest)",
      "profitDesc": "Profit/Loss (High to Low)",
      "profitAsc": "Profit/Loss (Low to High)",
      "nameAsc": "Name (A-Z)",
      "nameDesc": "Name (Z-A)"
    },
    "filterBy": "Filter",
    "filterOptions": {
      "all": "All",
      "profitable": "Profitable",
      "losing": "Losing",
      "graded": "Graded",
      "raw": "Raw"
    }
  },
  
  "item": {
    "quantity": "Qty: ×{count}",
    "purchased": "Purchased {date}",
    "purchasePrice": "Purchase: {price}",
    "currentPrice": "Current: {price}",
    "profitLoss": "P/L: {amount}",
    "profitPercent": "{percent}%",
    "grade": "{company} {grade}",
    "actions": {
      "edit": "Edit",
      "delete": "Delete",
      "viewCard": "View Details"
    }
  },
  
  "analytics": {
    "title": "Collection Analytics",
    "distribution": {
      "byRarity": "By Rarity",
      "bySet": "By Set",
      "byGrade": "By Grade",
      "byYear": "By Year"
    },
    "topHoldings": "Top Holdings",
    "topMovers": "Biggest Movers",
    "recentActivity": "Recent Activity"
  },
  
  "export": {
    "button": "Export",
    "format": "Format",
    "csv": "CSV Spreadsheet",
    "json": "JSON Data",
    "exporting": "Exporting...",
    "success": "Export successful"
  },
  
  "empty": {
    "title": "No cards in collection",
    "description": "Start adding cards to track your portfolio",
    "action": "Search Cards"
  },
  
  "toast": {
    "added": "Added to collection",
    "updated": "Collection updated",
    "deleted": "Removed from collection",
    "error": "Operation failed, please try again"
  }
}
```

### Market Dashboard Translations

```json
// i18n/messages/zh-CN/market.json
{
  "title": "市场大盘",
  "subtitle": "宝可梦TCG市场行情",
  
  "cti": {
    "title": "CT指数 (CTI)",
    "value": "指数",
    "change": "涨跌",
    "changePercent": "涨跌幅",
    "volume": "成交量",
    "updatedAt": "更新于 {time}"
  },
  
  "chart": {
    "title": "K线图",
    "period": {
      "1D": "1日",
      "1W": "1周",
      "1M": "1月",
      "3M": "3月",
      "6M": "6月",
      "1Y": "1年",
      "ALL": "全部"
    },
    "indicators": {
      "ma5": "5日均线",
      "ma20": "20日均线",
      "volume": "成交量"
    },
    "tooltip": {
      "date": "日期",
      "open": "开盘",
      "high": "最高",
      "low": "最低",
      "close": "收盘",
      "change": "涨跌"
    }
  },
  
  "subIndices": {
    "title": "分类指数",
    "wotc": "WOTC 经典",
    "modern": "现代卡牌",
    "japanese": "日版卡牌",
    "english": "英版卡牌",
    "viewDetails": "查看详情"
  },
  
  "news": {
    "title": "市场动态",
    "readMore": "阅读更多",
    "source": "来源",
    "publishedAt": "发布于 {date}"
  },
  
  "sentiment": {
    "title": "市场情绪",
    "bullish": "看涨",
    "bearish": "看跌",
    "neutral": "中性",
    "confidence": "置信度：{percent}%"
  }
}
```

```json
// i18n/messages/en/market.json
{
  "title": "Market Dashboard",
  "subtitle": "Pokemon TCG Market Overview",
  
  "cti": {
    "title": "CardTrail Index (CTI)",
    "value": "Index",
    "change": "Change",
    "changePercent": "Change %",
    "volume": "Volume",
    "updatedAt": "Updated {time}"
  },
  
  "chart": {
    "title": "Price Chart",
    "period": {
      "1D": "1D",
      "1W": "1W",
      "1M": "1M",
      "3M": "3M",
      "6M": "6M",
      "1Y": "1Y",
      "ALL": "ALL"
    },
    "indicators": {
      "ma5": "5-Day MA",
      "ma20": "20-Day MA",
      "volume": "Volume"
    },
    "tooltip": {
      "date": "Date",
      "open": "Open",
      "high": "High",
      "low": "Low",
      "close": "Close",
      "change": "Change"
    }
  },
  
  "subIndices": {
    "title": "Sub-Indices",
    "wotc": "WOTC Vintage",
    "modern": "Modern Cards",
    "japanese": "Japanese Cards",
    "english": "English Cards",
    "viewDetails": "View Details"
  },
  
  "news": {
    "title": "Market News",
    "readMore": "Read More",
    "source": "Source",
    "publishedAt": "Published {date}"
  },
  
  "sentiment": {
    "title": "Market Sentiment",
    "bullish": "Bullish",
    "bearish": "Bearish",
    "neutral": "Neutral",
    "confidence": "Confidence: {percent}%"
  }
}
```

### Error Messages Translations

```json
// i18n/messages/zh-CN/errors.json
{
  "generic": {
    "title": "出错了",
    "message": "发生了意外错误，请重试",
    "retry": "重试",
    "goHome": "返回首页"
  },
  
  "network": {
    "title": "网络错误",
    "offline": "无网络连接，请检查网络设置",
    "timeout": "请求超时，请检查网络连接",
    "serverError": "服务器错误，请稍后重试"
  },
  
  "auth": {
    "unauthorized": "请先登录",
    "forbidden": "无权限访问",
    "invalidCredentials": "邮箱或密码错误",
    "emailInUse": "该邮箱已被注册",
    "weakPassword": "密码至少需要8个字符，包含大小写字母和数字",
    "sessionExpired": "登录已过期，请重新登录"
  },
  
  "validation": {
    "required": "{field} 为必填项",
    "invalid": "{field} 格式不正确",
    "tooShort": "{field} 至少需要 {min} 个字符",
    "tooLong": "{field} 不能超过 {max} 个字符",
    "min": "{field} 最小值为 {min}",
    "max": "{field} 最大值为 {max}",
    "email": "请输入有效的邮箱地址",
    "url": "请输入有效的网址"
  },
  
  "api": {
    "notFound": "未找到请求的资源",
    "rateLimitExceeded": "请求过于频繁，请稍后再试",
    "badRequest": "请求参数不正确",
    "serverError": "服务器内部错误"
  },
  
  "card": {
    "notFound": "未找到该卡牌",
    "loadFailed": "加载卡牌信息失败",
    "priceUnavailable": "暂无价格数据"
  },
  
  "collection": {
    "addFailed": "添加到收藏失败",
    "updateFailed": "更新收藏失败",
    "deleteFailed": "删除收藏失败",
    "loadFailed": "加载收藏失败",
    "duplicateCard": "该卡牌已在收藏中"
  }
}
```

```json
// i18n/messages/en/errors.json
{
  "generic": {
    "title": "Something went wrong",
    "message": "An unexpected error occurred, please try again",
    "retry": "Retry",
    "goHome": "Go to Homepage"
  },
  
  "network": {
    "title": "Network Error",
    "offline": "No internet connection, please check your network",
    "timeout": "Request timed out, please check your connection",
    "serverError": "Server error, please try again later"
  },
  
  "auth": {
    "unauthorized": "Please log in first",
    "forbidden": "Access denied",
    "invalidCredentials": "Invalid email or password",
    "emailInUse": "Email already in use",
    "weakPassword": "Password must be at least 8 characters with uppercase, lowercase, and number",
    "sessionExpired": "Session expired, please log in again"
  },
  
  "validation": {
    "required": "{field} is required",
    "invalid": "{field} is invalid",
    "tooShort": "{field} must be at least {min} characters",
    "tooLong": "{field} cannot exceed {max} characters",
    "min": "{field} minimum value is {min}",
    "max": "{field} maximum value is {max}",
    "email": "Please enter a valid email address",
    "url": "Please enter a valid URL"
  },
  
  "api": {
    "notFound": "Resource not found",
    "rateLimitExceeded": "Too many requests, please try again later",
    "badRequest": "Invalid request parameters",
    "serverError": "Internal server error"
  },
  
  "card": {
    "notFound": "Card not found",
    "loadFailed": "Failed to load card information",
    "priceUnavailable": "Price data unavailable"
  },
  
  "collection": {
    "addFailed": "Failed to add to collection",
    "updateFailed": "Failed to update collection",
    "deleteFailed": "Failed to delete from collection",
    "loadFailed": "Failed to load collection",
    "duplicateCard": "Card already in collection"
  }
}
```

### Card Profile Translations

```json
// i18n/messages/zh-CN/card.json
{
  "title": "卡牌详情",
  
  "price": {
    "ctPrice": "CT 价格",
    "currentPrice": "当前价格",
    "basedOn": "基于 {count} 笔交易",
    "updated": "更新于 {date}",
    "confidence": {
      "high": "高置信度",
      "medium": "中等置信度",
      "low": "低置信度"
    }
  },
  
  "grading": {
    "raw": "原卡",
    "psa8": "PSA 8",
    "psa9": "PSA 9",
    "psa10": "PSA 10"
  },
  
  "chart": {
    "title": "价格走势",
    "period": {
      "1W": "1周",
      "1M": "1月",
      "3M": "3月",
      "6M": "6月",
      "1Y": "1年",
      "ALL": "全部"
    },
    "change": {
      "up": "上涨 {percent}%",
      "down": "下跌 {percent}%",
      "stable": "持平"
    }
  },
  
  "details": {
    "title": "卡牌信息",
    "name": "名称",
    "number": "编号",
    "set": "系列",
    "rarity": "稀有度",
    "type": "类型",
    "hp": "体力",
    "released": "发行日期"
  },
  
  "actions": {
    "addToCollection": "加入持仓",
    "addToWatchlist": "加入关注",
    "share": "分享",
    "report": "报告错误"
  },
  
  "salesHistory": {
    "title": "近期成交",
    "date": "日期",
    "price": "价格",
    "grade": "品相",
    "platform": "平台"
  }
}
```

```json
// i18n/messages/en/card.json
{
  "title": "Card Details",
  
  "price": {
    "ctPrice": "CT Price",
    "currentPrice": "Current Price",
    "basedOn": "Based on {count} sales",
    "updated": "Updated {date}",
    "confidence": {
      "high": "High Confidence",
      "medium": "Medium Confidence",
      "low": "Low Confidence"
    }
  },
  
  "grading": {
    "raw": "Raw",
    "psa8": "PSA 8",
    "psa9": "PSA 9",
    "psa10": "PSA 10"
  },
  
  "chart": {
    "title": "Price Trend",
    "period": {
      "1W": "1 Week",
      "1M": "1 Month",
      "3M": "3 Months",
      "6M": "6 Months",
      "1Y": "1 Year",
      "ALL": "All Time"
    },
    "change": {
      "up": "Up {percent}%",
      "down": "Down {percent}%",
      "stable": "Stable"
    }
  },
  
  "details": {
    "title": "Card Information",
    "name": "Name",
    "number": "Number",
    "set": "Set",
    "rarity": "Rarity",
    "type": "Type",
    "hp": "HP",
    "released": "Released"
  },
  
  "actions": {
    "addToCollection": "Add to Collection",
    "addToWatchlist": "Add to Watchlist",
    "share": "Share",
    "report": "Report Error"
  },
  
  "salesHistory": {
    "title": "Recent Sales",
    "date": "Date",
    "price": "Price",
    "grade": "Grade",
    "platform": "Platform"
  }
}
```

---

## 🏗️ Using Translations

### Server Components

```typescript
// app/[locale]/search/page.tsx
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

// For metadata
export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'search' });
  
  return {
    title: t('title'),
    description: t('description'),
  };
}

// For component
export default function SearchPage() {
  const t = useTranslations('search');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      
      <input 
        placeholder={t('placeholder')}
        aria-label={t('title')}
      />
      
      <p>{t('results.found', { count: 150 })}</p>
    </div>
  );
}
```

### Client Components

```typescript
// components/SearchBar.tsx
'use client';

import { useTranslations } from 'next-intl';

export function SearchBar() {
  const t = useTranslations('search');
  const [query, setQuery] = useState('');
  
  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('placeholder')}
      />
      <button>{t('actions.search', { ns: 'common' })}</button>
    </div>
  );
}
```

### With Pluralization

```typescript
const t = useTranslations('search');

// Handles singular/plural automatically
t('results.found', { count: 1 });   // "找到 1 张卡牌"
t('results.found', { count: 10 });  // "找到 10 张卡牌"
```

### With Rich Text

```json
{
  "welcome": "Welcome <b>{username}</b>!"
}
```

```typescript
import { useTranslations } from 'next-intl';

const t = useTranslations('profile');

<p>
  {t.rich('welcome', {
    username: user.name,
    b: (chunks) => <strong>{chunks}</strong>
  })}
</p>
```

---

## 🏗️ Card Name Translation

### Card Data Model

```typescript
// packages/shared-types/src/domain.ts
export interface Card {
  id: number;
  
  // Card names in multiple languages
  name_en: string;        // Official English name
  name_ja: string;        // Official Japanese name
  name_zh: string;        // Translated Chinese name
  name_zh_tw?: string;    // Traditional Chinese (optional)
  
  // Card details
  number: string;
  set_id: number;
  rarity: string;
  
  // Display name based on locale (computed)
  displayName?: string;
}
```

### Database Schema

```sql
-- card_jp table remains unchanged (READ-ONLY)
-- Create card_translations table for additional language support

CREATE TABLE card_translations (
  card_id BIGINT PRIMARY KEY REFERENCES card_jp(id) ON DELETE CASCADE,
  
  -- English names
  name_en TEXT NOT NULL,
  
  -- Chinese names
  name_zh TEXT NOT NULL,
  name_zh_tw TEXT,
  
  -- Additional details translations
  type_en TEXT,
  type_zh TEXT,
  
  rarity_en TEXT,
  rarity_zh TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_card_translations_name_zh ON card_translations(name_zh);
CREATE INDEX idx_card_translations_name_en ON card_translations(name_en);
```

### Locale-Based Card Display

```typescript
// lib/card-utils.ts
import { useLocale } from 'next-intl';

export function useCardDisplayName(card: Card): string {
  const locale = useLocale();
  
  return getCardDisplayName(card, locale);
}

export function getCardDisplayName(card: Card, locale: string): string {
  switch (locale) {
    case 'zh-CN':
    case 'zh-TW':
      return card.name_zh || card.name_en;
    case 'ja':
      return card.name_ja || card.name_en;
    case 'en':
    default:
      return card.name_en;
  }
}

// Usage
export function CardDisplay({ card }: { card: Card }) {
  const displayName = useCardDisplayName(card);
  
  return (
    <div>
      <h2>{displayName}</h2>
      {/* Show original name if different */}
      {displayName !== card.name_ja && (
        <p className="text-sm text-gray-500">
          ({card.name_ja})
        </p>
      )}
    </div>
  );
}
```

---

## 🏗️ Locale-Specific Formatting

### Currency Formatting

```typescript
// lib/currency.ts
import { useLocale, useFormatter } from 'next-intl';

export function useCurrencyFormatter() {
  const locale = useLocale();
  const format = useFormatter();
  
  return (amount: number, currency: 'CNY' | 'USD' | 'JPY' = 'CNY') => {
    return format.number(amount, {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    });
  };
}

// Usage
export function PriceDisplay({ price, currency }: { price: number; currency: string }) {
  const formatCurrency = useCurrencyFormatter();
  
  return <span>{formatCurrency(price, currency)}</span>;
}

// Output examples:
// zh-CN: ¥123.45
// en-US: $123.45
// ja-JP: ¥12,345 (no decimals for JPY)
```

### Date Formatting

```typescript
// lib/date.ts
import { useFormatter } from 'next-intl';

export function useDateFormatter() {
  const format = useFormatter();
  
  return {
    // Short date
    short: (date: Date) => format.dateTime(date, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }),
    // zh-CN: 2024/12/4
    // en-US: 12/4/2024
    
    // Long date
    long: (date: Date) => format.dateTime(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    // zh-CN: 2024年12月4日
    // en-US: December 4, 2024
    
    // Relative time
    relative: (date: Date) => format.relativeTime(date),
    // zh-CN: 3天前
    // en-US: 3 days ago
  };
}
```

### Number Formatting

```typescript
// lib/number.ts
import { useFormatter, useLocale } from 'next-intl';

export function useNumberFormatter() {
  const format = useFormatter();
  const locale = useLocale();
  
  return {
    // Standard number
    number: (value: number) => format.number(value),
    // zh-CN: 1,234.56
    // en-US: 1,234.56
    
    // Compact (Chinese-specific)
    compact: (value: number) => {
      if (locale === 'zh-CN' || locale === 'zh-TW') {
        if (value >= 100000000) {
          return `${(value / 100000000).toFixed(1)}亿`;
        } else if (value >= 10000) {
          return `${(value / 10000).toFixed(1)}万`;
        }
      }
      
      return format.number(value, { notation: 'compact' });
    },
    // zh-CN: 1.5万, 2.3亿
    // en-US: 15K, 230M
    
    // Percentage
    percent: (value: number) => format.number(value, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }),
    // Output: 45.67%
  };
}
```

---

## 🏗️ Language Switcher

### Switcher Component

```typescript
// components/LanguageSwitcher.tsx
'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { locales, localeNames } from '@/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  
  const handleChange = (newLocale: string) => {
    // Replace locale in pathname
    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPathname = segments.join('/');
    
    router.push(newPathname);
  };
  
  return (
    <div className="relative">
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        className="px-3 py-2 border rounded-lg bg-white"
        aria-label="Select language"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Dropdown Switcher

```typescript
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { locales, localeNames } from '@/i18n/config';
import { ChevronDown } from 'lucide-react';

export function LanguageDropdown() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  const switchLanguage = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg"
      >
        <span>{localeNames[locale as keyof typeof localeNames]}</span>
        <ChevronDown size={16} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => switchLanguage(loc)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                locale === loc ? 'bg-blue-50 text-blue-600' : ''
              }`}
            >
              {localeNames[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🏗️ SEO & Routing

### Locale-Based URLs

```
https://cardtrail.com/zh-CN/search
https://cardtrail.com/zh-CN/search/cards/pikachu-base-25
https://cardtrail.com/en/search
https://cardtrail.com/en/search/cards/pikachu-base-25
https://cardtrail.com/ja/search
```

### hreflang Tags

```typescript
// app/[locale]/search/cards/[id]/page.tsx
export async function generateMetadata({ 
  params 
}: { 
  params: { locale: string; id: string } 
}) {
  const { locale, id } = params;
  const card = await getCard(parseInt(id));
  const displayName = getCardDisplayName(card, locale);
  
  return {
    title: `${displayName} - CardTrail`,
    description: `View ${displayName} price, history, and details.`,
    
    // hreflang tags for SEO
    alternates: {
      canonical: `/${locale}/search/cards/${id}`,
      languages: {
        'zh-CN': `/zh-CN/search/cards/${id}`,
        'en': `/en/search/cards/${id}`,
        'ja': `/ja/search/cards/${id}`,
        'zh-TW': `/zh-TW/search/cards/${id}`,
      },
    },
    
    openGraph: {
      title: displayName,
      description: `View ${displayName} price and history`,
      url: `/${locale}/search/cards/${id}`,
      locale: locale,
      alternateLocale: ['zh-CN', 'en', 'ja', 'zh-TW'],
    },
  };
}
```

### Sitemap Generation

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://cardtrail.com';
  
  // Get all card IDs
  const cards = await getPopularCards(1000);
  
  // Generate URLs for all locales
  const urls: MetadataRoute.Sitemap = [];
  
  for (const locale of locales) {
    // Homepage
    urls.push({
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: Object.fromEntries(
          locales.map(loc => [loc, `${baseUrl}/${loc}`])
        ),
      },
    });
    
    // Card pages
    for (const card of cards) {
      urls.push({
        url: `${baseUrl}/${locale}/search/cards/${card.id}`,
        lastModified: new Date(card.updated_at),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map(loc => [loc, `${baseUrl}/${loc}/search/cards/${card.id}`])
          ),
        },
      });
    }
  }
  
  return urls;
}
```

---

## 🏗️ Translation Workflow

### Process

```
1. Developer writes code with English keys
   ↓
2. Extract translatable strings
   ↓
3. Create zh-CN translations (primary)
   ↓
4. Create en translations
   ↓
5. (Optional) Use translation service (Crowdin, Lokalise)
   ↓
6. Native speaker review
   ↓
7. Commit translations
   ↓
8. Deploy
```

### Missing Translation Handling

```typescript
// i18n/config.ts
export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(`./messages/${locale}/common.json`)).default,
    
    // Fallback to English if translation missing
    onError: (error) => {
      if (error.code === 'MISSING_MESSAGE') {
        console.warn(`Missing translation: ${error.message}`);
        // Return English fallback
        return getTranslations({ locale: 'en', namespace: error.namespace });
      }
    },
  };
});
```

### Complete Translation Validation Script

```typescript
// scripts/validate-translations.ts
import fs from 'fs';
import path from 'path';
import { exit } from 'process';

interface TranslationObject {
  [key: string]: string | TranslationObject;
}

// Configuration
const LOCALES = ['zh-CN', 'en', 'ja'] as const;
const NAMESPACES = [
  'common',
  'navigation',
  'search',
  'card',
  'collection',
  'market',
  'auth',
  'profile',
  'errors',
] as const;
const MESSAGES_DIR = path.join(process.cwd(), 'i18n/messages');

/**
 * Flatten nested translation object to dot notation
 * { nav: { home: "Home" } } → { "nav.home": "Home" }
 */
function flattenObject(obj: TranslationObject, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      result.set(fullKey, value);
    } else if (typeof value === 'object' && value !== null) {
      const nested = flattenObject(value, fullKey);
      nested.forEach((v, k) => result.set(k, v));
    }
  }
  
  return result;
}

/**
 * Check for placeholder consistency
 * Verifies that {variables} in translations match across locales
 */
function validatePlaceholders(key: string, values: Map<string, string>): string[] {
  const errors: string[] = [];
  const placeholderRegex = /{(\w+)}/g;
  
  const placeholderSets = new Map<string, Set<string>>();
  
  for (const [locale, value] of values) {
    const placeholders = new Set<string>();
    let match;
    while ((match = placeholderRegex.exec(value)) !== null) {
      placeholders.add(match[1]);
    }
    placeholderSets.set(locale, placeholders);
  }
  
  // Compare placeholders across locales
  const referencePlaceholders = placeholderSets.get('en');
  if (!referencePlaceholders) return errors;
  
  for (const [locale, placeholders] of placeholderSets) {
    if (locale === 'en') continue;
    
    const missing = [...referencePlaceholders].filter(p => !placeholders.has(p));
    const extra = [...placeholders].filter(p => !referencePlaceholders.has(p));
    
    if (missing.length > 0) {
      errors.push(`${key}: ${locale} missing placeholders: {${missing.join(', ')}}`);
    }
    if (extra.length > 0) {
      errors.push(`${key}: ${locale} has extra placeholders: {${extra.join(', ')}}`);
    }
  }
  
  return errors;
}

/**
 * Main validation function
 */
function validateTranslations() {
  console.log('🔍 Validating translations...\n');
  
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalKeys = 0;
  
  // Track all keys per namespace
  const allKeys = new Map<string, Set<string>>();
  
  // First pass: collect all keys from English (reference locale)
  for (const namespace of NAMESPACES) {
    const enPath = path.join(MESSAGES_DIR, 'en', `${namespace}.json`);
    
    if (!fs.existsSync(enPath)) {
      errors.push(`❌ Missing English reference file: en/${namespace}.json`);
      continue;
    }
    
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    const enKeys = flattenObject(enContent);
    
    allKeys.set(namespace, new Set(enKeys.keys()));
    totalKeys += enKeys.size;
    
    console.log(`  ${namespace}.json: ${enKeys.size} keys`);
  }
  
  console.log(`\n📊 Total keys to validate: ${totalKeys}\n`);
  
  // Second pass: validate all locales against English
  for (const namespace of NAMESPACES) {
    const referenceKeys = allKeys.get(namespace);
    if (!referenceKeys) continue;
    
    console.log(`🔎 Checking ${namespace}.json...`);
    
    for (const locale of LOCALES) {
      const localePath = path.join(MESSAGES_DIR, locale, `${namespace}.json`);
      
      // Check file exists
      if (!fs.existsSync(localePath)) {
        if (locale === 'ja' && !['common', 'card'].includes(namespace)) {
          // Japanese only requires common and card translations
          continue;
        }
        errors.push(`  ❌ Missing file: ${locale}/${namespace}.json`);
        continue;
      }
      
      // Load and flatten
      const localeContent = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
      const localeKeys = flattenObject(localeContent);
      
      // Find missing keys
      const missingKeys = [...referenceKeys].filter(k => !localeKeys.has(k));
      if (missingKeys.length > 0) {
        errors.push(`  ❌ ${locale}/${namespace}.json missing ${missingKeys.length} keys:`);
        missingKeys.slice(0, 5).forEach(k => {
          errors.push(`     - ${k}`);
        });
        if (missingKeys.length > 5) {
          errors.push(`     ... and ${missingKeys.length - 5} more`);
        }
      }
      
      // Find extra keys (warnings only)
      const extraKeys = [...localeKeys.keys()].filter(k => !referenceKeys.has(k));
      if (extraKeys.length > 0) {
        warnings.push(`  ⚠️  ${locale}/${namespace}.json has ${extraKeys.length} extra keys (will be unused)`);
      }
      
      // Validate placeholders
      for (const key of referenceKeys) {
        const values = new Map<string, string>();
        
        const enValue = localeKeys.get(key);
        if (enValue) values.set(locale, enValue);
        
        const placeholderErrors = validatePlaceholders(key, values);
        errors.push(...placeholderErrors.map(e => `  ❌ ${e}`));
      }
      
      if (missingKeys.length === 0 && extraKeys.length === 0) {
        console.log(`  ✅ ${locale}/${namespace}.json complete`);
      }
    }
    console.log();
  }
  
  // Print warnings
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(w => console.log(w));
    console.log();
  }
  
  // Print errors and exit
  if (errors.length > 0) {
    console.error('❌ Translation validation failed:\n');
    errors.forEach(err => console.error(err));
    console.error(`\n${errors.length} error(s) found`);
    exit(1);
  }
  
  console.log('✅ All translations validated successfully!');
  console.log(`📊 Total: ${totalKeys} keys across ${NAMESPACES.length} namespaces, ${LOCALES.length} locales`);
}

// Run validation
try {
  validateTranslations();
} catch (error) {
  console.error('Validation script error:', error);
  exit(1);
}
```

**Add to package.json:**

```json
{
  "scripts": {
    "i18n:validate": "tsx scripts/validate-translations.ts",
    "i18n:extract": "tsx scripts/extract-translations.ts",
    "i18n:generate": "tsx scripts/generate-translation-templates.ts"
  }
}
```

**Add to CI:**

```yaml
# .github/workflows/i18n-check.yml
name: i18n Check

on:
  pull_request:
    paths:
      - 'i18n/messages/**'
      - 'scripts/validate-translations.ts'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run i18n:validate
```

**Add to CI:**

```yaml
# .github/workflows/ci.yml
- name: Validate translations
  run: pnpm tsx scripts/validate-translations.ts
```

---

## ✅ Implementation Checklist

### Setup
- [ ] Install next-intl
- [ ] Configure middleware for language detection
- [ ] Set up locale-based routing
- [ ] Create translation file structure
- [ ] Configure default locale

### Translations
- [ ] Create common.json for all locales
- [ ] Create navigation.json
- [ ] Create search.json
- [ ] Create card.json
- [ ] Create collection.json
- [ ] Create market.json
- [ ] Create auth.json
- [ ] Create profile.json
- [ ] Create errors.json

### Components
- [ ] Implement LanguageSwitcher component
- [ ] Update all UI components to use translations
- [ ] Implement locale-specific formatting (currency, dates, numbers)
- [ ] Add hreflang tags to all pages
- [ ] Generate sitemap with all locales

### Database
- [ ] Create card_translations table
- [ ] Import Chinese card names
- [ ] Add translation endpoints to API

### Testing
- [ ] Test all locales (zh-CN, en, ja, zh-TW)
- [ ] Test language switching
- [ ] Test formatting in all locales
- [ ] Test SEO (hreflang, sitemap)
- [ ] Test missing translation handling

### Documentation
- [ ] Document translation workflow
- [ ] Create translation style guide
- [ ] Document locale-specific features
- [ ] Train team on i18n patterns

---

## 🚨 Common Pitfalls

**Pitfall 1: Hardcoded Strings**
**Problem:** Text not translatable
**Solution:** Always use translation keys

```typescript
// ❌ BAD
<button>Search</button>

// ✅ GOOD
<button>{t('actions.search')}</button>
```

**Pitfall 2: Concatenating Translations**
**Problem:** Grammar varies by language
**Solution:** Use placeholders

```typescript
// ❌ BAD
`${t('found')} ${count} ${t('cards')}`

// ✅ GOOD
t('results.found', { count })
```

**Pitfall 3: Assuming English Word Order**
**Problem:** Word order varies by language
**Solution:** Use full sentences with placeholders

**Pitfall 4: Ignoring Locale-Specific Formatting**
**Problem:** Dates/numbers look wrong
**Solution:** Use locale-aware formatters

**Pitfall 5: Forgetting to Update All Locales**
**Problem:** Translations out of sync
**Solution:** Use validation script in CI

---

## 📚 References

**External Resources:**
- [next-intl Documentation](https://next-intl-docs.vercel.app)
- [Unicode CLDR](http://cldr.unicode.org)
- [Web Internationalization Best Practices](https://www.w3.org/International/quicktips/)

**Internal Documentation:**
- [Frontend Architecture](frontend-architecture.md)
- [Feature Breakdown](feature-breakdown.md)

---

## 🔄 Review & Updates

**Review Schedule:** Quarterly

**Update Triggers:**
- New language added
- User feedback on translations
- New features requiring translations
- Translation quality issues reported

**Quarterly Review Checklist:**
- [ ] Review translation completeness
- [ ] Check for outdated translations
- [ ] Update card name translations
- [ ] Review locale-specific formatting
- [ ] Test all language combinations
- [ ] Gather user feedback on translations

---

**Document Version:** 1.0  
**Created:** December 4, 2025  
**Contributors:** Development Team, Translation Team  
**Next Review:** March 4, 2026

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) Internationalization
