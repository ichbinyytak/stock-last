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

## 登录和用户管理

当前版本使用简单的服务端账号系统：

1. 超级用户固定为 `admin / fsheng`，定义在 `api/auth/users.js`。
2. 普通用户由超级用户在用户中心新增。
3. 登录接口是 `/api/auth/login`。
4. 用户管理接口是 `/api/auth/manage-users`，需要 admin 登录 token。
5. 默认托管用户 `test / 123` 会显示在 admin 用户管理列表里。

管理员新增/重设用户需要服务器存储。部署到 Vercel 时，请配置 Vercel KV 或 Upstash Redis 的 REST 环境变量：

```text
KV_REST_API_URL
KV_REST_API_TOKEN
AUTH_SECRET
```

`AUTH_SECRET` 用于签发登录 token，可设置为任意足够长的随机字符串。

注意：资金、持仓、买卖历史当前仍按用户 ID 保存在浏览器 `localStorage`，只用于学习复盘，不会连接券商或真实下单。下一步如果需要多设备同步，再把账户数据迁到服务器数据库。

## 当前结构

1. 页面入口：`ui-prototype/index.html`
2. 样式：`ui-prototype/style.css`
3. 前端交互：`ui-prototype/app.js`
4. 实时推荐 API：`api/recommendations.js`
5. 登录 API：`api/auth/login.js`
6. 用户管理 API：`api/auth/manage-users.js`
7. 本地开发服务：`scripts/dev-server.js`
