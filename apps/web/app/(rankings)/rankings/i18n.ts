/**
 * Rankings Feature Internationalization
 * Centralized copy for all rankings components
 */

export const RANKINGS_COPY = {
  hero: {
    eyebrow: '实时行情',
    title: '涨跌榜单',
    description: '追踪卡牌市场实时表现',
    subtitle: '发现热门口袋妖怪卡牌的实时市场数据',
  },
  tabs: {
    gainers: { 
      zh: '涨幅榜', 
      en: '涨幅榜', 
      desc: '价格涨幅最高的卡牌' 
    },
    fallers: { 
      zh: '跌幅榜', 
      en: '跌幅榜', 
      desc: '价格跌幅最高的卡牌' 
    },
    volume: { 
      zh: '成交量榜', 
      en: '成交量榜', 
      desc: '交易量最高的卡牌' 
    },
    popularity: { 
      zh: '人气榜', 
      en: '人气榜', 
      desc: '最受欢迎的卡牌' 
    },
  },
  filters: {
    timeframe: '时间范围',
    rarity: '稀有度',
    grade: '等级',
    language: '语言',
    showFilters: '显示筛选',
    hideFilters: '隐藏筛选',
    apply: '应用',
    reset: '重置',
    all: '全部',
  },
  grid: {
    rank: '排名',
    card: '卡牌',
    change: '涨跌',
    volume: '成交量',
    price: '价格',
    actions: '操作',
    empty: '暂无数据',
    emptyDescription: '尝试调整筛选条件或稍后再试',
    loading: '加载中...',
    select: '选择对比',
  },
  comparison: {
    title: '对比卡牌',
    selected: '已选择',
    of: '/共',
    limit: '最多选择3张',
    compareButton: '开始对比',
    clear: '清空选择',
  },
  share: {
    button: '分享',
    success: '链接已复制',
    error: '分享失败',
    title: 'CardTrail 榜单',
    text: '查看这张热门卡牌！',
  },
} as const;

// Timeframe options
export const TIMEFRAME_OPTIONS = [
  { value: '24h', label: '24小时' },
  { value: '7d', label: '7天' },
  { value: '30d', label: '30天' },
] as const;

// Grade options
export const GRADE_OPTIONS = [
  { value: null, label: '全部等级' },
  { value: 'psa10', label: 'PSA 10' },
  { value: 'psa9', label: 'PSA 9' },
  { value: 'raw', label: '原卡' },
] as const;

// Rarity options
export const RARITY_OPTIONS = [
  { value: null, label: '全部' },
  { value: 'common', label: '普通' },
  { value: 'uncommon', label: '罕见' },
  { value: 'rare', label: '稀有' },
  { value: 'holo_rare', label: '闪卡' },
  { value: 'ultra_rare', label: '超稀有' },
  { value: 'secret_rare', label: '隐藏稀有' },
] as const;

// Language options
export const LANGUAGE_OPTIONS = [
  { value: null, label: '全部语言' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
] as const;
