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
2. 普通用户由超级用户在用户中心新增，也可以在用户列表里点“重设”修改密码。
3. 登录接口是 `/api/auth/login`。
4. 用户管理接口是 `/api/auth/manage-users`，需要 admin 登录 token。
5. 默认托管用户 `test / 123` 会显示在 admin 用户管理列表里。

管理员新增/重设用户需要服务器存储。部署到 Vercel 时，请配置 Vercel KV 或 Upstash Redis 的 REST 环境变量：

```text
KV_REST_API_URL
KV_REST_API_TOKEN
AUTH_SECRET
CRON_SECRET
```

`AUTH_SECRET` 用于签发登录 token，可设置为任意足够长的随机字符串。
`CRON_SECRET` 用于 Vercel Cron 调用自动模拟盘接口，也建议设置为足够长的随机字符串。

注意：普通账户的资金、持仓、买卖历史当前仍按用户 ID 保存在浏览器 `localStorage`；`test` 自动模拟盘的数据保存在服务器 KV。两者都只用于学习复盘，不会连接券商或真实下单。

## test 自动模拟盘

`test` 账号接入服务端模拟盘，用来观察尾盘买入法的规则效果：

1. 初始模拟资金固定为 `100000.00`。
2. 账户数据保存在 Vercel KV / Upstash Redis，key 为 `lateDay:paperAccount:test:v1`。
3. 登录 `test / 123` 后，用户中心会显示服务端模拟资金、持仓、买卖和策略运行事件。
4. test 个人中心可以调整“操作策略参数”和“选股策略参数”，并通过“详情”查看每个参数的含义、默认值和范围。
5. 默认操作策略：最大持仓 3 只，单票仓位 30%，买入涨幅 3%-18.8%，买入板块评分 84，买入个股评分 84，买入置信度 70，买入最高换手 25%，买入日线多头开启，每日只买一次；次日强势兑现阈值为浮盈 2%、开盘 1.5%、实时涨幅 3%，平盘确认阈值为浮盈不低于 -1%、开盘不低于 -1.2%。
6. 默认选股策略：看板涨幅 3%-18.8%，换手 2%-25%，量比不低于 1，板块评分不低于 78，个股评分不低于 76，板块上涨广度不低于 45%，活跃家数不低于 3，日线多头默认关闭，避开近涨停开启，偏好 20cm 开启。
7. 硬性日线过滤：候选股前一交易日不能涨停或跌停；如果前一交易日是阳线，阳线实体涨幅不能大于 5%。
8. 自动买入任务：交易日北京时间 14:45，对应 Cron `45 6 * * 1-5`。
9. 自动卖出任务：交易日北京时间 09:35，对应 Cron `35 1 * * 1-5`。
10. 策略只做模拟记录，不连接券商，不发送真实订单。

Vercel Cron 只在 Production 部署中自动执行。本地或预览环境可以在 `test` 用户中心点击“自动运行”手动触发一次。

如果使用 Vercel Hobby 计划，需要注意 Cron 的触发时间可能不是分钟级精确。代码会在非尾盘/非开盘处理窗口自动跳过，但要严格观察 09:35 和 14:45 的策略效果，建议使用 Vercel Pro 或外部定时服务。

## 当前结构

1. 页面入口：`ui-prototype/index.html`
2. 样式：`ui-prototype/style.css`
3. 前端交互：`ui-prototype/app.js`
4. 实时推荐 API：`api/recommendations.js`
5. 登录 API：`api/auth/login.js`
6. 用户管理 API：`api/auth/manage-users.js`
7. 自动模拟盘 API：`api/paper-trading.js`
8. 本地开发服务：`scripts/dev-server.js`
