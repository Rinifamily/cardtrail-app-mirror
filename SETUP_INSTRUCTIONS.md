# CardTrail 价格功能设置指南

## 🎯 目标
让价格功能完全可用，UI 显示真实的 eBay 交易数据和 CT Price

---

## ✅ Step 1: 执行数据库迁移

### 1.1 打开 Supabase SQL Editor
访问: https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/sql/new

### 1.2 执行 card_extensions 迁移
复制并执行文件内容:
```
supabase/migrations/20251209000000_card_extensions.sql
```

### 1.3 验证表创建成功
执行以下 SQL 验证:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'card_extensions';
```

应该返回: `card_extensions`

---

## ✅ Step 2: 配置环境变量

### 2.1 eBay API 凭证

你需要在 eBay Developer Portal 获取 API 凭证:
1. 访问: https://developer.ebay.com/my/keys
2. 创建应用获取以下凭证:

在 `apps/web/.env.local` 中添加:
```bash
# eBay API Credentials
EBAY_APP_ID=your_app_id_here
EBAY_CERT_ID=your_cert_id_here
EBAY_DEV_ID=your_dev_id_here
EBAY_ENVIRONMENT=sandbox  # 或 production
```

### 2.2 Internal API Key

生成一个安全的密钥:
```bash
openssl rand -base64 32
```

添加到 `.env.local`:
```bash
# Internal API Protection
INTERNAL_API_KEY=<生成的密钥>
```

### 2.3 Supabase Service Role Key

从 Supabase Dashboard 获取:
https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/settings/api

添加到 `.env.local`:
```bash
# Supabase Service Role (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2.4 可选: Email 通知

如果需要价格同步完成后发送邮件通知:
```bash
# Email Notifications (Optional)
ENABLE_PRICE_SYNC_EMAIL=true
ADMIN_EMAIL=your@email.com
RESEND_API_KEY=re_xxxxx
```

---

## ✅ Step 3: 更新数据库类型定义

运行以下命令重新生成 TypeScript 类型:
```bash
cd apps/web
pnpm db:types
```

这会更新 `apps/web/lib/database.types.generated.ts` 包含 `card_extensions` 表。

---

## ✅ Step 4: 导入 eBay 交易数据

### 4.1 运行导入脚本
```bash
cd apps/web
node scripts/import-ebay-transactions.js --limit 100
```

参数说明:
- `--limit N`: 导入前 N 张卡片的交易数据（测试用）
- `--card-id ID`: 只导入指定卡片的数据
- `--dry-run`: 模拟运行，不写入数据库

### 4.2 验证数据导入
```sql
-- 检查 transactions 表
SELECT COUNT(*) FROM transactions;

-- 查看最近的交易
SELECT * FROM transactions 
ORDER BY sold_date DESC 
LIMIT 10;
```

---

## ✅ Step 5: 运行价格同步

### 5.1 手动触发价格计算
```bash
curl -X POST http://localhost:3000/api/internal/sync-prices?limit=10 \
  -H "x-internal-api-key: <你的INTERNAL_API_KEY>"
```

### 5.2 验证价格数据
```sql
-- 检查 price_history 表
SELECT COUNT(*) FROM price_history;

-- 检查 card_extensions 表
SELECT card_id, current_price_psa10, price_updated_at 
FROM card_extensions 
WHERE current_price_psa10 IS NOT NULL
LIMIT 10;
```

---

## ✅ Step 6: 验证 UI 显示

### 6.1 启动开发服务器
```bash
pnpm dev
```

### 6.2 访问卡片详情页
访问: http://localhost:3000/cards/1

应该看到:
- ✅ "CardTrail 指导价" 显示真实价格（不是"暂未收录"）
- ✅ 价格趋势图显示历史数据
- ✅ 近期成交记录列表

---

## ✅ Step 7: 部署到 Vercel

### 7.1 在 Vercel Dashboard 配置环境变量
访问: https://vercel.com/your-team/cardtrail-app/settings/environment-variables

添加以下变量:
```
EBAY_APP_ID
EBAY_CERT_ID
EBAY_DEV_ID
EBAY_ENVIRONMENT
INTERNAL_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### 7.2 推送代码触发部署
```bash
git push origin main
```

### 7.3 验证生产环境
访问: https://your-app.vercel.app/cards/1

---

## 🔄 自动化价格更新

Vercel Cron Job 已配置为每天 00:00 UTC 自动运行价格同步。

查看配置: `vercel.json`
```json
{
  "crons": [{
    "path": "/api/internal/sync-prices",
    "schedule": "0 0 * * *"
  }]
}
```

---

## 🐛 故障排查

### 问题 1: "暂未收录该评级价格"
**原因**: `transactions` 表为空或该卡片没有交易数据
**解决**: 运行 Step 4 导入交易数据

### 问题 2: "Module not found: @upstash/redis"
**原因**: 依赖未安装
**解决**: `pnpm install`

### 问题 3: Build 失败 "card_extensions does not exist"
**原因**: 数据库迁移未执行
**解决**: 执行 Step 1

### 问题 4: eBay API 报错 "Invalid credentials"
**原因**: eBay API 凭证配置错误
**解决**: 检查 `.env.local` 中的 `EBAY_APP_ID` 等

---

## 📊 监控和日志

### 查看 Vercel 日志
```bash
vercel logs <deployment-url>
```

### 查看价格同步日志
访问: https://vercel.com/your-team/cardtrail-app/logs

搜索: `[syncPrices]` 或 `[CT Price]`

---

## 🎉 完成！

完成以上步骤后，你应该能看到:
- ✅ UI 显示真实价格
- ✅ 价格每天自动更新
- ✅ 历史价格图表可用
- ✅ 成交记录列表显示

有任何问题请查看日志或联系开发团队。

