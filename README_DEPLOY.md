# 尾盘买入法看板

这是一个手机端看板原型：静态首页 + 实时推荐 API。

页面请求：

```text
/api/recommendations
```

接口会拉取东方财富行情源，并按尾盘买入法规则生成板块和个股观察名单。

## 本地预览

```bash
npm run dev
```

默认打开：

```text
http://localhost:4173
```

## 本地构建

```bash
npm run build
```

构建产物会生成到：

```text
dist/
```

## 部署到 Vercel

推荐流程：

1. 把本目录推到 GitHub。
2. 在 Vercel 新建 Project，导入这个 GitHub 仓库。
3. Framework Preset 选择 Other。
4. Build Command 使用 `npm run build`。
5. Output Directory 使用 `dist`。
6. 部署后访问 `/api/recommendations` 检查实时接口。

`vercel.json` 已经写好这些默认项，通常导入仓库后保持默认即可。

## 用户数据

当前版本的注册登录是前端本机隔离：

1. 用户账号保存在浏览器 `localStorage`。
2. 自选股票、账户资金、可编辑持仓、买入卖出历史、当前选中股票、详情展开状态按用户 ID 分开保存。
3. 部署到 Vercel 不需要数据库和环境变量。
4. 多设备同步、找回密码和服务端权限控制需要后续接入 Supabase、Vercel KV 或其他 Auth/DB 服务。
5. 买入卖出记录只用于学习复盘，不会连接券商或真实下单。
6. 用户中心页面：`account.html`，预留了卖盘建议模块。

## 当前结构

1. 页面入口：`ui-prototype/index.html`
2. 样式：`ui-prototype/style.css`
3. 前端交互：`ui-prototype/app.js`
4. 实时推荐 API：`api/recommendations.js`
5. 本地开发服务：`scripts/dev-server.js`
