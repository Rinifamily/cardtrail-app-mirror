# Phase 00 快速启动指南

**开始 Phase 00 前必读！**

---

## ✅ 准备工作（已完成）

- ✅ Supabase 项目已配置
- ✅ `.env.local` 文件已创建（包含数据库凭证）
- ✅ 28,154 张卡牌数据可用
- ✅ GitHub CLI 已认证
- ✅ Node.js 20+ 和 pnpm 8+ 已安装

---

## 📋 Phase 00 任务清单

### Task 01: Monorepo Setup（8小时）
**目标：** 创建完整的 monorepo 结构

**执行步骤：**
```bash
# 1. 安装 pnpm（如果还没有）
npm install -g pnpm

# 2. 验证版本
node --version  # 应该 ≥ 20.0.0
pnpm --version  # 应该 ≥ 8.0.0

# 3. 开始执行 Task 01
# 详见: implementation/phase-00-scaffold/tasks/01-monorepo-complete.md
```

**完成标志：**
- [ ] `pnpm install` 成功运行
- [ ] Monorepo 结构创建完成
- [ ] Turborepo 配置完成
- [ ] Taskfile 可用

---

### Task 02: Next.js + Supabase（8小时）
**目标：** 创建 Next.js 应用并连接数据库

**执行步骤：**
```bash
# 1. 初始化 Next.js 应用
# 详见: implementation/phase-00-scaffold/tasks/02-nextjs-supabase-foundation.md

# 2. 测试数据库连接
# 在完成后，应该能查询 card_jp 表
```

**完成标志：**
- [ ] Next.js 应用启动成功
- [ ] 可以从 Supabase 读取卡牌数据
- [ ] shadcn/ui + DaisyUI 安装完成
- [ ] 基础 UI 组件可用

---

### Task 03: Testing & DevTools（6小时）
**目标：** 配置测试和开发工具

**执行步骤：**
```bash
# 1. 安装 Playwright 和 Vitest
# 2. 配置 GitHub Actions
# 3. 设置 pre-commit hooks
# 详见: implementation/phase-00-scaffold/tasks/03-testing-dev-tools.md
```

**完成标志：**
- [ ] `task test` 运行成功
- [ ] GitHub Actions CI/CD 配置完成
- [ ] Pre-commit hooks 工作

---

### Task 04: Bottom Navigation（4小时）
**目标：** 创建底部导航栏

**执行步骤：**
```bash
# 详见: implementation/phase-00-scaffold/tasks/04-bottom-navigation-layout.md
```

**完成标志：**
- [ ] 底部导航在移动端可见
- [ ] 5个 Tab 可点击切换
- [ ] 响应式布局正确

---

## 🗂️ 重要文档参考

### 必读文档
1. **PROJECT_CONFIG.md** - 项目配置总览
2. **planning/agents.md** - AI 开发规范（强制遵守）
3. **planning/design.md** - 设计系统规范
4. **planning/database-schema-card-jp.md** - 数据库结构

### 任务文档
- `implementation/phase-00-scaffold/README.md` - Phase 00 总览
- `implementation/phase-00-scaffold/tasks/*.md` - 具体任务详情

---

## 🔍 数据库快速查询示例

```typescript
// 测试连接
const { data, error } = await supabase
  .from('card_jp')
  .select('*')
  .limit(5);

console.log('卡牌数据:', data);
```

**示例响应：**
```json
[
  {
    "id": 12,
    "card_name": "Pikachu",
    "set_name": "11th Movie Commemoration Set",
    "image_urls": "https://tcgplayer-cdn.tcgplayer.com/product/613768_in_200x200.jpg|..."
  }
]
```

---

## 🎯 Phase 00 完成后你会拥有

### 1. 完整的开发环境
```bash
task dev          # 启动开发服务器
task build        # 构建项目
task test         # 运行测试
task lint         # 代码检查
```

### 2. 可访问的网站
- 本地: `http://localhost:3000`
- Vercel 预览: `https://cardtrail-xxx.vercel.app`

### 3. 基础功能
- ✅ 底部导航栏（5个Tab）
- ✅ 响应式布局
- ✅ 数据库连接
- ✅ UI 组件库
- ✅ 测试框架
- ✅ CI/CD 自动化

---

## ⚠️ 关键注意事项

### 数据库规则
```typescript
// ❌ 禁止修改 card_jp 表
ALTER TABLE card_jp ...  // 不允许！
UPDATE card_jp ...       // 不允许！
DELETE FROM card_jp ...  // 不允许！

// ✅ 只允许读取
SELECT * FROM card_jp WHERE id = 123;  // 允许
```

### 设计系统
- 必须遵循 `planning/design.md` 规范
- 使用设计系统颜色（红涨绿跌）
- 卡片圆角 12px
- 按钮高度 48px
- 间距使用 8px 系统

### 开发规范
- 必须遵循 `planning/agents.md` 规范
- TypeScript strict mode
- 不使用 `any` 类型
- 所有输入必须用 Zod 验证

---

## 🚀 开始执行

**准备好了？** 现在可以开始 Task 01！

```bash
# 1. 查看 Task 01 详情
cat implementation/phase-00-scaffold/tasks/01-monorepo-complete.md

# 2. 按照文档步骤执行

# 3. 遇到问题查看 PROJECT_CONFIG.md
```

---

## 📞 需要帮助？

### 文档索引
- **项目配置**: PROJECT_CONFIG.md
- **数据库结构**: planning/database-schema-card-jp.md
- **设计规范**: planning/design.md
- **开发规范**: planning/agents.md

### 常见问题

**Q: 数据库连接失败？**
A: 检查 `.env.local` 文件是否存在，确认凭证正确。

**Q: pnpm 命令不存在？**
A: 运行 `npm install -g pnpm` 安装。

**Q: 如何查看卡牌数据？**
A: 参考 `planning/database-schema-card-jp.md` 中的查询示例。

---

**准备好开始了吗？开始 Task 01！** 🚀

**Last Updated:** December 5, 2025

