# 环境变量配置指南

## 📋 必需配置

### 1. Supabase 凭证

在 `apps/web/.env.local` 中添加：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://dmsvsfsbytemtbbqxqyi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<从 Supabase Dashboard 获取>
SUPABASE_SERVICE_ROLE_KEY=<从 Supabase Dashboard 获取>
```

**获取位置**: https://supabase.com/dashboard/project/dmsvsfsbytemtbbqxqyi/settings/api

### 2. eBay API 凭证

```bash
EBAY_APP_ID=<你的 App ID>
EBAY_CERT_ID=<你的 Cert ID>
EBAY_DEV_ID=<你的 Dev ID>
EBAY_ENVIRONMENT=sandbox  # 测试环境，生产用 production
```

**获取步骤**:
1. 访问 https://developer.ebay.com/
2. 注册 eBay Developer 账号
3. 创建应用: https://developer.ebay.com/my/keys
4. 获取 App ID (Client ID), Cert ID (Client Secret), Dev ID

### 3. Internal API Key

```bash
INTERNAL_API_KEY=<生成一个安全密钥>
```

**生成命令**:
```bash
openssl rand -base64 32
```

## 🔧 可选配置

### Redis 缓存 (提升性能)

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
```

免费获取: https://upstash.com/

### Email 通知

```bash
ENABLE_PRICE_SYNC_EMAIL=true
ADMIN_EMAIL=your@email.com
RESEND_API_KEY=re_xxxxx
```

获取 Resend API: https://resend.com/

## ✅ 验证配置

运行以下命令检查配置是否正确：

```bash
cd apps/web
node -e "
require('dotenv').config({ path: '.env.local' });
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'EBAY_APP_ID', 'INTERNAL_API_KEY'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.log('❌ Missing:', missing.join(', '));
  process.exit(1);
}
console.log('✅ All required environment variables are set!');
"
```

## 🚀 Vercel 部署配置

在 Vercel Dashboard 中添加相同的环境变量：

https://vercel.com/your-team/cardtrail-app/settings/environment-variables

**重要**: 不要在 Vercel 中设置 `EBAY_ENVIRONMENT=sandbox`，生产环境应该用 `production`

