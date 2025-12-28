# 测试 eBay Seller Hub 爬虫

## 🚀 快速测试

### 1. 测试爬虫（单页）

```bash
cd apps/web

node -e "
const crawler = require('./scripts/crawler/ebay-seller-hub-crawler');

crawler.crawl('Pokemon', { 
  maxPages: 1,  // 只爬第一页
  headless: false  // 显示浏览器，方便调试
})
  .then(results => {
    console.log('\n✅ 爬取完成！');
    console.log(`找到 ${results.length} 条成交记录\n`);
    
    if (results.length > 0) {
      console.log('前 3 条记录示例：');
      results.slice(0, 3).forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.title}`);
        console.log(`   商品ID: ${item.itemId}`);
        console.log(`   价格: $${item.price}`);
        console.log(`   日期: ${item.soldDate}`);
        console.log(`   图片: ${item.imageUrl || '无'}`);
        console.log(`   链接: ${item.link || '无'}`);
      });
    }
  })
  .catch(error => {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
  });
"
```

### 2. 测试完整导入流程

```bash
# 测试导入（不写入数据库）
node scripts/import-crawler-data.js --limit 1 --dry-run

# 实际导入
node scripts/import-crawler-data.js --limit 5
```

## 🔍 调试技巧

### 如果爬虫无法找到元素

1. **检查页面是否加载完成**
   - 爬虫会打开浏览器窗口
   - 观察页面是否完全加载
   - 检查是否需要登录

2. **手动验证选择器**
   在浏览器控制台运行：
   ```javascript
   // 检查是否能找到成交记录
   document.querySelectorAll('tr.research-table-row').length
   
   // 检查第一条记录
   const firstRow = document.querySelector('tr.research-table-row');
   console.log('商品ID:', firstRow.querySelector('span[data-item-id]')?.getAttribute('data-item-id'));
   console.log('标题:', firstRow.querySelector('.research-table-row__product-info-name')?.textContent);
   console.log('价格:', firstRow.querySelector('.research-table-row_avgSoldPrice')?.textContent);
   console.log('日期:', firstRow.querySelector('.research-table-row_dateLastSold')?.textContent);
   ```

3. **检查选择器是否正确**
   - 右键元素 → 检查
   - 查看实际的 class 名称
   - 注意是否有下划线 `_` 或双下划线 `__` 的区别

## ⚠️ 常见问题

### 问题 1: 找不到搜索框

**解决方案**: 
- 确保已登录 eBay Seller Hub
- 检查 URL 是否正确：`https://www.ebay.com/sh/research`
- 可能需要手动导航到 Research 页面

### 问题 2: 找不到成交记录

**解决方案**:
- 检查选择器 `tr.research-table-row` 是否正确
- 页面可能需要更长时间加载，增加等待时间
- 检查是否需要切换到 "Sold" 标签页

### 问题 3: 价格或日期提取失败

**解决方案**:
- 检查实际的 class 名称（可能是 `__` 而不是 `_`）
- 查看元素的实际文本内容
- 可能需要调整 `parsePrice()` 或 `parseDate()` 函数

### 问题 4: 无法翻页

**解决方案**:
- 检查"下一页"按钮的实际选择器
- 可能需要滚动到页面底部才能看到按钮
- 检查按钮是否被禁用

## 📝 修改选择器

如果选择器不正确，打开 `ebay-seller-hub-crawler.js`，修改以下部分：

1. **第 158 行**: 成交记录行选择器
   ```javascript
   const rows = await page.$$('tr.research-table-row');
   ```

2. **第 170 行**: 商品ID选择器
   ```javascript
   const itemIdElement = await row.$('span[data-item-id]');
   ```

3. **第 180 行**: 标题选择器
   ```javascript
   const titleElement = await row.$('.research-table-row__product-info-name');
   ```

4. **第 195 行**: 价格选择器
   ```javascript
   const priceElement = await row.$('.research-table-row_avgSoldPrice');
   ```

5. **第 203 行**: 日期选择器
   ```javascript
   const dateElement = await row.$('.research-table-row_dateLastSold');
   ```

6. **第 188-200 行**: 图片选择器
   ```javascript
   const thumbnailSelectors = [
     '.research-table-row__thumbnail',
     // ... 其他选择器
   ];
   ```

## ✅ 验证数据

导入数据后，检查数据库：

```sql
-- 查看导入的交易数量
SELECT COUNT(*) FROM transactions 
WHERE metadata->>'source' = 'ebay_seller_hub_crawler';

-- 查看最近的交易
SELECT 
  ebay_item_id,
  title,
  price,
  sold_date,
  metadata->>'image_url' as image_url
FROM transactions 
WHERE metadata->>'source' = 'ebay_seller_hub_crawler'
ORDER BY created_at DESC 
LIMIT 10;
```


