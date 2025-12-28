# eBay Seller Hub 爬虫 - 快速开始

## 📋 当前状态

我已经创建了基础的爬虫框架，但需要你提供页面结构信息才能完善。

## 🚀 快速测试

### 1. 安装依赖（如果还没有）

```bash
cd apps/web
pnpm install
```

确保已安装 Playwright：
```bash
pnpm exec playwright install chromium
```

### 2. 测试爬虫（需要先完善选择器）

```bash
# 测试爬取 Pokemon 的成交记录
node -e "
const crawler = require('./scripts/crawler/ebay-seller-hub-crawler');
crawler.crawl('Pokemon', { maxPages: 1, headless: false })
  .then(results => {
    console.log('Found', results.length, 'transactions');
    console.log(JSON.stringify(results.slice(0, 3), null, 2));
  })
  .catch(console.error);
"
```

## 🔧 需要你提供的信息

### 最简单的方式：提供选择器

打开 eBay Seller Hub Research products 页面，搜索 "Pokemon"，然后：

1. **按 F12 打开开发者工具**
2. **找到成交记录列表**，右键第一条记录 → "检查元素"
3. **告诉我以下信息**：

```markdown
成交记录列表容器: [选择器，如 `.results-list` 或 `table tbody`]
单条记录: [选择器，如 `.item` 或 `tr`]
标题: [选择器，如 `.title`]
价格: [选择器，如 `.price`]
日期: [选择器，如 `.date`]
下一页按钮: [选择器，如 `button.next`]
```

### 或者：直接修改代码

打开 `apps/web/scripts/crawler/ebay-seller-hub-crawler.js`，找到所有 `TODO` 注释，根据实际页面修改：

1. **第 50-60 行**: 搜索框和按钮的选择器
2. **第 100-120 行**: 结果容器的选择器
3. **第 150-200 行**: 数据提取的选择器（标题、价格、日期等）
4. **第 220-250 行**: 分页按钮的选择器

## 📝 示例：如何找到选择器

### 方法 1: 使用浏览器控制台

1. 打开页面，搜索 "Pokemon"
2. 按 F12，切换到 Console 标签
3. 运行以下代码测试选择器：

```javascript
// 测试找到所有成交记录
const items = document.querySelectorAll('你的选择器');
console.log('找到', items.length, '条记录');

// 查看第一条记录的结构
if (items[0]) {
  console.log('第一条记录:', items[0].outerHTML);
  
  // 测试提取标题
  const title = items[0].querySelector('你的标题选择器');
  console.log('标题:', title?.textContent);
  
  // 测试提取价格
  const price = items[0].querySelector('你的价格选择器');
  console.log('价格:', price?.textContent);
}
```

### 方法 2: 使用浏览器开发者工具

1. 右键点击元素 → "检查元素"
2. 在 Elements 面板中，右键元素 → "Copy" → "Copy selector"
3. 将选择器粘贴给我

## 🎯 完整工作流

一旦选择器完善后：

### 1. 测试单个搜索

```bash
cd apps/web
node scripts/import-crawler-data.js --limit 1 --dry-run
```

### 2. 导入数据

```bash
# 导入前 10 张卡片的数据（测试）
node scripts/import-crawler-data.js --limit 10

# 导入更多数据
node scripts/import-crawler-data.js --limit 100
```

### 3. 同步价格

```bash
# 运行价格同步
node scripts/run-price-pipeline.js --crawler-limit 100 --sync-limit 1000
```

## ⚠️ 注意事项

1. **登录状态**: 如果页面需要登录，爬虫会打开浏览器窗口，你需要手动登录一次
2. **速率限制**: 爬虫已设置延迟，但如果被限制，可以增加 `delayBetweenPages` 的值
3. **反爬虫**: 如果遇到验证码，需要手动处理

## 📞 下一步

请提供以下任一信息：

1. **选择器列表**（最简单）
2. **页面 HTML 结构**（截图或代码）
3. **直接修改代码**（如果你熟悉）

然后我就可以帮你完善爬虫，让价格功能上线！


