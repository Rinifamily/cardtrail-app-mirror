# eBay Seller Hub 爬虫 - 使用说明

## ✅ 已完成

根据你提供的 HTML 结构，爬虫已配置好以下选择器：

- ✅ **成交记录容器**: `tr.research-table-row`
- ✅ **商品ID**: `span[data-item-id]`
- ✅ **产品名称**: `.research-table-row__product-info-name`
- ✅ **售出价格**: `.research-table-row_avgSoldPrice`
- ✅ **售出日期**: `.research-table-row_dateLastSold`
- ✅ **图片URL**: `.research-table-row__thumbnail` (多个备选选择器)
- ✅ **商品链接**: `.research-table-row__link-row-anchor`

## 🚀 快速开始

### 1. 安装依赖（如果还没有）

```bash
cd apps/web
pnpm install
pnpm exec playwright install chromium
```

### 2. 测试爬虫

```bash
# 测试爬取 Pokemon 的成交记录（只爬第一页）
node -e "
const crawler = require('./scripts/crawler/ebay-seller-hub-crawler');
crawler.crawl('Pokemon', { maxPages: 1, headless: false })
  .then(results => {
    console.log('找到', results.length, '条记录');
    if (results.length > 0) {
      console.log('示例:', JSON.stringify(results[0], null, 2));
    }
  })
  .catch(console.error);
"
```

### 3. 导入数据到 Supabase

```bash
# 测试运行（不写入数据库）
node scripts/import-crawler-data.js --limit 1 --dry-run

# 实际导入（导入前 5 张卡片的数据）
node scripts/import-crawler-data.js --limit 5

# 导入更多数据
node scripts/import-crawler-data.js --limit 100
```

### 4. 同步价格

```bash
# 运行完整流程（导入 + 价格同步）
node scripts/run-price-pipeline.js --crawler-limit 100 --sync-limit 1000
```

## 📋 使用说明

### 基本用法

```bash
# 导入指定数量的卡片数据
node scripts/import-crawler-data.js --limit 100

# 导入指定卡片
node scripts/import-crawler-data.js --card-id 123

# 测试模式（不写入数据库）
node scripts/import-crawler-data.js --limit 10 --dry-run
```

### 爬虫选项

在 `ebay-seller-hub-crawler.js` 中可以调整：

```javascript
const CONFIG = {
  delayBetweenPages: 2000,      // 翻页延迟（毫秒）
  delayBetweenRequests: 1000,   // 请求延迟
  pageLoadTimeout: 30000,        // 页面加载超时
  maxRetries: 3,                 // 最大重试次数
};
```

## ⚠️ 重要提示

### 1. 登录状态

爬虫会打开浏览器窗口，如果页面需要登录：
- 第一次运行时，手动登录 eBay Seller Hub
- 登录后，爬虫会继续工作
- 建议使用非无头模式（`headless: false`）以便处理登录

### 2. 速率限制

- 已设置请求延迟，避免被限制
- 如果遇到限制，增加 `delayBetweenPages` 的值
- 建议不要同时运行多个爬虫实例

### 3. 数据验证

导入后检查数据：

```sql
-- 查看导入的交易
SELECT COUNT(*) FROM transactions 
WHERE metadata->>'source' = 'ebay_seller_hub_crawler';

-- 查看数据质量
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN price > 0 THEN 1 END) as with_price,
  COUNT(CASE WHEN sold_date IS NOT NULL THEN 1 END) as with_date,
  COUNT(CASE WHEN metadata->>'image_url' IS NOT NULL THEN 1 END) as with_image
FROM transactions 
WHERE metadata->>'source' = 'ebay_seller_hub_crawler';
```

## 🔧 如果遇到问题

### 选择器不匹配

如果爬虫无法找到元素，检查实际的 class 名称：

1. 打开页面，按 F12
2. 右键元素 → "检查元素"
3. 查看实际的 class 名称
4. 修改 `ebay-seller-hub-crawler.js` 中的选择器

### 页面加载慢

增加等待时间：

```javascript
// 在 waitForResults() 函数中
await page.waitForTimeout(5000); // 增加到 5 秒
```

### 无法翻页

检查"下一页"按钮的选择器，可能需要：
- 滚动到页面底部
- 等待按钮出现
- 使用不同的选择器

## 📊 数据流程

```
1. 爬虫获取 eBay 成交记录
   ↓
2. 数据转换（提取价格、日期、评级等）
   ↓
3. 写入 Supabase transactions 表
   ↓
4. 运行价格同步（计算 CT Price）
   ↓
5. 写入 price_history 和 card_extensions 表
   ↓
6. 前端显示价格数据
```

## 🎯 下一步

1. **测试爬虫**: 运行测试脚本，确保能正确提取数据
2. **导入数据**: 从小批量开始（`--limit 10`）
3. **验证数据**: 检查数据库中的数据是否正确
4. **同步价格**: 运行价格同步生成价格历史
5. **查看效果**: 访问 http://localhost:3000/cards/1 查看价格

## 📞 需要帮助？

如果遇到问题：
1. 查看 `TEST_CRAWLER.md` 了解调试技巧
2. 检查浏览器控制台的错误信息
3. 验证选择器是否正确
4. 查看爬虫日志输出


