const { bearerUser } = require("./auth/session");
const recommendations = require("./recommendations");
const quotesApi = require("./quotes");

const ACCOUNT_KEY = "lateDay:paperAccount:test:v1";
const INITIAL_CAPITAL = 100000;
const MAX_TRADES = 1000;
const MAX_EVENTS = 1200;

const DEFAULT_STRATEGY = {
  maxPositions: 3,
  maxPositionPct: 30,
  minChangePct: 3,
  maxChangePct: 18.8,
  minBoardScore: 84,
  minStockScore: 84,
  minConfidence: 70,
  maxTurnoverPct: 25,
  requireBullTrend: true,
  buyOncePerDay: true,
  strongPnlPct: 2,
  strongOpenPct: 1.5,
  strongQuoteChangePct: 3,
  flatPnlFloorPct: -1,
  flatOpenFloorPct: -1.2
};

const STRATEGY_FIELDS = [
  { key: "maxPositions", label: "最大持仓", type: "integer", min: 1, max: 8, step: 1, unit: "只", detail: "限制模拟盘同时持有的股票数量。默认 3 只，越大越分散，越小越集中。" },
  { key: "maxPositionPct", label: "单票仓位", type: "number", min: 5, max: 80, step: 1, unit: "%", detail: "单只股票最多使用初始本金的比例。默认 30%，100000 元本金时单票最多约 30000 元。" },
  { key: "minChangePct", label: "最低涨幅", type: "number", min: 0, max: 15, step: 0.1, unit: "%", detail: "候选股票当日涨幅下限。默认 3%，太低说明主动性不足。" },
  { key: "maxChangePct", label: "最高涨幅", type: "number", min: 5, max: 19.5, step: 0.1, unit: "%", detail: "候选股票当日涨幅上限。默认 18.8%，用于避开涨停和近涨停的追高票。" },
  { key: "minBoardScore", label: "板块评分", type: "integer", min: 60, max: 96, step: 1, unit: "分", detail: "所属板块最低强度评分。默认 84，要求板块先成为强方向。" },
  { key: "minStockScore", label: "个股评分", type: "integer", min: 60, max: 96, step: 1, unit: "分", detail: "个股最低评分。默认 84，综合涨幅、换手、量比、状态和日线排列。" },
  { key: "minConfidence", label: "置信度", type: "integer", min: 35, max: 92, step: 1, unit: "分", detail: "候选最低置信度。默认 70，用来过滤盘口阶段和风险扣分后的弱候选。" },
  { key: "maxTurnoverPct", label: "最高换手", type: "number", min: 5, max: 60, step: 0.5, unit: "%", detail: "候选股票最高换手率。默认 25%，超过后容易放大次日分歧。" },
  { key: "requireBullTrend", label: "日线多头", type: "boolean", unit: "", detail: "开启后只买日线多头排列股票。默认开启，对应 MA5 > MA10 > MA20 且收盘在 MA5 上方。" },
  { key: "buyOncePerDay", label: "每日一次", type: "boolean", unit: "", detail: "开启后每天只在尾盘窗口执行一次新开仓。默认开启，避免反复运行重复买入。" },
  { key: "strongPnlPct", label: "强势盈利", type: "number", min: 0, max: 10, step: 0.1, unit: "%", detail: "次日持仓浮盈达到该比例时标记强势兑现。默认 2%。" },
  { key: "strongOpenPct", label: "强势开盘", type: "number", min: 0, max: 10, step: 0.1, unit: "%", detail: "次日开盘价相对成本达到该比例时标记强势兑现。默认 1.5%。" },
  { key: "strongQuoteChangePct", label: "强势涨幅", type: "number", min: 0, max: 10, step: 0.1, unit: "%", detail: "次日个股实时涨幅达到该比例时标记强势兑现。默认 3%。" },
  { key: "flatPnlFloorPct", label: "平盘盈亏", type: "number", min: -10, max: 5, step: 0.1, unit: "%", detail: "次日浮盈亏不低于该值时标记平盘确认。默认 -1%，低于则偏弱势风控。" },
  { key: "flatOpenFloorPct", label: "平盘开盘", type: "number", min: -10, max: 5, step: 0.1, unit: "%", detail: "次日开盘相对成本不低于该值时标记平盘确认。默认 -1.2%，低于则偏弱势风控。" }
];

function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function kvUrl(pathname = "") {
  const base = String(process.env.KV_REST_API_URL || "").replace(/\/+$/, "");
  const pathPart = pathname ? `/${String(pathname).replace(/^\/+/, "")}` : "";
  return `${base}${pathPart}`;
}

async function kvRequest(pathname, init = {}) {
  const response = await fetch(kvUrl(pathname), {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      ...(init.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `KV HTTP ${response.status}`);
  return payload;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32 * 1024) reject(new Error("Request body too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function readStoredAccount() {
  if (!kvConfigured()) {
    throw new Error("未配置服务器模拟盘存储，请在 Vercel 配置 KV_REST_API_URL 和 KV_REST_API_TOKEN");
  }
  const payload = await kvRequest(`/get/${encodeURIComponent(ACCOUNT_KEY)}`);
  if (!payload.result) return null;
  return typeof payload.result === "string" ? JSON.parse(payload.result) : payload.result;
}

async function writeStoredAccount(account) {
  if (!kvConfigured()) {
    throw new Error("未配置服务器模拟盘存储，请在 Vercel 配置 KV_REST_API_URL 和 KV_REST_API_TOKEN");
  }
  await kvRequest("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(["SET", ACCOUNT_KEY, JSON.stringify(account)])
  });
}

function nowIso() {
  return new Date().toISOString();
}

function shanghaiParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = Number(values.hour || 0) % 24;
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    day: dayMap[values.weekday] ?? date.getDay(),
    minutes: hour * 60 + Number(values.minute || 0)
  };
}

function isAfterOpen(date = new Date()) {
  const parts = shanghaiParts(date);
  return parts.day >= 1 && parts.day <= 5 && parts.minutes >= 9 * 60 + 30;
}

function createAccount() {
  const createdAt = nowIso();
  return {
    userKey: "test",
    mode: "paper",
    initialCapital: INITIAL_CAPITAL,
    cash: INITIAL_CAPITAL,
    strategy: { ...DEFAULT_STRATEGY },
    positions: {},
    trades: [],
    events: [{
      id: `e_${Date.now().toString(36)}_seed`,
      createdAt,
      type: "SEED",
      title: "初始化模拟盘",
      message: "test 账户写入 100000.00 元模拟资金",
      meta: {}
    }],
    createdAt,
    updatedAt: createdAt,
    lastRunAt: "",
    lastBuyDate: "",
    lastSellDate: ""
  };
}

function recordEvent(account, type, title, message, meta = {}) {
  account.events.unshift({
    id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: nowIso(),
    type,
    title,
    message,
    meta
  });
  account.events = account.events.slice(0, MAX_EVENTS);
}

function recordTrade(account, trade) {
  account.trades.unshift({
    id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: nowIso(),
    ...trade
  });
  account.trades = account.trades.slice(0, MAX_TRADES);
}

async function loadAccount() {
  const stored = await readStoredAccount();
  if (stored) return normalizeAccount(stored);
  const account = createAccount();
  await writeStoredAccount(account);
  return account;
}

function normalizeAccount(account) {
  return {
    ...createAccount(),
    ...account,
    initialCapital: INITIAL_CAPITAL,
    strategy: normalizeStrategy(account && account.strategy),
    positions: account && account.positions && typeof account.positions === "object" ? account.positions : {},
    trades: Array.isArray(account && account.trades) ? account.trades : [],
    events: Array.isArray(account && account.events) ? account.events : []
  };
}

function normalizeStrategy(input = {}) {
  const normalized = { ...DEFAULT_STRATEGY };
  STRATEGY_FIELDS.forEach((field) => {
    const raw = input[field.key];
    if (field.type === "boolean") {
      if (typeof raw === "boolean") normalized[field.key] = raw;
      return;
    }
    const value = field.type === "integer" ? Math.round(Number(raw)) : Number(raw);
    if (!Number.isFinite(value)) return;
    normalized[field.key] = Math.min(field.max, Math.max(field.min, value));
  });
  if (normalized.maxChangePct <= normalized.minChangePct) normalized.maxChangePct = normalized.minChangePct + 0.5;
  return normalized;
}

function positionRows(account) {
  return Object.values(account.positions || {});
}

function marketValue(account) {
  return positionRows(account).reduce((sum, item) => {
    return sum + Number(item.quantity || 0) * Number(item.lastPrice || item.avgPrice || 0);
  }, 0);
}

function totalCost(account) {
  return positionRows(account).reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
}

async function refreshPositionQuotes(account) {
  const rows = positionRows(account);
  if (!rows.length) return { source: "", updatedAt: nowIso(), quotes: [] };
  const result = await quotesApi.fetchQuotes(rows.map((item) => item.code));
  const quoteMap = new Map((result.quotes || []).map((quote) => [String(quote.code), quote]));
  rows.forEach((item) => {
    const quote = quoteMap.get(String(item.code));
    if (!quote || !quote.price) return;
    const position = account.positions[item.code];
    position.name = position.name || quote.name;
    position.lastPrice = quote.price;
    position.quoteChange = quote.change;
    position.openPrice = quote.open || position.openPrice || 0;
    position.highPrice = quote.high || position.highPrice || 0;
    position.lowPrice = quote.low || position.lowPrice || 0;
    position.quoteUpdatedAt = nowIso();
  });
  return { ...result, updatedAt: nowIso() };
}

function sellTag(position, strategy) {
  const avg = Number(position.avgPrice || 0);
  const last = Number(position.lastPrice || avg);
  const open = Number(position.openPrice || 0);
  const quoteChange = Number(position.quoteChange || 0);
  const pnlPct = avg ? ((last - avg) / avg) * 100 : 0;
  const openPct = avg && open ? ((open - avg) / avg) * 100 : pnlPct;
  if (pnlPct >= strategy.strongPnlPct || openPct >= strategy.strongOpenPct || quoteChange >= strategy.strongQuoteChangePct) {
    return {
      tag: "强势兑现",
      reason: "次日开盘后有利润垫或个股涨幅强，模拟盘按尾盘买入法优先兑现。"
    };
  }
  if (pnlPct >= strategy.flatPnlFloorPct && openPct >= strategy.flatOpenFloorPct) {
    return {
      tag: "平盘确认",
      reason: "次日开盘后未明显走坏，模拟盘按纪律用当前价完成隔日处理。"
    };
  }
  return {
    tag: "弱势风控",
    reason: "次日开盘信息偏弱，模拟盘按尾盘买入法优先风控卖出。"
  };
}

async function sellEligiblePositions(account) {
  const strategy = normalizeStrategy(account.strategy);
  if (!isAfterOpen()) {
    recordEvent(account, "SKIP_SELL", "未到卖出窗口", "尾盘买入法默认等次日 9:30 后再处理持仓。");
    return 0;
  }
  await refreshPositionQuotes(account);
  const today = shanghaiParts().dateKey;
  let count = 0;
  for (const position of positionRows(account)) {
    if (position.firstBuyDate === today) continue;
    const quantity = Number(position.quantity || 0);
    const price = Number(position.lastPrice || position.avgPrice || 0);
    if (!quantity || !price) continue;
    const amount = quantity * price;
    const cost = Number(position.totalCost || 0);
    const pnl = amount - cost;
    const advice = sellTag(position, strategy);
    account.cash += amount;
    delete account.positions[position.code];
    recordTrade(account, {
      type: "SELL",
      code: position.code,
      name: position.name,
      quantity,
      price,
      amount,
      pnl,
      note: `${advice.tag}：${advice.reason}`,
      source: "auto-paper"
    });
    recordEvent(account, "SELL", `${position.name} 卖出`, `${quantity} 股 @ ${price.toFixed(2)}，${advice.tag}，盈亏 ${pnl.toFixed(2)}`, {
      code: position.code,
      quantity,
      price,
      pnl,
      tag: advice.tag
    });
    count += 1;
  }
  if (!count) recordEvent(account, "SKIP_SELL", "无可卖持仓", "没有隔夜持仓，或持仓尚未进入次日处理窗口。");
  else account.lastSellDate = today;
  return count;
}

function flattenCandidates(result, account) {
  const strategy = normalizeStrategy(account.strategy);
  const held = new Set(Object.keys(account.positions || {}));
  return (result.boards || [])
    .flatMap((board) => (board.stocks || []).map((stock) => ({ board, stock })))
    .filter(({ stock }) => !held.has(String(stock.code)))
    .filter(({ stock }) => Number(stock.price || 0) > 0)
    .filter(({ stock }) => Number(stock.change || 0) >= strategy.minChangePct && Number(stock.change || 0) <= strategy.maxChangePct)
    .filter(({ stock }) => Number(stock.turnover || 0) <= strategy.maxTurnoverPct)
    .filter(({ stock }) => stock.risk !== "高换手")
    .filter(({ board }) => Number(board.score || 0) >= strategy.minBoardScore)
    .filter(({ stock }) => stock.action === "尾盘候选" || Number(stock.score || 0) >= strategy.minStockScore)
    .filter(({ stock }) => Number(stock.score || 0) >= strategy.minStockScore)
    .filter(({ stock }) => Number(stock.confidence || 0) >= strategy.minConfidence)
    .filter(({ stock }) => !strategy.requireBullTrend || stock.trend && stock.trend.bullish)
    .sort((a, b) => {
      return Number(b.board.score || 0) - Number(a.board.score || 0)
        || Number(b.stock.score || 0) - Number(a.stock.score || 0)
        || Number(b.stock.confidence || 0) - Number(a.stock.confidence || 0);
    });
}

function buyQuantity(cash, price, slots, strategy) {
  const budget = Math.min(INITIAL_CAPITAL * strategy.maxPositionPct / 100, cash / Math.max(slots, 1));
  return Math.floor(budget / price / 100) * 100;
}

async function buyLateDayCandidates(account) {
  const strategy = normalizeStrategy(account.strategy);
  const result = await recommendations.buildRecommendations();
  if (!result.market || result.market.mode !== "late-day") {
    recordEvent(account, "SKIP_BUY", "未到尾盘买入窗口", result.market ? result.market.note : "行情状态不可用", {
      marketMode: result.market && result.market.mode
    });
    return 0;
  }
  const today = shanghaiParts().dateKey;
  if (strategy.buyOncePerDay && account.lastBuyDate === today) {
    recordEvent(account, "SKIP_BUY", "今日已执行买入", "模拟盘每天只在尾盘窗口执行一次新开仓。");
    return 0;
  }
  const slots = Math.max(0, strategy.maxPositions - positionRows(account).length);
  if (!slots) {
    recordEvent(account, "SKIP_BUY", "仓位已满", `模拟盘最多同时持有 ${strategy.maxPositions} 只。`);
    return 0;
  }
  const candidates = flattenCandidates(result, account).slice(0, slots);
  let count = 0;
  candidates.forEach(({ board, stock }, index) => {
    const price = Number(stock.price || 0);
    const quantity = buyQuantity(account.cash, price, slots - count, strategy);
    if (quantity < 100) return;
    const amount = quantity * price;
    if (amount > account.cash) return;
    account.cash -= amount;
    account.positions[stock.code] = {
      code: String(stock.code),
      name: stock.name,
      quantity,
      totalCost: amount,
      avgPrice: price,
      lastPrice: price,
      firstBuyAt: nowIso(),
      firstBuyDate: today,
      updatedAt: nowIso(),
      quoteChange: stock.change,
      boardName: board.name,
      score: stock.score,
      confidence: stock.confidence,
      rank: index + 1
    };
    recordTrade(account, {
      type: "BUY",
      code: String(stock.code),
      name: stock.name,
      quantity,
      price,
      amount,
      pnl: 0,
      note: `${board.name}｜${stock.reason}`,
      source: "auto-paper"
    });
    recordEvent(account, "BUY", `${stock.name} 买入`, `${quantity} 股 @ ${price.toFixed(2)}，板块 ${board.name}，评分 ${stock.score}`, {
      code: stock.code,
      quantity,
      price,
      board: board.name,
      score: stock.score,
      reason: stock.reason
    });
    count += 1;
  });
  if (!count) recordEvent(account, "SKIP_BUY", "没有合格买点", "本次尾盘窗口没有满足板块强度、日线多头、非近涨停过滤的候选。");
  else account.lastBuyDate = today;
  return count;
}

async function runStrategy(account, phase = "auto") {
  const runStartedAt = nowIso();
  recordEvent(account, "RUN", "自动策略运行", `阶段：${phase}`);
  let sold = 0;
  let bought = 0;
  if (phase !== "buy") sold = await sellEligiblePositions(account);
  if (phase !== "sell") bought = await buyLateDayCandidates(account);
  await refreshPositionQuotes(account).catch(() => null);
  account.lastRunAt = runStartedAt;
  account.updatedAt = nowIso();
  return { sold, bought };
}

function summary(account) {
  const cost = totalCost(account);
  const market = marketValue(account);
  const assets = Number(account.cash || 0) + market;
  return {
    initialCapital: INITIAL_CAPITAL,
    cash: Number(account.cash || 0),
    market,
    assets,
    floatingPnl: market - cost,
    totalPnl: assets - INITIAL_CAPITAL,
    positionCount: positionRows(account).length,
    tradeCount: account.trades.length
  };
}

function publicAccount(account) {
  return {
    ...account,
    strategy: normalizeStrategy(account.strategy),
    strategyFields: STRATEGY_FIELDS.map((field) => ({
      ...field,
      defaultValue: DEFAULT_STRATEGY[field.key]
    })),
    summary: summary(account)
  };
}

function canAccess(req, url) {
  const user = bearerUser(req);
  if (user && (user.key === "test" || user.role === "admin")) return true;
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  if (url.searchParams.get("run") === "1" && cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return false;
}

async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (!canAccess(req, url)) {
    res.status(403).json({ error: "需要 test 或 admin 登录权限" });
    return;
  }
  try {
    const account = await loadAccount();
    let run = null;
    if (req.method === "PUT") {
      const body = JSON.parse(await readBody(req) || "{}");
      account.strategy = normalizeStrategy(body.strategy || body);
      account.updatedAt = nowIso();
      recordEvent(account, "STRATEGY", "策略参数已更新", "test 自动模拟盘策略参数已保存到服务器。", {
        strategy: account.strategy
      });
      await writeStoredAccount(account);
    } else if (url.searchParams.get("run") === "1" || req.method === "POST") {
      const phase = url.searchParams.get("phase") || "auto";
      run = await runStrategy(account, phase);
      await writeStoredAccount(account);
    } else if (!req.method || req.method === "GET") {
      await refreshPositionQuotes(account).catch(() => null);
      account.updatedAt = nowIso();
      await writeStoredAccount(account);
    } else {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      updatedAt: nowIso(),
      run,
      account: publicAccount(account)
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

module.exports = handler;
