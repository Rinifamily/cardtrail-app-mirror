# Currency System Migration Guide

从USD-based系统迁移到CNY-first系统的完整指南。

## 快速开始

### 1. 获取API密钥
访问 https://www.exchangerate-api.com/ 注册免费账号

### 2. 配置环境
```bash
# .env.local
EXCHANGE_RATE_API_KEY=your_api_key_here
```

### 3. 使用组件
```tsx
import { PriceDisplay } from '@/components/ui/PriceDisplay';

<PriceDisplay amount={100} currency="USD" />
// 显示: ¥725.00 ($100.00)
```

详细文档请查看: apps/web/lib/currency/README.md
