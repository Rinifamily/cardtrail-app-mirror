## Vercel Mirror Deployment Playbook / 镜像部署说明

### 仓库与项目 / Repos & Projects
- 原始仓库（org 内）：`cardtrail-app`（monorepo，根路径 `/cardtrail-app`，前端位于 `apps/web`）。
- 个人镜像仓库：`cardtrail-app-mirror-web`（保持相同目录结构，供 Vercel CI/CD 使用）。
- Vercel 项目：
  - `web`（当前使用的项目，已关联镜像仓库）
  - 历史/备用：`cardtrail-app-mirror-web`（同代码，已通过 alias 指向最新成功部署）

### 背景 / Why mirror to Vercel
- 原组织仓库因权限/集成限制无法直接连接 Vercel，临时将代码镜像到个人仓库以解锁 Vercel CI/CD。
- 目标：快速获得线上可用链接用于体验/验收，同时不阻塞后续迁回正式仓库。

### 我们如何镜像 / How the mirror was set up
- 代码来源：原 org 仓库 `cardtrail-app` -> 个人仓库 `cardtrail-app-mirror-web`（保持相同 monorepo 结构）。
- 部署子目录：`apps/web`（Next.js app）。
- 使用工具：`vercel` CLI 49.x。
- 关键命令（在 `apps/web` 下）：
  - `vercel link --yes` 绑定到 Vercel 项目。
  - `vercel pull --yes` 拉取项目设置（写入 `.vercel/project.json`）。
  - `vercel build --prod` 本地验证构建。
  - `vercel deploy --prod` 触发远程构建并部署。
  - `vercel alias set <deployment> <alias>` 绑定稳定域名。

### 环境变量 / Env requirements
- **必须提供** `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，否则构建会直接失败（`lib/supabase.ts` 里强校验）。
- 已在 Vercel 项目 “All Environments” 配置上述变量。

### 当前结果 / Current state
- 最新成功部署（项目 `web`）：`web-g83mg4xu8-roy-songzhe-lis-projects.vercel.app`
- 绑定的可用域名（已指向上述部署）：
  - `https://cardtrail-app-mirror-web.vercel.app`（项目 `cardtrail-app-mirror-web` 的别名，现指向 `web` 的成功部署）
  - `https://cardtrail-app-mirror-web-git-main-roy-songzhe-lis-projects.vercel.app`
  - `https://web-roy-songzhe-lis-projects.vercel.app`
- 根目录正确指向 `apps/web`，构建日志显示静态路由 `/dashboard` 等已产出。

### 如何重复这套流程 / How to redeploy
1) `cd apps/web`
2) `vercel pull --yes`（如需同步最新项目设置）
3) `vercel build --prod`（可选，本地预检）
4) `vercel deploy --prod`
5) 如需自定义域名：`vercel alias set <deployment> <your-domain>`

### 若要彻底解决并停用镜像 / How to resolve root cause
- 在原 org 仓库启用 Vercel 项目：
  - 根目录设置 `apps/web`
  - 配置同名环境变量 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - 绑定正式域名
- 确认 org 仓库的 Vercel 部署成功后：
  - 将自定义域名切回 org 项目
  - 停止使用镜像仓库的 Vercel 项目或保留为备份

### 故障排查要点 / Troubleshooting
- 404 多数是域名未指向最新成功部署：使用 `vercel alias set` 指到最近一次 Ready 的 deployment。
- 构建时报缺少 Supabase env：检查 Vercel 项目环境变量，确保键名完全匹配且作用域为当前环境（All/Production）。
- TypeScript 配置找不到：确保 `apps/web/tsconfig.json` 继承本地 `./tsconfig.base.json`，避免 Vercel 无法访问 monorepo 上层路径。

