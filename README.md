# CardTrail (卡迹)

CardTrail 是面向中国宝可梦 TCG 藏家与投资者的移动优先 Web 应用，帮助用户实时追踪卡牌价格、管理持仓，并洞察市场趋势。本仓库包含 Phase 00 的完整基础设施：Turborepo + pnpm 单仓架构、Next.js 14 Web 应用、Supabase 数据源、shadcn/ui + DaisyUI 设计系统、Vitest + Playwright 测试链路，以及 GitHub Actions CI 管线。

## 🚀 快速开始

### 前置依赖

- Node.js 20+
- pnpm 10+
- [go-task](https://taskfile.dev/)（可选但推荐）
- Supabase 公共凭证（已提供在 `.env.local.example`）

### 初始化

```bash
# 安装依赖
pnpm install

# 复制 Supabase 凭证
cp .env.local.example .env.local
cp .env.local apps/web/.env.local

# 安装 Playwright 浏览器（仅需一次）
pnpm --filter web exec playwright install
```

### 常用任务（Taskfile）

```bash
task dev         # 启动 Next.js 开发服务器 (apps/web)
task build       # Turborepo 构建所有包
task lint        # 执行 ESLint (Next.js 规则)
task typecheck   # 全局 TypeScript 严格检查
task test        # Vitest + Playwright 全量测试
task test:unit   # 仅运行 Vitest
task test:e2e    # 运行 Playwright E2E
task db:types    # (需 Supabase CLI 登录) 生成数据库类型
task clean       # 清理构建产物
task setup       # pnpm install + playwright install
```

也可直接使用 pnpm 脚本：

```bash
pnpm dev                # turbo run dev
pnpm --filter web dev   # 仅 web 应用
pnpm --filter web test:e2e
```

## 🏗️ 架构概览

```
cardtrail-app/
├── apps/
│   └── web/             # Next.js 14 App Router（主应用）
│       ├── app/         # App Router routes（含 dashboard/search/...）
│       ├── components/  # layout/ui 组件（shadcn + DaisyUI）
│       ├── lib/         # Supabase 客户端与通用工具
│       ├── e2e/         # Playwright 测试
│       └── __tests__/   # Vitest 测试
├── packages/
│   ├── config/          # 共享 tsconfig（严格模式）
│   ├── db/              # 共享数据库工具（占位符）
│   └── ui/              # 共享 UI 包（占位符）
├── .github/workflows/   # ci.yml（lint/typecheck/build/e2e）
├── Taskfile.yml         # go-task 命令
├── turbo.json           # Turborepo pipeline
├── pnpm-workspace.yaml  # Workspace 声明
└── README.md            # 当前文件
```

## 🎨 前端实现要点

- **Next.js 14 (App Router)** + TypeScript 严格模式。
- **Tailwind CSS 3.4** + **DaisyUI** + **shadcn/ui**，在 `tailwind.config.ts` 中扩展品牌色、间距与 12px 圆角。
- **移动优先** 布局：`BottomNav` 组件在 iPhone 375px 视口下固定显示，桌面端自动隐藏并展示 `DesktopNav`。
- **路由分组**：`/(dashboard)`、`/(collection)`、`/(search)`、`/(rankings)`、`/(profile)`，每个页面提供占位 copy。
- **Supabase 集成**：`lib/supabase.ts` 使用 `@supabase/supabase-js` 只读访问 `card_jp`，`/test` 页面渲染 10 张卡牌用于连线验证。
- **路径别名**：在 `tsconfig.json` 中统一 `@/*`，并由共享 `packages/config/tsconfig/base.json` 强制严格规则。

## 🧪 测试与质量

- **Vitest + Testing Library**：`__tests__/components/BottomNav.test.tsx` 用于验证导航标签渲染与激活态。
- **Playwright**：`e2e/` 下覆盖跳转、底部导航在不同视口的显隐、Supabase 数据展示；`playwright.config.ts` 自动启动 `pnpm dev`。
- **CI**：`.github/workflows/ci.yml` 在 push/PR 时运行 `lint`、`typecheck`、`pnpm test`、`pnpm build` 与 `pnpm --filter web test:e2e`，并上传 Playwright 报告。所需 Supabase 凭证通过 GitHub Secrets (`NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY`) 配置。

## ☁️ 部署（Vercel）

1. **安装 CLI 并登录**（需 Vercel 帐号）：
   ```bash
   pnpm dlx vercel login
   ```
2. **链接项目**（root -> `apps/web`）：
   ```bash
   pnpm dlx vercel link --cwd apps/web
   ```
3. **设置环境变量**：
   ```bash
   pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_URL production
   pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   # 同步到 preview/development 视需要
   ```
4. **部署**：
   ```bash
   pnpm dlx vercel --cwd apps/web --prod
   ```

> ⚠️ 当前 CLI 尚未完成登录，需拥有者运行上述命令完成部署，并在 `PROJECT_CONFIG.md` 中记录最终生产 URL。

## 🔑 环境变量

根目录与 `apps/web` 均使用 `.env.local`（已列于 `.gitignore`）：

```
NEXT_PUBLIC_SUPABASE_URL=https://dmsvsfsbytemtbbqxqyi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

其他阶段（如 eBay API、服务端密钥）将在后续 Phase 中追加，切勿在客户端泄露 Service Key。

## 📚 参考文档

- `planning/agents.md`：AI 协作硬性规范（KISS、DRY、禁止修改 `card_jp` 等）。
- `planning/design.md`：视觉/动效/品牌准则（红涨绿跌、8px 栅格、12px 圆角）。
- `planning/deployment-operations.md`：CI/CD、监控与 Vercel 注意事项。
- `PROJECT_CONFIG.md`：环境变量与数据库信息速查。

## ✅ 当前状态

- Turborepo + pnpm 工作区 ✅
- Next.js 14 App Router + Tailwind/shadcn/DaisyUI ✅
- Supabase 读操作验证 (`/test`) ✅
- Bottom Navigation + 响应式 DesktopNav ✅
- Vitest + Playwright 测试 ✅（`pnpm --filter web test:e2e` 已通过）
- GitHub Actions CI ✅
- Vercel CLI 部署待完成（需 token 登录） ⚠️

如需继续 Phase 01（数据库 & 认证），建议先完成 Vercel 绑定，以便自动部署与后续监控集成。
