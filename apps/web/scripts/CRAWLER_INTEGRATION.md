# 爬虫插件集成指南

## 📋 概述

这个指南将帮助你集成从 GitHub 下载的爬虫插件，将 eBay 价格数据导入到 Supabase 数据库中。

## 🚀 快速开始

### 步骤 1: 解压爬虫插件

1. 将下载的 zip 文件解压到 `apps/web/scripts/crawler/` 目录
2. 或者放在项目根目录的任意位置，记录路径

### 步骤 2: 修改集成脚本

打开 `apps/web/scripts/import-crawler-data.js`，找到 `loadCrawler()` 函数，根据你的爬虫插件类型进行修改：

#### 情况 A: Node.js 模块

```javascript
async function loadCrawler() {
  const crawlerPath = options.crawlerPath || path.join(__dirname, 'crawler', 'index.js');
  if (fs.existsSync(crawlerPath)) {
    const crawler = require(crawlerPath);
    return {
      crawl: async (keywords) => {
        // 调用你的爬虫函数
        return await crawler.search(keywords);
        // 或者 crawler.fetch(keywords)
        // 或者 crawler.getData(keywords)
      }
    };
  }
  throw new Error(`Crawler not found at ${crawlerPath}`);
}
```

#### 情况 B: Python 脚本

```javascript
async function loadCrawler() {
  const { spawn } = require('child_process');
  const crawlerPath = options.crawlerPath || path.join(__dirname, 'crawler', 'crawler.py');
  
  return {
    crawl: async (keywords) => {
      return new Promise((resolve, reject) => {
        const python = spawn('python', [crawlerPath, keywords]);
        let data = '';
        let error = '';
        
        python.stdout.on('data', (chunk) => { 
          data += chunk.toString(); 
        });
        
        python.stderr.on('data', (chunk) => { 
          error += chunk.toString(); 
        });
        
        python.on('close', (code) => {
          if (code === 0) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Failed to parse crawler output: ${e.message}`));
            }
          } else {
            reject(new Error(`Python script failed: ${error}`));
          }
        });
      });
    }
  };
}
```

#### 情况 C: Playwright/Puppeteer 浏览器爬虫

```javascript
async function loadCrawler() {
  const { chromium } = require('playwright');
  
  return {
    crawl: async (keywords) => {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      
      try {
        // 导航到 eBay 搜索页面
        const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keywords)}&_sop=13`;
        await page.goto(searchUrl, { waitUntil: 'networkidle' });
        
        // 等待结果加载
        await page.waitForSelector('.s-item', { timeout: 10000 });
        
        // 提取数据
        const results = await page.evaluate(() => {
          const items = [];
          document.querySelectorAll('.s-item').forEach((item) => {
            const title = item.querySelector('.s-item__title')?.textContent || '';
            const price = item.querySelector('.s-item__price')?.textContent || '';
            const itemId = item.getAttribute('data-listing-id') || '';
            const link = item.querySelector('.s-item__link')?.href || '';
            
            if (title && price) {
              items.push({
                itemId,
                title,
                price: parseFloat(price.replace(/[^0-9.]/g, '')),
                currency: 'USD',
                link,
              });
            }
          });
          return items;
        });
        
        await browser.close();
        return results;
      } catch (error) {
        await browser.close();
        throw error;
      }
    }
  };
}
```

### 步骤 3: 调整数据格式转换

在 `fetchEbayDataWithCrawler()` 函数中，根据你的爬虫返回的数据格式进行调整：

```javascript
// 假设你的爬虫返回这样的数据：
const rawData = [
  {
    id: '123456789',
    name: 'Pikachu PSA 10',
    cost: 99.99,
    money: 'USD',
    date: '2024-12-20',
  },
];

// 转换为数据库格式
const transactions = rawData.map(item => {
  const { company, grade } = parseGrading(item.name || '');
  
  return {
    ebay_item_id: item.id || `crawler_${Date.now()}_${Math.random()}`,
    card_id: card.id,
    title: item.name || '',
    price: parseFloat(item.cost || 0),
    currency: item.money || 'USD',
    sold_date: item.date || new Date().toISOString(),
    grading_company: company,
    grade: grade,
    metadata: {
      source: 'crawler',
      crawled_at: new Date().toISOString(),
    },
  };
});
```

## 📝 使用方法

### 基本用法

```bash
# 导入前 100 张卡片的数据
node scripts/import-crawler-data.js --limit 100

# 导入指定卡片
node scripts/import-crawler-data.js --card-id 123

# 测试运行（不写入数据库）
node scripts/import-crawler-data.js --limit 10 --dry-run

# 指定爬虫路径
node scripts/import-crawler-data.js --crawler-path ./my-crawler/index.js
```

### 完整示例

```bash
# 1. 先测试运行，确保爬虫工作正常
node scripts/import-crawler-data.js --limit 5 --dry-run

# 2. 如果测试成功，开始导入数据
node scripts/import-crawler-data.js --limit 100

# 3. 导入完成后，运行价格同步
curl -X POST http://localhost:3000/api/internal/sync-prices \
  -H "x-internal-api-key: YOUR_INTERNAL_API_KEY"

# 4. 或者使用 Node.js 脚本
node -e "
const { syncPrices } = require('./lib/internal/sync-prices');
syncPrices({ limit: 1000 }).then(summary => {
  console.log('Price sync complete:', summary);
});
"
```

## 🔧 配置环境变量

确保 `.env.local` 文件包含以下变量：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://dmsvsfsbytemtbbqxqyi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 可选：爬虫特定配置
CRAWLER_DELAY=2000  # 请求间隔（毫秒）
CRAWLER_TIMEOUT=30000  # 超时时间（毫秒）
```

## 📊 数据验证

导入数据后，验证数据是否正确：

```sql
-- 查看导入的交易数量
SELECT COUNT(*) FROM transactions 
WHERE metadata->>'source' = 'crawler';

-- 查看最近的交易
SELECT * FROM transactions 
WHERE metadata->>'source' = 'crawler'
ORDER BY created_at DESC 
LIMIT 10;

-- 查看特定卡片的交易
SELECT * FROM transactions 
WHERE card_id = 123
ORDER BY sold_date DESC;
```

## 🚨 常见问题

### 1. 爬虫返回的数据格式不匹配

**解决方案**: 修改 `fetchEbayDataWithCrawler()` 函数中的数据转换逻辑，确保字段映射正确。

### 2. 速率限制错误

**解决方案**: 增加请求间隔时间：
```javascript
// 在 processCard() 函数中
await new Promise(resolve => setTimeout(resolve, 5000)); // 改为 5 秒
```

### 3. 爬虫插件无法加载

**解决方案**: 
- 检查文件路径是否正确
- 确保安装了所有依赖（`npm install` 或 `pip install`）
- 检查文件权限

### 4. 数据库插入失败

**解决方案**:
- 检查 Supabase 凭证是否正确
- 验证数据格式是否符合数据库 schema
- 查看错误日志获取详细信息

## 📈 下一步：启用价格功能

数据导入完成后，需要运行价格同步来生成价格历史：

```bash
# 方式 1: 通过 API（需要 INTERNAL_API_KEY）
curl -X POST http://localhost:3000/api/internal/sync-prices \
  -H "x-internal-api-key: YOUR_KEY"

# 方式 2: 直接运行脚本
cd apps/web
node -e "
require('dotenv').config({ path: '.env.local' });
const { syncPrices } = require('./lib/internal/sync-prices');
syncPrices({ limit: 1000 }).then(console.log);
"
```

## 🎯 完整工作流

1. **导入交易数据** → `node scripts/import-crawler-data.js --limit 100`
2. **同步价格** → `curl -X POST http://localhost:3000/api/internal/sync-prices`
3. **验证数据** → 访问 http://localhost:3000/cards/1 查看价格
4. **检查价格历史** → 访问 http://localhost:3000/market 查看市场数据

## 💡 提示

- 首次运行建议使用 `--dry-run` 模式测试
- 从小批量开始（`--limit 10`），确认无误后再增加
- 定期运行价格同步以更新价格历史
- 监控 Supabase 使用量，避免超出免费额度

## 📞 需要帮助？

如果遇到问题，请检查：
1. 爬虫插件是否正确加载
2. 数据格式是否符合预期
3. Supabase 连接是否正常
4. 查看控制台错误日志


