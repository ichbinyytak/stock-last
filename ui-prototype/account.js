const PROFILE_CACHE_KEY = "lateDay.userProfiles.v1";
const SESSION_KEY = "lateDay.session.v1";
const AUTH_TOKEN_KEY = "lateDay.authToken.v1";
const GUEST_ID = "guest";
const SCHEDULE_CHECK_MS = 60 * 1000;
const SELECTION_STRATEGY_VERSION = 12;
const DEFAULT_OPERATION_STRATEGY = {
  maxPositions: 3,
  maxPositionPct: 30,
  minChangePct: 3,
  maxChangePct: 18.8,
  minBoardScore: 84,
  minStockScore: 84,
  minConfidence: 70,
  maxTurnoverPct: 25,
  requireBullTrend: true,
  tradeMarkets: ["chinext"],
  buyOncePerDay: true,
  strongPnlPct: 2,
  strongOpenPct: 1.5,
  strongQuoteChangePct: 3,
  flatPnlFloorPct: -1,
  flatOpenFloorPct: -1.2
};
const DEFAULT_SELECTION_STRATEGY = {
  useStockChangeFilter: true,
  minStockChangePct: 3,
  maxStockChangePct: 18.8,
  minTurnoverPct: 2,
  maxTurnoverPct: 25,
  useVolumeRatioFilter: false,
  minVolumeRatio: 1,
  maxVolumeRatio: 5,
  useBoardScoreFilter: true,
  minBoardScore: 78,
  useLateMomentumSort: false,
  lateMomentumMinutes: 15,
  minLateMomentumPct: 3,
  selectionMarkets: ["chinext"],
  requireBullTrend: false,
  requireTenDayGainLimit: false,
  tenDayGainLookbackDays: 10,
  minTenDayGainPct: -100,
  maxTenDayGainPct: 60,
  requireRecentVolumeExpansion: false,
  recentVolumeLookbackDays: 10,
  minRecentHighVolumeDays: 3,
  volumeAverageDays: 120,
  requireSixtyDayHighBreakout: false,
  highBreakoutLookbackDays: 60,
  requirePreviousDayChangeLimit: true,
  maxPreviousDayChangePct: 5,
  useTurnoverVolumeRatio: false,
  requireFreeFloatCapLimit: false,
  minFreeFloatCapYi: 0,
  maxFreeFloatCapYi: 800,
  avoidNearLimit: true,
  avoidPreviousLimitMove: true,
  strictLateWindow: false
};
const DEFAULT_OPERATION_FIELDS = [
  { key: "maxPositions", label: "最大持仓", type: "integer", min: 1, max: 8, step: 1, unit: "只", detail: "限制模拟盘同时持有的股票数量。" },
  { key: "maxPositionPct", label: "单票仓位", type: "number", min: 5, max: 80, step: 1, unit: "%", detail: "单只股票最多使用初始本金的比例。" },
  { key: "minChangePct", label: "买入最低涨幅", type: "number", min: 0, max: 15, step: 0.1, unit: "%", detail: "自动买入时的个股涨幅下限。" },
  { key: "maxChangePct", label: "买入最高涨幅", type: "number", min: 5, max: 19.5, step: 0.1, unit: "%", detail: "自动买入时的个股涨幅上限，用于避开涨停和近涨停。" },
  { key: "minBoardScore", label: "买入板块评分", type: "integer", min: 60, max: 96, step: 1, unit: "分", detail: "自动买入时所属板块最低强度评分。" },
  { key: "minStockScore", label: "买入个股评分", type: "integer", min: 60, max: 96, step: 1, unit: "分", detail: "自动买入时个股最低评分。" },
  { key: "minConfidence", label: "买入置信度", type: "integer", min: 35, max: 92, step: 1, unit: "分", detail: "自动买入时最低置信度。" },
  { key: "maxTurnoverPct", label: "买入最高换手", type: "number", min: 5, max: 60, step: 0.5, unit: "%", detail: "自动买入时的最高换手率。" },
  { key: "requireBullTrend", label: "买入日线多头", type: "boolean", unit: "", detail: "开启后自动买入只选日线多头排列股票。" },
  { key: "tradeMarkets", label: "买入市场", type: "multiSelect", unit: "", options: [
    { value: "all", label: "全部" },
    { value: "chinext", label: "创业板" },
    { value: "star", label: "科创板" },
    { value: "main", label: "主板" },
    { value: "beijing", label: "北交所" }
  ], detail: "自动买入允许操作的市场范围。支持多选；勾选全部时允许所有市场，默认仅创业板。" },
  { key: "buyOncePerDay", label: "每日一次买入", type: "boolean", unit: "", detail: "开启后每天只在尾盘窗口执行一次新开仓。" },
  { key: "strongPnlPct", label: "强势盈利", type: "number", min: 0, max: 10, step: 0.1, unit: "%", detail: "次日持仓浮盈达到该比例时标记强势兑现。" },
  { key: "strongOpenPct", label: "强势开盘", type: "number", min: 0, max: 10, step: 0.1, unit: "%", detail: "次日开盘价相对成本达到该比例时标记强势兑现。" },
  { key: "strongQuoteChangePct", label: "强势涨幅", type: "number", min: 0, max: 10, step: 0.1, unit: "%", detail: "次日个股实时涨幅达到该比例时标记强势兑现。" },
  { key: "flatPnlFloorPct", label: "平盘盈亏", type: "number", min: -10, max: 5, step: 0.1, unit: "%", detail: "次日浮盈亏不低于该值时标记平盘确认。" },
  { key: "flatOpenFloorPct", label: "平盘开盘", type: "number", min: -10, max: 5, step: 0.1, unit: "%", detail: "次日开盘相对成本不低于该值时标记平盘确认。" }
].map((field) => ({ ...field, defaultValue: DEFAULT_OPERATION_STRATEGY[field.key] }));
const DEFAULT_SELECTION_FIELDS = [
  { key: "useLateMomentumSort", label: "分钟涨幅排序", type: "boolean", unit: "", detail: "开启后从14:30开始，过滤指定分钟涨幅低于下限的股票，并按该分钟涨幅降序排列。" },
  { key: "lateMomentumMinutes", label: "涨幅分钟数", type: "integer", min: 1, max: 60, step: 1, unit: "分钟", detail: "计算尾盘短周期涨幅的分钟数，默认15分钟。只有开启分钟涨幅排序时生效。" },
  { key: "minLateMomentumPct", label: "最低分钟涨幅", type: "number", min: -5, max: 20, step: 0.1, unit: "%", detail: "14:30后指定分钟涨幅下限，默认3%。" },
  { key: "useStockChangeFilter", label: "涨幅筛选", type: "boolean", unit: "", detail: "勾选后按最低涨幅和最高涨幅过滤候选；不勾选时当日涨幅只展示，不参与候选过滤。默认开启，建议先用 3%-18.8%。" },
  { key: "minStockChangePct", label: "最低涨幅", type: "number", min: 0, max: 12, step: 0.1, unit: "%", detail: "涨幅筛选开启时，候选股票当日涨幅必须大于等于该数值。默认 3%，用于确认个股有主动性。" },
  { key: "maxStockChangePct", label: "最高涨幅", type: "number", min: 5, max: 19.5, step: 0.1, unit: "%", detail: "涨幅筛选开启时，候选股票当日涨幅必须小于等于该数值。默认 18.8%，用于避开涨停和近涨停追高。" },
  { key: "useTurnoverVolumeRatio", label: "换手筛选", type: "boolean", unit: "", detail: "勾选后按最低换手和最高换手过滤候选；不勾选时换手率只展示，不参与筛选。" },
  { key: "minTurnoverPct", label: "最低换手", type: "number", min: 0, max: 20, step: 0.1, unit: "%", detail: "换手筛选开启时，候选股票换手率必须大于等于该数值。默认 2%。" },
  { key: "maxTurnoverPct", label: "最高换手", type: "number", min: 5, max: 60, step: 0.5, unit: "%", detail: "换手筛选开启时，候选股票换手率必须小于等于该数值。默认 25%。" },
  { key: "useVolumeRatioFilter", label: "量比筛选", type: "boolean", unit: "", detail: "勾选后按最低量比和最高量比过滤候选；不勾选时量比只展示。量比 = 当前平均每分钟成交量 / 过去5个交易日平均每分钟成交量。默认关闭，建议先用 1.0-5.0。" },
  { key: "minVolumeRatio", label: "最低量比", type: "number", min: 0, max: 8, step: 0.1, unit: "", detail: "量比筛选开启时，候选股票量比必须大于等于该数值。默认 1.0。低于 1 通常表示当前成交节奏弱于过去5日均值。" },
  { key: "maxVolumeRatio", label: "最高量比", type: "number", min: 1, max: 20, step: 0.1, unit: "", detail: "量比筛选开启时，候选股票量比必须小于等于该数值。默认 5.0。过高量比可能意味着突发放量、分歧加大或消息刺激。" },
  { key: "useBoardScoreFilter", label: "板块评分", type: "boolean", unit: "", detail: "勾选后按最低板块评分过滤候选；不勾选时不按板块强度过滤，只把板块评分作为展示和排序参考。默认开启。" },
  { key: "minBoardScore", label: "板块评分", type: "integer", min: 60, max: 96, step: 1, unit: "分", detail: "板块评分筛选开启时，看板展示的最低板块强度。默认 78 分。" },
  { key: "selectionMarkets", label: "选股市场", type: "multiSelect", unit: "", options: [
    { value: "all", label: "全部" },
    { value: "chinext", label: "创业板" },
    { value: "star", label: "科创板" },
    { value: "main", label: "主板" },
    { value: "beijing", label: "北交所" }
  ], detail: "看板候选允许展示的市场范围。支持多选；勾选全部时显示所有市场，默认创业板。" },
  { key: "requireBullTrend", label: "日线多头", type: "boolean", unit: "", detail: "开启后看板只显示日线多头排列候选。默认关闭，避免候选被全部筛空。" },
  { key: "requireTenDayGainLimit", label: "涨幅限制", type: "boolean", unit: "", detail: "勾选后按指定交易日内的累计涨幅区间过滤候选；不勾选时该周期涨幅只展示。默认关闭；开启后建议 10日 -100%-60%，等价于只限制最近10日涨幅不大于60%。" },
  { key: "tenDayGainLookbackDays", label: "涨幅观察日数", type: "integer", min: 3, max: 60, step: 1, unit: "日", detail: "计算累计涨幅的交易日数量，默认10日。" },
  { key: "minTenDayGainPct", label: "最低区间涨幅", type: "number", min: -100, max: 200, step: 1, unit: "%", detail: "涨幅限制开启时，候选股票指定周期累计涨幅必须大于等于该数值。默认 -100%。" },
  { key: "maxTenDayGainPct", label: "最高区间涨幅", type: "number", min: -100, max: 300, step: 1, unit: "%", detail: "涨幅限制开启时，候选股票指定周期累计涨幅必须小于等于该数值。默认60%。" },
  { key: "requireRecentVolumeExpansion", label: "成交量限制", type: "boolean", unit: "", detail: "勾选后要求指定观察期内，至少有指定天数成交量大于长期平均成交量。默认关闭；开启后建议 10日内3天成交量大于120日平均成交量。" },
  { key: "recentVolumeLookbackDays", label: "成交量观察日数", type: "integer", min: 3, max: 30, step: 1, unit: "日", detail: "统计放量次数的观察窗口，默认10日。" },
  { key: "minRecentHighVolumeDays", label: "最低放量天数", type: "integer", min: 1, max: 20, step: 1, unit: "天", detail: "观察窗口内成交量高于长期均量的最低天数，默认3天。" },
  { key: "volumeAverageDays", label: "成交量平均日数", type: "integer", min: 20, max: 250, step: 5, unit: "日", detail: "长期平均成交量周期，默认120日。" },
  { key: "requireSixtyDayHighBreakout", label: "新高观察周期", type: "boolean", unit: "", detail: "勾选后要求当前实时价格达到指定观察周期内已完成交易日的最高价。默认关闭；开启后建议60日。" },
  { key: "highBreakoutLookbackDays", label: "新高观察周期", type: "integer", min: 20, max: 120, step: 5, unit: "日", detail: "计算阶段高点的交易日数量，默认60日。只有开启新高观察周期时生效。" },
  { key: "requirePreviousDayChangeLimit", label: "昨日最高涨幅", type: "boolean", unit: "", detail: "勾选后按昨日收盘价相对前日收盘价的实际涨幅上限过滤。默认小于5%。" },
  { key: "maxPreviousDayChangePct", label: "昨日最高涨幅", type: "number", min: -5, max: 20, step: 0.1, unit: "%", detail: "昨日实际涨幅必须小于该值，默认小于5%。" },
  { key: "requireFreeFloatCapLimit", label: "流通市值筛选", type: "boolean", unit: "", detail: "勾选后按最低流通市值和最高流通市值过滤候选；不勾选时流通市值只展示。公开行情使用流通市值作为自由流通市值的近似口径。默认关闭；开启后建议先用 0-800 亿。" },
  { key: "minFreeFloatCapYi", label: "最低流通市值", type: "number", min: 0, max: 5000, step: 10, unit: "亿", detail: "流通市值筛选开启时，候选股票流通市值必须大于等于该数值。默认 0 亿。" },
  { key: "maxFreeFloatCapYi", label: "最高流通市值", type: "number", min: 10, max: 5000, step: 10, unit: "亿", detail: "流通市值筛选开启时，候选股票流通市值必须小于等于该数值。默认 800 亿。" },
  { key: "avoidNearLimit", label: "避开近涨停", type: "boolean", unit: "", detail: "开启后涨停和近涨停只作板块锚点。" },
  { key: "avoidPreviousLimitMove", label: "前日涨跌停", type: "boolean", unit: "", detail: "勾选后过滤前一交易日涨停或跌停的个股。系统按前一交易日收盘涨跌幅和对应市场涨跌停阈值判断。默认开启，用来避开前一天已经极端高潮或极端恐慌的股票。" },
  { key: "strictLateWindow", label: "仅尾盘候选", type: "boolean", unit: "", detail: "开启后只有尾盘窗口才显示买点候选。" }
].map((field) => ({ ...field, defaultValue: DEFAULT_SELECTION_STRATEGY[field.key] }));
const STOCK_SCORE_DISPLAY_FIELD = {
  key: "stockScoreDisplay",
  label: "策略评分",
  type: "display",
  unit: "",
  defaultValue: "自动计算",
  detail: "策略评分根据当前选股参数自动计算，用来判断这套规则偏保守还是偏激进。它不是某一只股票的真实个股评分，也不提供手动输入。"
};

let currentUser = null;
let authToken = "";
let positions = {};
let account = {
  initialCapital: 0,
  cash: 0,
  updatedAt: ""
};
let trades = [];
let paperEvents = [];
let paperMode = false;
let paperSnapshot = null;
let paperStrategy = { ...DEFAULT_OPERATION_STRATEGY };
let strategyFields = DEFAULT_OPERATION_FIELDS;
let selectionStrategy = { ...DEFAULT_SELECTION_STRATEGY };
let selectionStrategyFields = DEFAULT_SELECTION_FIELDS;
let editingCode = "";
let quoteTimer = null;
let autoRefreshEnabled = false;
let paperAccountSignature = "";

function shanghaiClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = Number(values.hour || 0) % 24;
  return {
    day: dayMap[values.weekday] ?? date.getDay(),
    minutes: hour * 60 + Number(values.minute || 0)
  };
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function userScope() {
  return currentUser ? currentUser.id : GUEST_ID;
}

function scopedKey(name) {
  return `lateDay.${userScope()}.${name}.v1`;
}

function strategyKey(name) {
  return scopedKey(name);
}

function loadProfileCache() {
  return readJson(PROFILE_CACHE_KEY, {});
}

function saveProfileCache(users) {
  writeJson(PROFILE_CACHE_KEY, users);
}

function cacheUserProfile(user) {
  const users = loadProfileCache();
  users[user.key] = user;
  saveProfileCache(users);
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "--";
  return amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatPercent(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "--";
  return `${amount >= 0 ? "+" : ""}${amount.toFixed(2)}%`;
}

function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function marketRefreshWindow(date = new Date()) {
  const { day, minutes } = shanghaiClock(date);
  const isWeekday = day >= 1 && day <= 5;
  const auction = minutes >= 9 * 60 + 15 && minutes < 9 * 60 + 30;
  const morning = minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30;
  const afternoon = minutes >= 13 * 60 && minutes <= 15 * 60;
  return isWeekday && (auction || morning || afternoon);
}

function isAfterNextOpen(position) {
  const base = new Date(position.firstBuyAt || position.updatedAt || 0);
  if (!base.getTime()) return false;
  const { day, minutes } = shanghaiClock();
  const now = new Date();
  const nowDay = now.toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" });
  const baseDay = base.toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" });
  return day >= 1 && day <= 5 && nowDay !== baseDay && minutes >= 9 * 60 + 30;
}

function sellAdvice(position) {
  const avg = Number(position.avgPrice || 0);
  const last = Number(position.lastPrice || avg);
  const open = Number(position.openPrice || 0);
  const high = Number(position.highPrice || 0);
  const low = Number(position.lowPrice || 0);
  const quoteChange = Number(position.quoteChange || 0);
  const pnlPct = avg ? ((last - avg) / avg) * 100 : 0;
  const openPct = avg && open ? ((open - avg) / avg) * 100 : pnlPct;
  const strategy = { ...DEFAULT_OPERATION_STRATEGY, ...paperStrategy };
  const firstPush = Math.max(last * 1.008, avg * 1.015, open ? open * 1.01 : 0);
  const flatLine = Math.max(avg, last * 0.995);
  const riskLine = Math.min(avg * 0.98, last * 0.985);
  const quoteLine = `开 ${formatCurrency(open || last)} / 现 ${formatCurrency(last)} / 涨幅 ${formatPercent(quoteChange)}`;
  const rangeLine = high || low ? `高 ${formatCurrency(high)} / 低 ${formatCurrency(low)}` : "高低点等待行情刷新";
  if (!isAfterNextOpen(position)) {
    return {
      tag: "未到次日",
      text: "尾盘买入法默认等次日开盘后再处理。",
      prices: `观察价 ${formatCurrency(avg)}`,
      targetPrice: last || avg,
      detail: [
        "尚未进入次日 9:30 后的卖出决策区。",
        "当前只做持仓观察，不把尾盘买入临时转成长线。",
        quoteLine
      ]
    };
  }
  if (pnlPct >= strategy.strongPnlPct || openPct >= strategy.strongOpenPct || quoteChange >= strategy.strongQuoteChangePct) {
    return {
      tag: "强势兑现",
      text: "开盘或盘中强于成本，第一波冲高优先分批卖出。",
      prices: `冲高卖 ${formatCurrency(firstPush)} / 回落守 ${formatCurrency(flatLine)}`,
      targetPrice: firstPush,
      detail: [
        "开盘后已经有利润垫或个股涨幅强，尾盘买入法优先把隔夜利润兑现。",
        "如果第一波冲高无量或冲高回落，回落守线附近先降低仓位。",
        quoteLine,
        rangeLine
      ]
    };
  }
  if (pnlPct >= strategy.flatPnlFloorPct && openPct >= strategy.flatOpenFloorPct) {
    return {
      tag: "平盘确认",
      text: "等开盘10-30分钟，量价不主动则降低仓位。",
      prices: `减仓线 ${formatCurrency(flatLine)} / 风控 ${formatCurrency(riskLine)}`,
      targetPrice: flatLine,
      detail: [
        "开盘没有明显走坏，先看 10-30 分钟承接和板块强度。",
        "如果不能站回均价或现价持续弱于开盘价，按减仓线处理。",
        quoteLine,
        rangeLine
      ]
    };
  }
  return {
    tag: "弱势风控",
    text: "弱开或板块掉队，优先卖出，不转成长线。",
    prices: `风控卖 ${formatCurrency(last)} / 硬止 ${formatCurrency(riskLine)}`,
    targetPrice: last || riskLine,
    detail: [
      "开盘信息偏弱，说明隔夜预期没有兑现，尾盘买入法不适合扛成波段。",
      "优先用现价或反抽价处理，跌破硬止线不再等待。",
      quoteLine,
      rangeLine
    ]
  };
}

function setMessage(message, type = "") {
  const node = document.getElementById("accountMessage");
  if (!node) return;
  node.textContent = message || "";
  node.className = `auth-message ${type}`;
}

function openModal(id) {
  if (!currentUser && id !== "loginModal") {
    openModal("loginModal");
    setMessage("请先登录", "error");
    return;
  }
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("hidden");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("hidden");
}

function resetStrategyDefaults() {
  paperStrategy = { ...DEFAULT_OPERATION_STRATEGY };
  strategyFields = DEFAULT_OPERATION_FIELDS;
  selectionStrategy = { ...DEFAULT_SELECTION_STRATEGY };
  selectionStrategyFields = DEFAULT_SELECTION_FIELDS;
}

function migrateStoredSelectionStrategy(stored) {
  const next = stored && typeof stored === "object" ? { ...stored } : {};
  const storedVersion = Number(readJson(strategyKey("selectionStrategyVersion"), 0)) || 0;
  delete next.onlyChiNextCandidates;
  if (storedVersion < 11 && Array.isArray(next.selectionMarkets) && next.selectionMarkets.length === 1 && next.selectionMarkets[0] === "all") {
    next.selectionMarkets = DEFAULT_SELECTION_STRATEGY.selectionMarkets;
  }
  if (storedVersion < 12) {
    ["requireTenDayGainLimit", "requireRecentVolumeExpansion", "requireSixtyDayHighBreakout", "requireFreeFloatCapLimit"].forEach((key) => {
      if (next[key] === true) next[key] = DEFAULT_SELECTION_STRATEGY[key];
    });
  }
  delete next.preferElastic20cm;
  delete next.maxPreviousBullBodyPct;
  delete next.requirePreviousDayPattern;
  delete next.minBoardBreadthPct;
  delete next.minActiveStocks;
  if (!storedVersion && next.requireBullTrend === true) {
    next.requireBullTrend = DEFAULT_SELECTION_STRATEGY.requireBullTrend;
    writeJson(strategyKey("selectionStrategy"), next);
  }
  writeJson(strategyKey("selectionStrategyVersion"), SELECTION_STRATEGY_VERSION);
  return next;
}

function loadLocalStrategies() {
  paperStrategy = {
    ...DEFAULT_OPERATION_STRATEGY,
    ...readJson(strategyKey("operationStrategy"), {})
  };
  selectionStrategy = {
    ...DEFAULT_SELECTION_STRATEGY,
    ...migrateStoredSelectionStrategy(readJson(strategyKey("selectionStrategy"), {}))
  };
  strategyFields = DEFAULT_OPERATION_FIELDS;
  selectionStrategyFields = DEFAULT_SELECTION_FIELDS;
}

function saveLocalStrategies() {
  writeJson(strategyKey("operationStrategy"), paperStrategy);
  writeJson(strategyKey("selectionStrategy"), selectionStrategy);
  writeJson(strategyKey("selectionStrategyVersion"), SELECTION_STRATEGY_VERSION);
}

function normalizeFieldValue(field, rawValue) {
  if (field.type === "multiSelect") {
    return Array.isArray(rawValue) ? rawValue : field.defaultValue;
  }
  if (field.type === "boolean") {
    return Boolean(rawValue);
  }
  const value = field.type === "integer" ? Math.round(Number(rawValue)) : Number(rawValue);
  if (!Number.isFinite(value)) return field.defaultValue;
  return value;
}

function strategyValueText(value, field) {
  if (field.type === "display") return String(value || field.defaultValue || "");
  if (field.type === "boolean") return value ? "开" : "关";
  if (field.type === "multiSelect") {
    const selected = Array.isArray(value) ? value : [];
    const labels = new Map((field.options || []).map((option) => [option.value, option.label]));
    return selected.map((item) => labels.get(item) || item).join("、") || strategyValueText(field.defaultValue, field);
  }
  return `${value}${field.unit || ""}`;
}

function sameStrategyValue(a, b, field) {
  if (field.type === "multiSelect") {
    const left = Array.isArray(a) ? [...a].sort() : [];
    const right = Array.isArray(b) ? [...b].sort() : [];
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
  return normalizeFieldValue(field, a) === normalizeFieldValue(field, b);
}

function isCustomStrategyValue(field, strategy) {
  return !sameStrategyValue(strategy[field.key], field.defaultValue, field);
}

function rowDisabledAttr(isCustom) {
  return isCustom ? "" : "disabled";
}

function isStrategyFieldEnabled(field, prefix) {
  if (field.type === "boolean") return true;
  if (prefix === "selection" && ["lateMomentumMinutes", "minLateMomentumPct"].includes(field.key)) return true;
  if (prefix === "selection" && ["minStockChangePct", "maxStockChangePct"].includes(field.key)) return true;
  if (prefix === "selection" && ["minTurnoverPct", "maxTurnoverPct"].includes(field.key)) return true;
  if (prefix === "selection" && ["minVolumeRatio", "maxVolumeRatio"].includes(field.key)) return true;
  if (prefix === "selection" && ["minBoardScore"].includes(field.key)) return true;
  if (prefix === "selection" && ["tenDayGainLookbackDays", "minTenDayGainPct", "maxTenDayGainPct"].includes(field.key)) return true;
  if (prefix === "selection" && ["recentVolumeLookbackDays", "minRecentHighVolumeDays", "volumeAverageDays"].includes(field.key)) return true;
  if (prefix === "selection" && ["highBreakoutLookbackDays"].includes(field.key)) return true;
  if (prefix === "selection" && ["maxPreviousDayChangePct"].includes(field.key)) return true;
  if (prefix === "selection" && ["minFreeFloatCapYi", "maxFreeFloatCapYi"].includes(field.key)) return true;
  const key = field.key;
  const enableKey = prefix === "selection" && ["lateMomentumMinutes", "minLateMomentumPct"].includes(key)
    ? "useLateMomentumSort"
    : key;
  const input = document.querySelector(`[data-${prefix}-enable="${enableKey}"]`);
  return Boolean(input && input.checked);
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calculateSelectionStrategyScore(strategy = selectionStrategy) {
  let score = 50;
  const minChange = Number(strategy.minStockChangePct);
  const maxChange = Number(strategy.maxStockChangePct);
  if (strategy.useStockChangeFilter) {
    score += 5;
    if (Number.isFinite(minChange)) score += (minChange - 3) * 2;
    if (Number.isFinite(maxChange)) score += (18.8 - maxChange) * 1.4;
  } else {
    score -= 8;
  }

  const minTurnover = Number(strategy.minTurnoverPct);
  const maxTurnover = Number(strategy.maxTurnoverPct);
  if (strategy.useTurnoverVolumeRatio) {
    score += 4;
    if (Number.isFinite(minTurnover)) score += (minTurnover - 2) * 0.7;
    if (Number.isFinite(maxTurnover)) score += (25 - maxTurnover) * 0.35;
  } else {
    score -= 3;
  }

  const minVolumeRatio = Number(strategy.minVolumeRatio);
  const maxVolumeRatio = Number(strategy.maxVolumeRatio);
  if (strategy.useVolumeRatioFilter) {
    score += 4;
    if (Number.isFinite(minVolumeRatio)) score += (minVolumeRatio - 1) * 3;
    if (Number.isFinite(maxVolumeRatio)) score += (5 - maxVolumeRatio) * 1.2;
  } else {
    score -= 2;
  }

  if (strategy.useBoardScoreFilter) {
    score += 4 + (Number(strategy.minBoardScore) - 78) * 0.45;
  } else {
    score -= 4;
  }

  const markets = Array.isArray(strategy.selectionMarkets) ? strategy.selectionMarkets : DEFAULT_SELECTION_STRATEGY.selectionMarkets;
  if (markets.includes("all")) score -= 5;
  else score += clampNumber(7 - markets.length * 2, 1, 7);

  if (strategy.requireBullTrend) score += 8;
  if (strategy.requireTenDayGainLimit) score += 4 + (10 - Number(strategy.tenDayGainLookbackDays)) * 0.15 + Number(strategy.minTenDayGainPct) * 0.03 + (60 - Number(strategy.maxTenDayGainPct)) * 0.08;
  if (strategy.requireRecentVolumeExpansion) score += 5 + (Number(strategy.minRecentHighVolumeDays) - 3) * 1.2 + (10 - Number(strategy.recentVolumeLookbackDays)) * 0.12 + (120 - Number(strategy.volumeAverageDays)) * 0.015;
  if (strategy.requireSixtyDayHighBreakout) score += 8;
  if (strategy.requirePreviousDayChangeLimit) score += 3 + (5 - Number(strategy.maxPreviousDayChangePct)) * 0.5;
  if (strategy.requireFreeFloatCapLimit) score += 4 + Number(strategy.minFreeFloatCapYi) * 0.01 + (800 - Number(strategy.maxFreeFloatCapYi)) * 0.01;
  if (strategy.avoidNearLimit) score += 3;
  if (strategy.avoidPreviousLimitMove) score += 4;
  if (strategy.strictLateWindow) score += 5;
  if (strategy.useLateMomentumSort) score += 5 + (Number(strategy.minLateMomentumPct) - 3) * 1.2;

  const finalScore = Math.round(clampNumber(score, 0, 100));
  const label = finalScore >= 78
    ? "保守"
    : finalScore >= 62
      ? "偏保守"
      : finalScore >= 45
        ? "平衡"
        : finalScore >= 30
          ? "偏激进"
          : "激进";
  const hint = finalScore >= 78
    ? "候选少，质量要求高"
    : finalScore >= 62
      ? "候选偏少，重视确定性"
      : finalScore >= 45
        ? "候选适中"
        : finalScore >= 30
          ? "候选偏多，容忍度更高"
          : "候选很多，过滤较少";
  return { score: finalScore, label, hint };
}

function updateSelectionScorePreview() {
  const valueNode = document.querySelector("[data-selection-score-value]");
  const labelNode = document.querySelector("[data-selection-score-label]");
  if (!valueNode || !labelNode) return;
  const preview = calculateSelectionStrategyScore(readSelectionStrategyForm(false));
  valueNode.textContent = `${preview.score}分`;
  labelNode.textContent = preview.label;
  labelNode.title = preview.hint;
}

function setMultiSelectValue(field, prefix, value) {
  const selected = Array.isArray(value) ? value : field.defaultValue;
  document.querySelectorAll(`[data-${prefix}-key="${field.key}"]`).forEach((input) => {
    input.checked = selected.includes(input.value);
  });
}

function setStrategyInputValue(field, prefix, value) {
  if (field.type === "multiSelect") {
    setMultiSelectValue(field, prefix, value);
    return;
  }
  const input = document.querySelector(`[data-${prefix}-key="${field.key}"]`);
  if (!input) return;
  if (field.type === "boolean") input.checked = Boolean(value);
  else input.value = Number(value);
}

function setStrategyControlsDisabled(field, prefix, disabled) {
  document.querySelectorAll(`[data-${prefix}-key="${field.key}"]`).forEach((input) => {
    input.disabled = disabled;
  });
}

function updateStrategyRowState(field, prefix, enabled) {
  if (field.type === "boolean") return;
  const row = document.querySelector(`[data-${prefix}-enable="${field.key}"]`)?.closest(".strategy-row");
  if (row) {
    row.classList.toggle("is-custom", enabled);
    row.classList.toggle("is-default", !enabled);
  }
  setStrategyControlsDisabled(field, prefix, !enabled);
  if (!enabled) setStrategyInputValue(field, prefix, field.defaultValue);
}

function updateMomentumRowState(enabled) {
  const row = document.querySelector('[data-selection-key="useLateMomentumSort"]')?.closest(".strategy-row");
  if (row) {
    row.classList.toggle("is-custom", enabled);
    row.classList.toggle("is-default", !enabled);
  }
}

function loadUserData() {
  positions = readJson(scopedKey("positions"), {});
  account = readJson(scopedKey("account"), {
    initialCapital: 0,
    cash: 0,
    updatedAt: ""
  });
  trades = readJson(scopedKey("trades"), []);
  paperEvents = [];
  paperSnapshot = null;
  loadLocalStrategies();
}

function savePositions() {
  writeJson(scopedKey("positions"), positions);
}

function saveAccount() {
  writeJson(scopedKey("account"), {
    initialCapital: Number(account.initialCapital || 0),
    cash: Number(account.cash || 0),
    updatedAt: new Date().toISOString()
  });
}

function saveTrades() {
  writeJson(scopedKey("trades"), trades.slice(0, 500));
}

function appendTrade(trade) {
  trades.unshift({
    id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...trade
  });
  saveTrades();
}

function startUserSession(user, token = authToken) {
  currentUser = user;
  authToken = token || "";
  paperMode = currentUser && currentUser.key === "test";
  localStorage.setItem(SESSION_KEY, user.key);
  if (authToken) localStorage.setItem(AUTH_TOKEN_KEY, authToken);
  loadUserData();
  renderAll();
  schedulePositionRefresh();
  if (paperMode) loadPaperAccount(false).catch((error) => {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  });
  if (currentUser.role === "admin") loadAdminUsers();
}

async function loginUser(username, password) {
  let response;
  let payload = {};
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
  } catch {
      throw new Error("登录接口不可用，请用 npm run dev 后打开 http://localhost:4173/account.html");
  }
  const text = await response.text();
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("登录接口返回异常，请确认不是直接打开 HTML 文件");
  }
  let user = response.ok ? payload.user : null;
  if (!user) throw new Error(payload.error || "账号或密码不正确");
  if (!user) throw new Error("登录接口未返回用户信息");
  cacheUserProfile(user);
  startUserSession(user, payload.token || "");
  setMessage("登录成功", "ok");
  closeModal("loginModal");
  document.getElementById("accountPassword").value = "";
}

async function createManagedUser(username, password) {
  if (!currentUser || currentUser.role !== "admin") throw new Error("只有超级用户可以新增用户");
  const response = await fetch("/api/auth/manage-users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "保存用户失败");
  renderAdminUsers(payload.users || []);
}

function syncPaperAccount(snapshot) {
  paperSnapshot = snapshot;
  const summary = snapshot.summary || {};
  const useServerStrategies = snapshot.storageConfigured === true;
  const localOperationStrategy = readJson(strategyKey("operationStrategy"), {});
  const localSelectionStrategy = migrateStoredSelectionStrategy(readJson(strategyKey("selectionStrategy"), {}));
  account = {
    initialCapital: Number(summary.initialCapital || snapshot.initialCapital || 100000),
    cash: Number(summary.cash || snapshot.cash || 0),
    updatedAt: snapshot.updatedAt || ""
  };
  positions = snapshot.positions || {};
  trades = Array.isArray(snapshot.trades) ? snapshot.trades : [];
  paperEvents = Array.isArray(snapshot.events) ? snapshot.events : [];
  paperStrategy = {
    ...DEFAULT_OPERATION_STRATEGY,
    ...(useServerStrategies ? snapshot.strategy || {} : localOperationStrategy)
  };
  strategyFields = Array.isArray(snapshot.strategyFields) && snapshot.strategyFields.length ? snapshot.strategyFields : DEFAULT_OPERATION_FIELDS;
  const snapshotSelectionStrategy = {
    ...(useServerStrategies ? snapshot.selectionStrategy || {} : localSelectionStrategy)
  };
  if (useServerStrategies && !Number(snapshot.selectionStrategyVersion) && snapshotSelectionStrategy.requireBullTrend === true) {
    snapshotSelectionStrategy.requireBullTrend = DEFAULT_SELECTION_STRATEGY.requireBullTrend;
  }
  selectionStrategy = { ...DEFAULT_SELECTION_STRATEGY, ...snapshotSelectionStrategy };
  selectionStrategyFields = Array.isArray(snapshot.selectionStrategyFields) && snapshot.selectionStrategyFields.length ? snapshot.selectionStrategyFields : DEFAULT_SELECTION_FIELDS;
  saveLocalStrategies();
}

function paperDataSignature(snapshot) {
  return JSON.stringify(snapshot, (key, value) => (
    key === "updatedAt" || key === "quoteUpdatedAt" || key === "lastRunAt" ? undefined : value
  ));
}

async function loadPaperAccount(run = false, reschedule = true) {
  if (!currentUser || !paperMode) return;
  const response = await fetch(`/api/paper-trading${run ? "?run=1" : ""}`, {
    method: run ? "POST" : "GET",
    headers: { Authorization: `Bearer ${authToken}` },
    cache: "no-store"
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "加载模拟盘失败");
  const nextSignature = paperDataSignature(payload.account);
  if (!run && nextSignature === paperAccountSignature) {
    if (reschedule) schedulePositionRefresh();
    return;
  }
  paperAccountSignature = nextSignature;
  syncPaperAccount(payload.account);
  renderAll();
  if (reschedule) schedulePositionRefresh();
  const result = payload.run ? `买入 ${payload.run.bought} / 卖出 ${payload.run.sold}` : "模拟盘已同步";
  setMessage(result, "ok");
}

async function savePaperStrategy(strategy) {
  if (!currentUser) throw new Error("请先登录");
  paperStrategy = { ...DEFAULT_OPERATION_STRATEGY, ...strategy };
  saveLocalStrategies();
  if (!paperMode) {
    renderAll();
    setMessage("操作策略参数已保存", "ok");
    return;
  }
  const response = await fetch("/api/paper-trading", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ strategy })
  });
  const payload = await response.json();
  if (!response.ok) {
    if (String(payload.error || "").includes("未配置服务器模拟盘存储")) {
      renderAll();
      setMessage("操作策略参数已保存到本地", "ok");
      return;
    }
    throw new Error(payload.error || "保存策略失败");
  }
  syncPaperAccount(payload.account);
  renderAll();
  setMessage("操作策略参数已保存", "ok");
}

async function saveSelectionStrategy(nextSelectionStrategy) {
  if (!currentUser) throw new Error("请先登录");
  selectionStrategy = { ...DEFAULT_SELECTION_STRATEGY, ...nextSelectionStrategy };
  saveLocalStrategies();
  if (!paperMode) {
    renderAll();
    setMessage("选股策略参数已保存，回到看板刷新后生效", "ok");
    return;
  }
  const response = await fetch("/api/paper-trading", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ selectionStrategy: nextSelectionStrategy })
  });
  const payload = await response.json();
  if (!response.ok) {
    if (String(payload.error || "").includes("未配置服务器模拟盘存储")) {
      renderAll();
      setMessage("选股策略参数已保存到本地，回到看板刷新后生效", "ok");
      return;
    }
    throw new Error(payload.error || "保存选股策略失败");
  }
  syncPaperAccount(payload.account);
  renderAll();
  setMessage("选股策略参数已保存，回到看板刷新后生效", "ok");
}

function logoutUser() {
  if (quoteTimer) {
    clearInterval(quoteTimer);
    quoteTimer = null;
  }
  currentUser = null;
  authToken = "";
  paperMode = false;
  paperSnapshot = null;
  paperEvents = [];
  resetStrategyDefaults();
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  positions = {};
  trades = [];
  account = { initialCapital: 0, cash: 0, updatedAt: "" };
  renderAll();
  setMessage("已退出", "ok");
}

function positionRows() {
  return Object.values(positions || {}).sort((a, b) => String(a.code).localeCompare(String(b.code)));
}

function calcSummary() {
  const rows = positionRows();
  const cost = rows.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
  const market = rows.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.lastPrice || item.avgPrice || 0), 0);
  const floating = market - cost;
  const cash = Number(account.cash || 0);
  const initial = Number(account.initialCapital || 0);
  const assets = cash + market;
  const totalPnl = initial ? assets - initial : floating;
  return { rows, cost, market, floating, cash, initial, assets, totalPnl };
}

function renderAll() {
  const logged = Boolean(currentUser);
  const isAdmin = logged && currentUser.role === "admin";
  document.getElementById("authState").textContent = logged ? `已登录：${currentUser.username}` : "未登录";
  document.getElementById("accountTitle").textContent = paperMode ? "test 自动模拟盘" : logged ? `${currentUser.username} 的账户` : "账户数据";
  document.getElementById("accountUserLabel").textContent = logged ? currentUser.username : "请先登录";
  document.getElementById("accountLogoutBtn").disabled = !logged;
  document.getElementById("openPasswordBtn").disabled = true;
  document.getElementById("openPasswordBtn").title = "预置账号暂不支持自助改密";
  document.getElementById("openMoneyBtn").disabled = !logged || paperMode;
  document.getElementById("openTradeBtn").disabled = !logged || paperMode;
  document.getElementById("syncPaperBtn").classList.toggle("hidden", !paperMode);
  document.getElementById("runPaperBtn").classList.toggle("hidden", !paperMode);
  document.getElementById("paperStrategySection").classList.toggle("hidden", !logged);
  document.getElementById("selectionStrategySection").classList.toggle("hidden", !logged);
  document.getElementById("accountLoginNote").classList.toggle("hidden", logged);
  document.querySelectorAll(".auth-only").forEach((node) => node.classList.toggle("hidden", !logged));
  document.getElementById("adminSection").classList.toggle("hidden", !isAdmin);
  document.querySelectorAll(".locked").forEach((node) => node.classList.toggle("disabled", !logged));
  renderPaperStatus();
  renderStrategyPanel();
  renderSelectionStrategyPanel();

  document.getElementById("initialCapital").value = logged ? Number(account.initialCapital || 0).toFixed(2) : "";
  document.getElementById("cashAmount").value = logged ? Number(account.cash || 0).toFixed(2) : "";

  renderSummary();
  renderPositions();
  renderHistory();
  renderAdminUsers();
}

function renderSummary() {
  const summary = calcSummary();
  document.getElementById("sumInitial").textContent = formatCurrency(summary.initial);
  document.getElementById("sumCash").textContent = formatCurrency(summary.cash);
  document.getElementById("sumMarket").textContent = formatCurrency(summary.market);
  document.getElementById("sumAssets").textContent = formatCurrency(summary.assets);
  document.getElementById("sumFloat").textContent = formatCurrency(summary.floating);
  document.getElementById("sumTotalPnl").textContent = formatCurrency(summary.totalPnl);
}

function renderPaperStatus() {
  const node = document.getElementById("paperStatusLine");
  if (!node) return;
  node.classList.toggle("hidden", !paperMode);
  if (!paperMode) {
    node.textContent = "";
    return;
  }
  const summary = paperSnapshot && paperSnapshot.summary ? paperSnapshot.summary : calcSummary();
  const lastRun = paperSnapshot && paperSnapshot.lastRunAt ? formatDate(paperSnapshot.lastRunAt) : "--";
  node.innerHTML = `
    <span>自动模拟</span>
    <strong>本金 ${formatCurrency(summary.initialCapital || 100000)}</strong>
    <strong>总盈亏 ${formatCurrency(summary.totalPnl || 0)}</strong>
    <span>持仓 ${summary.positionCount || positionRows().length}</span>
    <span>操作 ${summary.tradeCount || trades.length}</span>
    <span>运行 ${lastRun}</span>
  `;
}

function renderStrategyPanel() {
  const list = document.getElementById("strategyList");
  if (!list) return;
  if (!currentUser) {
    list.innerHTML = "";
    return;
  }
  if (!strategyFields.length) {
    list.innerHTML = `<div class="portfolio-empty">操作策略参数同步后显示</div>`;
    return;
  }
  list.innerHTML = strategyFields.map((field) => {
    const value = paperStrategy[field.key] ?? field.defaultValue;
    const custom = field.type === "boolean" ? true : isCustomStrategyValue(field, paperStrategy);
    const disabled = rowDisabledAttr(custom);
    const control = field.type === "boolean"
      ? `<input class="strategy-value-check" data-strategy-key="${field.key}" type="checkbox" aria-label="${field.label}" ${value ? "checked" : ""}>`
      : field.type === "multiSelect"
        ? `<div class="strategy-market-options">${(field.options || []).map((option) => `
            <label><input data-strategy-key="${field.key}" type="checkbox" value="${option.value}" ${Array.isArray(value) && value.includes(option.value) ? "checked" : ""} ${disabled}><span>${option.label}</span></label>
          `).join("")}</div>`
        : `<input data-strategy-key="${field.key}" type="number" min="${field.min}" max="${field.max}" step="${field.step}" value="${Number(value)}" ${disabled}>`;
    const rowClass = `${field.type === "multiSelect" ? "strategy-row-wide" : ""} ${field.type === "boolean" ? "strategy-row-toggle" : ""} ${custom ? "is-custom" : "is-default"}`;
    const customControl = field.type === "boolean"
      ? ""
      : `<input class="strategy-custom-check" data-strategy-enable="${field.key}" type="checkbox" aria-label="${field.label}使用自定义" ${custom ? "checked" : ""}>`;
    return `
      <div class="strategy-row ${rowClass}">
        <button class="strategy-title-btn" data-strategy-detail="${field.key}" type="button">${field.label}</button>
        ${control}
        <span>${field.unit || ""}</span>
        ${customControl}
      </div>
    `;
  }).join("");
}

const SELECTION_GROUP_ORDER = ["排列顺序", "市场范围", "个股基础", "日线趋势", "前日条件", "板块条件", "尾盘条件"];

function selectionFieldGroup(key) {
  if (["useLateMomentumSort", "lateMomentumMinutes", "minLateMomentumPct"].includes(key)) return "排列顺序";
  if (key === "selectionMarkets") return "市场范围";
  if (["requireBullTrend", "requireTenDayGainLimit", "tenDayGainLookbackDays", "minTenDayGainPct", "maxTenDayGainPct", "requireRecentVolumeExpansion", "recentVolumeLookbackDays", "minRecentHighVolumeDays", "volumeAverageDays", "requireSixtyDayHighBreakout", "highBreakoutLookbackDays"].includes(key)) return "日线趋势";
  if (["requirePreviousDayChangeLimit", "maxPreviousDayChangePct", "avoidPreviousLimitMove"].includes(key)) return "前日条件";
  if (["useBoardScoreFilter", "minBoardScore"].includes(key)) return "板块条件";
  if (key === "strictLateWindow") return "尾盘条件";
  return "个股基础";
}

function renderSelectionStrategyPanel() {
  const list = document.getElementById("selectionStrategyList");
  if (!list) return;
  if (!currentUser) {
    list.innerHTML = "";
    return;
  }
  if (!selectionStrategyFields.length) {
    list.innerHTML = `<div class="portfolio-empty">选股策略参数同步后显示</div>`;
    return;
  }
  const groupedFields = [...selectionStrategyFields]
    .filter((field) => !["useLateMomentumSort", "lateMomentumMinutes", "minLateMomentumPct", "useStockChangeFilter", "minStockChangePct", "maxStockChangePct", "useTurnoverVolumeRatio", "minTurnoverPct", "maxTurnoverPct", "useVolumeRatioFilter", "minVolumeRatio", "maxVolumeRatio", "useBoardScoreFilter", "minBoardScore", "requireTenDayGainLimit", "tenDayGainLookbackDays", "minTenDayGainPct", "maxTenDayGainPct", "requireRecentVolumeExpansion", "recentVolumeLookbackDays", "minRecentHighVolumeDays", "volumeAverageDays", "requireSixtyDayHighBreakout", "highBreakoutLookbackDays", "requirePreviousDayChangeLimit", "maxPreviousDayChangePct", "requireFreeFloatCapLimit", "minFreeFloatCapYi", "maxFreeFloatCapYi"].includes(field.key))
    .sort((a, b) => {
    return SELECTION_GROUP_ORDER.indexOf(selectionFieldGroup(a.key)) - SELECTION_GROUP_ORDER.indexOf(selectionFieldGroup(b.key));
  });
  let currentGroup = "排列顺序";
  let baseRowsRendered = false;
  let trendRowsRendered = false;
  let previousDayRowsRendered = false;
  let boardRowsRendered = false;
  const momentumEnabled = Boolean(selectionStrategy.useLateMomentumSort);
  const momentumMinutes = Number(selectionStrategy.lateMomentumMinutes ?? DEFAULT_SELECTION_STRATEGY.lateMomentumMinutes);
  const momentumPct = Number(selectionStrategy.minLateMomentumPct ?? DEFAULT_SELECTION_STRATEGY.minLateMomentumPct);
  const changeEnabled = Boolean(selectionStrategy.useStockChangeFilter);
  const minChange = Number(selectionStrategy.minStockChangePct ?? DEFAULT_SELECTION_STRATEGY.minStockChangePct);
  const maxChange = Number(selectionStrategy.maxStockChangePct ?? DEFAULT_SELECTION_STRATEGY.maxStockChangePct);
  const turnoverEnabled = Boolean(selectionStrategy.useTurnoverVolumeRatio);
  const minTurnover = Number(selectionStrategy.minTurnoverPct ?? DEFAULT_SELECTION_STRATEGY.minTurnoverPct);
  const maxTurnover = Number(selectionStrategy.maxTurnoverPct ?? DEFAULT_SELECTION_STRATEGY.maxTurnoverPct);
  const volumeRatioEnabled = Boolean(selectionStrategy.useVolumeRatioFilter);
  const boardScoreEnabled = Boolean(selectionStrategy.useBoardScoreFilter);
  const minBoardScore = Number(selectionStrategy.minBoardScore ?? DEFAULT_SELECTION_STRATEGY.minBoardScore);
  const minVolumeRatio = Number(selectionStrategy.minVolumeRatio ?? DEFAULT_SELECTION_STRATEGY.minVolumeRatio);
  const maxVolumeRatio = Number(selectionStrategy.maxVolumeRatio ?? DEFAULT_SELECTION_STRATEGY.maxVolumeRatio);
  const tenDayGainEnabled = Boolean(selectionStrategy.requireTenDayGainLimit);
  const tenDayGainDays = Number(selectionStrategy.tenDayGainLookbackDays ?? DEFAULT_SELECTION_STRATEGY.tenDayGainLookbackDays);
  const minTenDayGain = Number(selectionStrategy.minTenDayGainPct ?? DEFAULT_SELECTION_STRATEGY.minTenDayGainPct);
  const maxTenDayGain = Number(selectionStrategy.maxTenDayGainPct ?? DEFAULT_SELECTION_STRATEGY.maxTenDayGainPct);
  const volumeExpansionEnabled = Boolean(selectionStrategy.requireRecentVolumeExpansion);
  const recentVolumeLookback = Number(selectionStrategy.recentVolumeLookbackDays ?? DEFAULT_SELECTION_STRATEGY.recentVolumeLookbackDays);
  const minRecentHighVolume = Number(selectionStrategy.minRecentHighVolumeDays ?? DEFAULT_SELECTION_STRATEGY.minRecentHighVolumeDays);
  const volumeAverageDays = Number(selectionStrategy.volumeAverageDays ?? DEFAULT_SELECTION_STRATEGY.volumeAverageDays);
  const highBreakoutEnabled = Boolean(selectionStrategy.requireSixtyDayHighBreakout);
  const highBreakoutDays = Number(selectionStrategy.highBreakoutLookbackDays ?? DEFAULT_SELECTION_STRATEGY.highBreakoutLookbackDays);
  const previousDayChangeEnabled = Boolean(selectionStrategy.requirePreviousDayChangeLimit);
  const maxPreviousDayChange = Number(selectionStrategy.maxPreviousDayChangePct ?? DEFAULT_SELECTION_STRATEGY.maxPreviousDayChangePct);
  const freeFloatCapEnabled = Boolean(selectionStrategy.requireFreeFloatCapLimit);
  const minFreeFloatCap = Number(selectionStrategy.minFreeFloatCapYi ?? DEFAULT_SELECTION_STRATEGY.minFreeFloatCapYi);
  const maxFreeFloatCap = Number(selectionStrategy.maxFreeFloatCapYi ?? DEFAULT_SELECTION_STRATEGY.maxFreeFloatCapYi);
  const scorePreview = calculateSelectionStrategyScore(selectionStrategy);
  const momentumRow = `
    <div class="strategy-group-head">排列顺序</div>
    <div class="strategy-row momentum-sort-row ${momentumEnabled ? "is-custom" : "is-default"}">
      <button class="strategy-title-btn" data-selection-detail="useLateMomentumSort" type="button">分钟涨幅排序</button>
      <div class="momentum-sort-control">
        <input data-selection-key="lateMomentumMinutes" type="number" min="1" max="60" step="1" value="${momentumMinutes}">
        <span>分钟涨幅</span>
        <input data-selection-key="minLateMomentumPct" type="number" min="-5" max="20" step="0.1" value="${momentumPct}">
        <span>% 排序</span>
      </div>
      <input class="momentum-check" data-selection-key="useLateMomentumSort" type="checkbox" aria-label="启用分钟涨幅排序" ${momentumEnabled ? "checked" : ""}>
    </div>
  `;
  const changeRow = `
    <div class="strategy-row change-filter-row ${changeEnabled ? "is-custom" : "is-default"}">
      <button class="strategy-title-btn" data-selection-detail="useStockChangeFilter" type="button">涨幅筛选</button>
      <div class="change-filter-control">
        <span>涨幅</span>
        <input data-selection-key="minStockChangePct" type="number" min="0" max="12" step="0.1" value="${minChange}">
        <span>% -</span>
        <input data-selection-key="maxStockChangePct" type="number" min="5" max="19.5" step="0.1" value="${maxChange}">
        <span>%</span>
      </div>
      <input class="change-check" data-selection-key="useStockChangeFilter" type="checkbox" aria-label="启用涨幅筛选" ${changeEnabled ? "checked" : ""}>
    </div>
  `;
  const turnoverRow = `
    <div class="strategy-row turnover-filter-row ${turnoverEnabled ? "is-custom" : "is-default"}">
      <button class="strategy-title-btn" data-selection-detail="useTurnoverVolumeRatio" type="button">换手筛选</button>
      <div class="turnover-filter-control">
        <span>换手</span>
        <input data-selection-key="minTurnoverPct" type="number" min="0" max="20" step="0.1" value="${minTurnover}">
        <span>% -</span>
        <input data-selection-key="maxTurnoverPct" type="number" min="5" max="60" step="0.5" value="${maxTurnover}">
        <span>%</span>
      </div>
      <input class="turnover-check" data-selection-key="useTurnoverVolumeRatio" type="checkbox" aria-label="启用换手筛选" ${turnoverEnabled ? "checked" : ""}>
    </div>
  `;
  const volumeRatioRow = `
    <div class="strategy-row volume-ratio-filter-row ${volumeRatioEnabled ? "is-custom" : "is-default"}">
      <button class="strategy-title-btn" data-selection-detail="useVolumeRatioFilter" type="button">量比筛选</button>
      <div class="volume-ratio-filter-control">
        <span>量比</span>
        <input data-selection-key="minVolumeRatio" type="number" min="0" max="8" step="0.1" value="${minVolumeRatio}">
        <span>-</span>
        <input data-selection-key="maxVolumeRatio" type="number" min="1" max="20" step="0.1" value="${maxVolumeRatio}">
      </div>
      <input class="volume-ratio-check" data-selection-key="useVolumeRatioFilter" type="checkbox" aria-label="启用量比筛选" ${volumeRatioEnabled ? "checked" : ""}>
    </div>
  `;
  const boardScoreRow = `
    <div class="strategy-row board-score-row ${boardScoreEnabled ? "is-custom" : "is-default"}">
      <button class="strategy-title-btn" data-selection-detail="useBoardScoreFilter" type="button">板块评分</button>
      <div class="board-score-control">
        <span>板块评分</span>
        <input data-selection-key="minBoardScore" type="number" min="60" max="96" step="1" value="${minBoardScore}">
        <span>分</span>
      </div>
      <input class="board-score-check" data-selection-key="useBoardScoreFilter" type="checkbox" aria-label="启用板块评分筛选" ${boardScoreEnabled ? "checked" : ""}>
    </div>
  `;
  const tenDayGainRow = `
    <div class="strategy-row ten-day-gain-row ${tenDayGainEnabled ? "is-custom" : "is-default"}">
      <button class="strategy-title-btn" data-selection-detail="requireTenDayGainLimit" type="button">涨幅限制</button>
      <div class="ten-day-gain-control">
        <input data-selection-key="tenDayGainLookbackDays" type="number" min="3" max="60" step="1" value="${tenDayGainDays}">
        <span>日</span>
        <input data-selection-key="minTenDayGainPct" type="number" min="-100" max="200" step="1" value="${minTenDayGain}">
        <span>% -</span>
        <input data-selection-key="maxTenDayGainPct" type="number" min="-100" max="300" step="1" value="${maxTenDayGain}">
        <span>%</span>
      </div>
      <input class="ten-day-gain-check" data-selection-key="requireTenDayGainLimit" type="checkbox" aria-label="启用涨幅限制" ${tenDayGainEnabled ? "checked" : ""}>
    </div>
  `;
  const volumeExpansionRow = `
    <div class="strategy-row volume-expansion-row ${volumeExpansionEnabled ? "is-custom" : "is-default"}">
      <button class="strategy-title-btn" data-selection-detail="requireRecentVolumeExpansion" type="button">成交量限制</button>
      <div class="volume-expansion-control">
        <input data-selection-key="recentVolumeLookbackDays" type="number" min="3" max="30" step="1" value="${recentVolumeLookback}">
        <span>日内</span>
        <input data-selection-key="minRecentHighVolumeDays" type="number" min="1" max="20" step="1" value="${minRecentHighVolume}">
        <span>天成交量大于</span>
        <input data-selection-key="volumeAverageDays" type="number" min="20" max="250" step="5" value="${volumeAverageDays}">
        <span>日平均成交量</span>
      </div>
      <input class="volume-expansion-check" data-selection-key="requireRecentVolumeExpansion" type="checkbox" aria-label="启用成交量限制" ${volumeExpansionEnabled ? "checked" : ""}>
    </div>
  `;
  const highBreakoutRow = `
    <div class="strategy-row high-breakout-row ${highBreakoutEnabled ? "is-custom" : "is-default"}">
      <button class="strategy-title-btn" data-selection-detail="requireSixtyDayHighBreakout" type="button">新高观察周期</button>
      <div class="high-breakout-control">
        <input data-selection-key="highBreakoutLookbackDays" type="number" min="20" max="120" step="5" value="${highBreakoutDays}">
        <span>日</span>
      </div>
      <input class="high-breakout-check" data-selection-key="requireSixtyDayHighBreakout" type="checkbox" aria-label="启用新高观察周期" ${highBreakoutEnabled ? "checked" : ""}>
    </div>
  `;
  const previousDayChangeRow = `
    <div class="strategy-row previous-day-change-row ${previousDayChangeEnabled ? "is-custom" : "is-default"}">
      <button class="strategy-title-btn" data-selection-detail="requirePreviousDayChangeLimit" type="button">昨日最高涨幅</button>
      <div class="previous-day-change-control">
        <input data-selection-key="maxPreviousDayChangePct" type="number" min="-5" max="20" step="0.1" value="${maxPreviousDayChange}">
        <span>%</span>
      </div>
      <input class="previous-day-change-check" data-selection-key="requirePreviousDayChangeLimit" type="checkbox" aria-label="启用昨日最高涨幅" ${previousDayChangeEnabled ? "checked" : ""}>
    </div>
  `;
  const freeFloatCapRow = `
    <div class="strategy-row free-float-cap-row ${freeFloatCapEnabled ? "is-custom" : "is-default"}">
      <button class="strategy-title-btn" data-selection-detail="requireFreeFloatCapLimit" type="button">流通市值</button>
      <div class="free-float-cap-control">
        <span>流通市值</span>
        <input data-selection-key="minFreeFloatCapYi" type="number" min="0" max="5000" step="10" value="${minFreeFloatCap}">
        <span>亿 -</span>
        <input data-selection-key="maxFreeFloatCapYi" type="number" min="10" max="5000" step="10" value="${maxFreeFloatCap}">
        <span>亿</span>
      </div>
      <input class="free-float-cap-check" data-selection-key="requireFreeFloatCapLimit" type="checkbox" aria-label="启用流通市值筛选" ${freeFloatCapEnabled ? "checked" : ""}>
    </div>
  `;
  const stockScoreRow = `
    <div class="strategy-row strategy-row-display is-default">
      <button class="strategy-title-btn" data-selection-detail="${STOCK_SCORE_DISPLAY_FIELD.key}" type="button">${STOCK_SCORE_DISPLAY_FIELD.label}</button>
      <strong data-selection-score-value>${scorePreview.score}分</strong>
      <span data-selection-score-label title="${scorePreview.hint}">${scorePreview.label}</span>
      <span></span>
    </div>
  `;
  list.innerHTML = momentumRow + groupedFields.map((field) => {
    const group = selectionFieldGroup(field.key);
    let groupHead = group !== currentGroup ? `<div class="strategy-group-head">${group}</div>` : "";
    if (group === "个股基础" && !baseRowsRendered) {
      groupHead += changeRow + turnoverRow + volumeRatioRow + freeFloatCapRow + stockScoreRow;
      baseRowsRendered = true;
    }
    currentGroup = group;
    if (group === "日线趋势" && !trendRowsRendered) {
      groupHead += tenDayGainRow + volumeExpansionRow + highBreakoutRow;
      trendRowsRendered = true;
    }
    if (group === "前日条件" && !previousDayRowsRendered) {
      groupHead += previousDayChangeRow;
      previousDayRowsRendered = true;
    }
    if (group === "尾盘条件" && !boardRowsRendered) {
      groupHead = `<div class="strategy-group-head">板块条件</div>${boardScoreRow}${groupHead}`;
      boardRowsRendered = true;
    }
    const value = selectionStrategy[field.key] ?? field.defaultValue;
    const custom = field.type === "boolean" ? true : isCustomStrategyValue(field, selectionStrategy);
    const disabled = rowDisabledAttr(custom);
    const control = field.type === "boolean"
      ? `<input class="strategy-value-check" data-selection-key="${field.key}" type="checkbox" aria-label="${field.label}" ${value ? "checked" : ""}>`
      : field.type === "multiSelect"
        ? `<div class="strategy-market-options">${(field.options || []).map((option) => `
            <label><input data-selection-key="${field.key}" type="checkbox" value="${option.value}" ${Array.isArray(value) && value.includes(option.value) ? "checked" : ""} ${disabled}><span>${option.label}</span></label>
          `).join("")}</div>`
      : `<input data-selection-key="${field.key}" type="number" min="${field.min}" max="${field.max}" step="${field.step}" value="${Number(value)}" ${disabled}>`;
    const rowClass = `${field.type === "multiSelect" ? "strategy-row-wide" : ""} ${field.type === "boolean" ? "strategy-row-toggle" : ""} ${custom ? "is-custom" : "is-default"}`;
    const customControl = field.type === "boolean"
      ? ""
      : `<input class="strategy-custom-check" data-selection-enable="${field.key}" type="checkbox" aria-label="${field.label}使用自定义" ${custom ? "checked" : ""}>`;
    return `${groupHead}
      <div class="strategy-row ${rowClass}">
        <button class="strategy-title-btn" data-selection-detail="${field.key}" type="button">${field.label}</button>
        ${control}
        <span>${field.unit || ""}</span>
        ${customControl}
      </div>
    `;
  }).join("");
}

function readStrategyForm(useDefaults = false) {
  const next = {};
  strategyFields.forEach((field) => {
    if (useDefaults) {
      next[field.key] = field.defaultValue;
      return;
    }
    if (!isStrategyFieldEnabled(field, "strategy")) {
      next[field.key] = field.defaultValue;
      return;
    }
    const input = document.querySelector(`[data-strategy-key="${field.key}"]`);
    if (!input) return;
    if (field.type === "multiSelect") {
      const values = Array.from(document.querySelectorAll(`[data-strategy-key="${field.key}"]:checked`)).map((node) => node.value);
      next[field.key] = values.includes("all") ? ["all"] : values.length ? values : field.defaultValue;
      return;
    }
    next[field.key] = field.type === "boolean" ? input.checked : Number(input.value);
  });
  return next;
}

function readSelectionStrategyForm(useDefaults = false) {
  const next = {};
  selectionStrategyFields.forEach((field) => {
    if (useDefaults) {
      next[field.key] = field.defaultValue;
      return;
    }
    if (!isStrategyFieldEnabled(field, "selection")) {
      next[field.key] = field.defaultValue;
      return;
    }
    const input = document.querySelector(`[data-selection-key="${field.key}"]`);
    if (!input) return;
    if (field.type === "multiSelect") {
      const values = Array.from(document.querySelectorAll(`[data-selection-key="${field.key}"]:checked`)).map((node) => node.value);
      next[field.key] = values.includes("all") ? ["all"] : values.length ? values : field.defaultValue;
      return;
    }
    next[field.key] = field.type === "boolean" ? input.checked : Number(input.value);
  });
  return next;
}

function openStrategyDetail(key, group = "operation") {
  const fields = group === "selection" ? selectionStrategyFields : strategyFields;
  const values = group === "selection" ? selectionStrategy : paperStrategy;
  let field = fields.find((item) => item.key === key);
  if (!field && group === "selection" && key === STOCK_SCORE_DISPLAY_FIELD.key) {
    field = STOCK_SCORE_DISPLAY_FIELD;
  }
  if (!field) return;
  const currentValue = values[field.key] ?? field.defaultValue;
  const rangeText = field.type === "boolean"
    ? "开/关"
    : field.type === "display"
      ? "自动计算"
      : field.type === "multiSelect"
      ? (field.options || []).map((option) => option.label).join("、")
      : `${field.min}-${field.max}${field.unit || ""}`;
  const extraDetail = ["useStockChangeFilter", "minStockChangePct", "maxStockChangePct"].includes(field.key)
    ? `
      <div class="sell-detail-kv">
        <span>默认建议</span><strong>3% - 18.8%</strong>
        <span>偏宽松</span><strong>1% - 18.8%，候选更多但主动性更弱</strong>
        <span>偏严格</span><strong>5% - 16%，更偏强势承接但容易漏掉低位启动</strong>
        <span>风险区</span><strong>接近涨停或涨幅过高，隔日兑现压力更大</strong>
      </div>
      <p class="sell-detail-main">涨幅筛选控制的是当日主动性和追高风险。最低涨幅太低，容易混入没有资金推动的股票；最高涨幅太高，容易靠近涨停或短线高潮。尾盘买入法通常希望股票已经有资金关注，但还没有进入极端追高区。</p>
    `
    : ["requireTenDayGainLimit", "tenDayGainLookbackDays", "minTenDayGainPct", "maxTenDayGainPct"].includes(field.key)
      ? `
      <div class="sell-detail-kv">
        <span>默认建议</span><strong>10日 -100% - 60%</strong>
        <span>偏宽松</span><strong>10日 -100% - 100%，只过滤极端加速</strong>
        <span>偏严格</span><strong>10日 0% - 40%，更偏温和启动和承接</strong>
        <span>作用</span><strong>限制短期累计涨幅，避免追入过度加速票</strong>
      </div>
      <p class="sell-detail-main">涨幅限制看的是指定交易日内的累计涨幅。最低值提高，会排除近期没有走强或仍在下跌的股票；最高值降低，会排除已经明显加速的股票。默认最低 -100% 是为了保持原先只限制最高涨幅的逻辑。</p>
    `
    : ["requireRecentVolumeExpansion", "recentVolumeLookbackDays", "minRecentHighVolumeDays", "volumeAverageDays"].includes(field.key)
      ? `
      <div class="sell-detail-kv">
        <span>默认建议</span><strong>10日内3天成交量大于120日平均成交量</strong>
        <span>偏宽松</span><strong>10日内2天大于120日均量，候选更多</strong>
        <span>偏严格</span><strong>10日内4-5天大于120日均量，更重视持续放量</strong>
        <span>作用</span><strong>确认近期有资金活动，不只是一日脉冲</strong>
      </div>
      <p class="sell-detail-main">成交量限制用于判断近期是否有持续资金参与。观察日数越短、最低放量天数越高，筛选越严格；平均成交量周期越长，越接近长期常态成交量，能减少短期噪音。</p>
    `
    : ["requireSixtyDayHighBreakout", "highBreakoutLookbackDays"].includes(field.key)
      ? `
      <div class="sell-detail-kv">
        <span>默认建议</span><strong>60日</strong>
        <span>偏宽松</span><strong>20-40日，更容易触发阶段新高</strong>
        <span>偏严格</span><strong>90-120日，更强调中期突破</strong>
        <span>作用</span><strong>确认当前价格正在突破阶段前高</strong>
      </div>
      <p class="sell-detail-main">新高观察周期用于判断当前实时价格是否达到指定周期内已完成交易日的最高价。周期越短，候选更多；周期越长，突破意义更强，但也更容易筛空。</p>
    `
    : ["requirePreviousDayChangeLimit", "maxPreviousDayChangePct"].includes(field.key)
      ? `
      <div class="sell-detail-kv">
        <span>默认建议</span><strong>昨日最高涨幅 5%</strong>
        <span>偏宽松</span><strong>8%-10%，允许前日更强势</strong>
        <span>偏严格</span><strong>3%-5%，更重视未过度加速</strong>
        <span>作用</span><strong>避开前一日已经明显高潮的追高票</strong>
      </div>
      <p class="sell-detail-main">昨日最高涨幅使用昨日收盘价相对前日收盘价的实际涨幅。即使昨日低开高走，只要最终实际涨幅过大，也会被过滤。</p>
    `
    : field.key === "avoidPreviousLimitMove"
      ? `
      <div class="sell-detail-kv">
        <span>判断公式</span><strong>前日涨跌幅 = (前日收盘价 - 前前日收盘价) / 前前日收盘价 * 100%</strong>
        <span>创业板/科创板</span><strong>前日涨幅 >= 19% 或跌幅 <= -19% 视为触及涨跌停过滤</strong>
        <span>主板</span><strong>前日涨幅 >= 9.6% 或跌幅 <= -9.6% 视为触及涨跌停过滤</strong>
        <span>北交所</span><strong>前日涨幅 >= 29% 或跌幅 <= -29% 视为触及涨跌停过滤</strong>
      </div>
      <p class="sell-detail-main">这条规则只判断候选股前一交易日是否已经极端涨停或跌停。前一天涨停，第二天尾盘买入容易变成高位接力；前一天跌停，说明资金分歧或风险还没有修复。默认开启，更符合尾盘买入法偏向“今日重新进攻、昨日不过度极端”的思路。</p>
    `
    : ["requireFreeFloatCapLimit", "minFreeFloatCapYi", "maxFreeFloatCapYi"].includes(field.key)
      ? `
      <div class="sell-detail-kv">
        <span>默认建议</span><strong>0 - 800 亿</strong>
        <span>偏小盘</span><strong>20 - 300 亿，弹性更高但波动更大</strong>
        <span>偏稳健</span><strong>50 - 800 亿，排除过小盘和超大盘</strong>
        <span>口径说明</span><strong>公开行情使用流通市值近似自由流通市值</strong>
      </div>
      <p class="sell-detail-main">流通市值区间控制的是股票弹性和资金容量。市值太小容易被少量资金推动，也更容易大幅波动；市值太大弹性通常较弱，尾盘买入法的隔日溢价可能不明显。勾选后才按区间过滤，不勾选时只展示流通市值。</p>
    `
    : ["useBoardScoreFilter", "minBoardScore"].includes(field.key)
      ? `
      <div class="sell-detail-kv">
        <span>板块评分公式</span><strong>原始强度分按板块涨幅、前排弹性、承接、活跃度归一化到 60-96 分</strong>
        <span>默认建议</span><strong>开启，最低 78 分</strong>
        <span>不勾选</span><strong>不按板块过滤，只看个股条件，候选会明显变多</strong>
        <span>偏严格</span><strong>84 分以上，更重视主线和热点共振</strong>
      </div>
      <p class="sell-detail-main">板块评分是一个综合强度分，不再把上涨广度、活跃家数单独暴露成筛选项。尾盘买入法里，板块过滤的作用是减少孤立拉升个股；如果你想单纯做个股，就取消勾选这个方块。</p>
    `
    : ["useVolumeRatioFilter", "minVolumeRatio", "maxVolumeRatio"].includes(field.key)
      ? `
      <div class="sell-detail-kv">
        <span>量比公式</span><strong>当前平均每分钟成交量 / 过去5个交易日平均每分钟成交量</strong>
        <span>默认建议</span><strong>1.0 - 5.0</strong>
        <span>偏宽松</span><strong>0.8 - 6.0，候选更多但质量更散</strong>
        <span>偏严格</span><strong>1.2 - 4.0，更重视资金活跃且避开极端放量</strong>
      </div>
      <p class="sell-detail-main">量比低于 1 通常表示当前成交节奏弱于过去5日均值；量比高于 5 往往说明短时放量很猛，可能是资金进攻，也可能是分歧放大。尾盘买入法里建议先用区间筛选，不建议只看量比单独买入。</p>
    `
      : field.key === "stockScoreDisplay"
        ? `
      <div class="sell-detail-kv">
        <span>当前公式</span><strong>基础50 + 涨幅严格度 + 换手严格度 + 量比严格度 + 板块强度 + 市场范围 + 日线/前日/市值等开关加减分</strong>
        <span>分数含义</span><strong>分数越高，筛选越严格越保守；分数越低，筛选越宽松越激进</strong>
        <span>当前用途</span><strong>只做策略倾向展示，不作为看板硬筛选</strong>
        <span>真实个股评分</span><strong>仍由后台结合具体股票行情逐只计算</strong>
      </div>
      <p class="sell-detail-main">这里显示的是当前选股参数的策略评分，不是某一只股票的真实个股评分。用户调整涨幅区间、换手区间、量比区间、日线多头、新高观察周期、周期涨幅、流通市值、板块评分开关等参数后，这个分数会即时变化，帮助判断规则整体偏保守还是偏激进。</p>
      <div class="sell-detail-kv">
        <span>78-100</span><strong>保守：候选少，质量要求高</strong>
        <span>62-77</span><strong>偏保守：候选偏少，重视确定性</strong>
        <span>45-61</span><strong>平衡：候选适中</strong>
        <span>30-44</span><strong>偏激进：候选偏多，容忍度更高</strong>
      </div>
    `
      : field.key === "minStockScore"
      ? `
      <div class="sell-detail-kv">
        <span>公式</span><strong>板块评分*0.33 + 状态分 + 涨幅*0.55 + 换手分 + 涨幅位置分 + 量比分 + 日线分</strong>
        <span>自动盘默认</span><strong>84分</strong>
        <span>偏宽松</span><strong>78-84分，买入机会更多但质量更散</strong>
        <span>偏严格</span><strong>86-90分，更偏强势前排但容易漏掉低位启动</strong>
      </div>
      <p class="sell-detail-main">个股评分会随着涨幅区间、换手区间、量比区间、日线多头、新高观察周期、周期涨幅、流通市值和板块强度等量化项变化。看板选股里它只做展示和排序参考；这里的数值只用于自动模拟盘的买入门槛。</p>
      <div class="sell-detail-kv">
        <span>状态分</span><strong>弹性前排26，弹性承接22，10cm助攻14，20cm确认10，其他8</strong>
        <span>换手分</span><strong>换手筛选关闭为8；开启后5%-22%为10，过高降为5</strong>
        <span>量比分</span><strong>量比筛选关闭为2；开启后 min(量比, 5)</strong>
        <span>日线分</span><strong>多头 +5，未多头 -2，待确认 0</strong>
      </div>
    `
      : "";
  document.getElementById("strategyDetailTitle").textContent = field.label;
  document.getElementById("strategyDetailSub").textContent = `默认 ${strategyValueText(field.defaultValue, field)} · 范围 ${rangeText}`;
  const defaultNote = field.type === "display"
    ? `这个数值由当前参数自动计算，不保存为用户输入参数。默认显示：${strategyValueText(field.defaultValue, field)}。`
    : field.type === "boolean"
    ? `这个方块就是筛选开关；勾选表示启用该筛选，不勾选表示不按该规则过滤。默认值：${strategyValueText(field.defaultValue, field)}。`
    : `最右侧方块用于单独启用自定义阈值；未勾选时保存为默认值：${strategyValueText(field.defaultValue, field)}。`;
  document.getElementById("strategyDetailBody").innerHTML = `
    <p class="sell-detail-main">${field.detail}</p>
    <p class="sell-detail-main">${defaultNote}</p>
    ${extraDetail}
    <div class="sell-detail-kv">
      <span>参数名</span><strong>${field.key}</strong>
      <span>当前值</span><strong>${strategyValueText(currentValue, field)}</strong>
      <span>默认值</span><strong>${strategyValueText(field.defaultValue, field)}</strong>
      <span>步进</span><strong>${field.type === "boolean" ? "开关" : field.type === "multiSelect" ? "多选" : field.step}</strong>
    </div>
  `;
  openModal("strategyDetailModal");
}

function renderPositions() {
  const list = document.getElementById("positionsList");
  if (!currentUser) {
    list.innerHTML = `<div class="portfolio-empty">登录后查看和编辑持仓</div>`;
    return;
  }
  const rows = positionRows();
  if (!rows.length) {
    list.innerHTML = `<div class="portfolio-empty">暂无持仓，可从看板买入或手动补录</div>`;
    return;
  }
  list.innerHTML = rows.map((item) => `
    <div class="edit-row compact-position ${editingCode === item.code ? "editing" : ""}" data-code="${item.code}">
      <div class="edit-title">
        <strong>${item.name}</strong>
        <span>${item.code}</span>
      </div>
      <div class="position-metric"><span>数量</span><strong>${Number(item.quantity || 0)}</strong></div>
      <div class="position-metric"><span>均价</span><strong>${formatCurrency(item.avgPrice)}</strong></div>
      <div class="position-metric"><span>现价</span><strong>${formatCurrency(item.lastPrice || item.avgPrice)}</strong></div>
      <div class="position-edit-fields">
        <label><span>数量</span><input data-field="quantity" type="number" min="0" step="100" value="${Number(item.quantity || 0)}"></label>
        <label><span>均价</span><input data-field="avgPrice" type="number" min="0" step="0.01" value="${Number(item.avgPrice || 0).toFixed(2)}"></label>
        <label><span>现价</span><input data-field="lastPrice" type="number" min="0" step="0.01" value="${Number(item.lastPrice || item.avgPrice || 0).toFixed(2)}"></label>
      </div>
      <div class="position-bottom">
        ${renderInlineSellAdvice(item)}
        <div class="edit-actions">
          ${paperMode ? "" : `<button class="danger-btn sell-position" type="button">卖出</button>`}
          <button class="secondary-btn sell-detail" type="button">详情</button>
          ${paperMode ? "" : `<button class="secondary-btn edit-position" type="button">${editingCode === item.code ? "收起" : "编辑"}</button>`}
          ${paperMode ? "" : `<button class="secondary-btn save-position" type="button">保存</button>`}
          ${paperMode ? "" : `<button class="danger-btn delete-position" type="button">删除</button>`}
        </div>
      </div>
    </div>
  `).join("");
}

function renderInlineSellAdvice(item) {
  const advice = sellAdvice(item);
  return `
    <div class="position-sell-advice">
      <span>${advice.tag}</span>
      <strong>${advice.prices}</strong>
      <p>${advice.text}</p>
    </div>
  `;
}

function openSellTrade(code) {
  const item = positions[code];
  if (!item) return;
  const advice = sellAdvice(item);
  document.getElementById("tradeType").value = "SELL";
  document.getElementById("tradeCode").value = item.code;
  document.getElementById("tradeName").value = item.name;
  document.getElementById("tradeQuantity").value = Number(item.quantity || 0);
  document.getElementById("tradePrice").value = Number(advice.targetPrice || item.lastPrice || item.avgPrice || 0).toFixed(2);
  openModal("tradeModal");
}

function openSellDetail(code) {
  const item = positions[code];
  if (!item) return;
  const advice = sellAdvice(item);
  const title = document.getElementById("sellDetailTitle");
  const sub = document.getElementById("sellDetailSub");
  const body = document.getElementById("sellDetailBody");
  title.textContent = `${item.name} 卖出建议`;
  sub.textContent = `${item.code} · ${advice.tag} · ${formatDate(item.quoteUpdatedAt)}`;
  body.innerHTML = `
    <div class="sell-detail-kv">
      <span>建议价格</span><strong>${advice.prices}</strong>
      <span>持仓成本</span><strong>${formatCurrency(item.avgPrice)}</strong>
      <span>当前价格</span><strong>${formatCurrency(item.lastPrice || item.avgPrice)}</strong>
      <span>今日开盘</span><strong>${formatCurrency(item.openPrice || item.lastPrice || item.avgPrice)}</strong>
    </div>
    <p class="sell-detail-main">${advice.text}</p>
    <ul>${advice.detail.map((line) => `<li>${line}</li>`).join("")}</ul>
  `;
  openModal("sellDetailModal");
}

function renderHistory() {
  const list = document.getElementById("historyList");
  const rows = paperMode
    ? [
      ...trades.map((item) => ({ ...item, kind: "trade" })),
      ...paperEvents.map((item) => ({ ...item, kind: "event" }))
    ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    : trades.map((item) => ({ ...item, kind: "trade" }));
  document.getElementById("tradeCount").textContent = `${rows.length} 条`;
  if (!currentUser) {
    list.innerHTML = `<div class="portfolio-empty">登录后查看历史买卖</div>`;
    return;
  }
  if (!rows.length) {
    list.innerHTML = `<div class="portfolio-empty">暂无历史记录</div>`;
    return;
  }
  list.innerHTML = rows.slice(0, 120).map((item) => item.kind === "event" ? `
    <div class="history-row paper-event-row">
      <span>${item.type || "事件"}</span>
      <strong>${item.title || "--"}</strong>
      <b>${item.meta && item.meta.code ? item.meta.code : "--"}</b>
      <em>${item.message || "--"}</em>
      <small>${formatDate(item.createdAt)}</small>
    </div>
  ` : `
    <div class="history-row">
      <span class="${item.type === "SELL" ? "down" : "up"}">${item.type === "SELL" ? "卖出" : "买入"}</span>
      <strong>${item.name}</strong>
      <b>${item.code}</b>
      <em>${Number(item.quantity || 0)}股 @ ${formatCurrency(item.price)}${Number.isFinite(Number(item.pnl)) && Number(item.pnl) !== 0 ? ` / 盈亏 ${formatCurrency(item.pnl)}` : ""}</em>
      <small>${formatDate(item.createdAt)}</small>
    </div>
  `).join("");
}

function renderAdminUsers(rows = []) {
  const section = document.getElementById("adminSection");
  if (!section || section.classList.contains("hidden")) return;
  document.getElementById("adminUserCount").textContent = `${rows.length} 个服务器用户`;
  const list = document.getElementById("adminUserList");
  if (!rows.length) {
    list.innerHTML = `<div class="portfolio-empty">暂无服务器用户，或尚未配置用户存储</div>`;
    return;
  }
  list.innerHTML = rows.map((item) => `
    <div class="history-row admin-user-row">
      <span>用户</span>
      <strong>${item.username}</strong>
      <b>${item.key}</b>
      <em>${formatDate(item.updatedAt || item.createdAt)}</em>
      <button class="secondary-btn reset-managed-user" data-user-key="${item.key}" data-user-name="${item.username}" type="button">重设</button>
    </div>
  `).join("");
}

async function loadAdminUsers() {
  if (!currentUser || currentUser.role !== "admin") return;
  try {
    const response = await fetch("/api/auth/manage-users", {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "加载用户失败");
    renderAdminUsers(payload.users || []);
  } catch (error) {
    const list = document.getElementById("adminUserList");
    if (list) list.innerHTML = `<div class="portfolio-empty">${error instanceof Error ? error.message : String(error)}</div>`;
  }
}

function applyTrade({ type, code, name, quantity, price, note = "账户页手动记录" }) {
  if (!currentUser) throw new Error("请先登录");
  if (paperMode) throw new Error("test 自动模拟盘不支持手动改仓，请用自动运行");
  const qty = Number(quantity);
  const tradePrice = Number(price);
  if (!String(code || "").trim()) throw new Error("请输入股票代码");
  if (!String(name || "").trim()) throw new Error("请输入股票名称");
  if (!Number.isInteger(qty) || qty <= 0 || qty % 100 !== 0) throw new Error("数量需为100股的整数倍");
  if (!Number.isFinite(tradePrice) || tradePrice <= 0) throw new Error("价格不正确");
  const stockCode = String(code).trim();
  const amount = qty * tradePrice;
  const old = positions[stockCode] || {
    code: stockCode,
    name: String(name).trim(),
    quantity: 0,
    totalCost: 0,
    avgPrice: 0,
    lastPrice: tradePrice,
    updatedAt: ""
  };

  if (type === "BUY") {
    const totalQuantity = Number(old.quantity || 0) + qty;
    const totalCost = Number(old.totalCost || 0) + amount;
    positions[stockCode] = {
      ...old,
      name: String(name).trim(),
      quantity: totalQuantity,
      totalCost,
      avgPrice: totalCost / totalQuantity,
      lastPrice: tradePrice,
      firstBuyAt: old.firstBuyAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    account.cash = Number(account.cash || 0) - amount;
  } else {
    if (!old.quantity || qty > Number(old.quantity)) throw new Error("卖出数量超过当前持仓");
    const avg = Number(old.avgPrice || 0);
    const leftQuantity = Number(old.quantity) - qty;
    const leftCost = Math.max(0, Number(old.totalCost || 0) - avg * qty);
    if (leftQuantity <= 0) delete positions[stockCode];
    else {
      positions[stockCode] = {
        ...old,
        quantity: leftQuantity,
        totalCost: leftCost,
        avgPrice: leftCost / leftQuantity,
        lastPrice: tradePrice,
        updatedAt: new Date().toISOString()
      };
    }
    account.cash = Number(account.cash || 0) + amount;
  }

  savePositions();
  saveAccount();
  appendTrade({
    type,
    code: stockCode,
    name: String(name).trim(),
    quantity: qty,
    price: tradePrice,
    amount,
    note
  });
  renderAll();
  schedulePositionRefresh();
}

function saveEditedPosition(row) {
  if (paperMode) throw new Error("test 自动模拟盘不支持手动编辑持仓");
  const code = row.dataset.code;
  const old = positions[code];
  if (!old) return;
  const quantity = Number(row.querySelector('[data-field="quantity"]').value);
  const avgPrice = Number(row.querySelector('[data-field="avgPrice"]').value);
  const lastPrice = Number(row.querySelector('[data-field="lastPrice"]').value);
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error("数量不正确");
  if (!Number.isFinite(avgPrice) || avgPrice < 0) throw new Error("均价不正确");
  if (!Number.isFinite(lastPrice) || lastPrice < 0) throw new Error("现价不正确");
  if (quantity === 0) delete positions[code];
  else {
    positions[code] = {
      ...old,
      quantity,
      avgPrice,
      lastPrice,
      totalCost: quantity * avgPrice,
      firstBuyAt: old.firstBuyAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  savePositions();
  renderAll();
  schedulePositionRefresh();
}

async function refreshPositionQuotes() {
  if (!currentUser) return;
  if (paperMode) {
    await loadPaperAccount(false, false);
    return;
  }
  const rows = positionRows();
  if (!rows.length) return;
  try {
    const codes = rows.map((item) => item.code).join(",");
    const response = await fetch(`/api/quotes?codes=${encodeURIComponent(codes)}&t=${Date.now()}`, {
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || payload.error || `HTTP ${response.status}`);
    const quotes = new Map((payload.quotes || []).map((quote) => [String(quote.code), quote]));
    let changed = false;
    rows.forEach((item) => {
      const quote = quotes.get(String(item.code));
      if (!quote || !quote.price) return;
      const old = positions[item.code];
      if (!old) return;
      const nextValues = {
        lastPrice: quote.price,
        name: old.name || quote.name,
        quoteChange: quote.change,
        openPrice: quote.open || old.openPrice || 0,
        highPrice: quote.high || old.highPrice || 0,
        lowPrice: quote.low || old.lowPrice || 0
      };
      const quoteChanged = Object.entries(nextValues).some(([key, value]) => old[key] !== value);
      if (!quoteChanged) return;
      old.lastPrice = quote.price;
      old.name = nextValues.name;
      old.quoteChange = nextValues.quoteChange;
      old.openPrice = nextValues.openPrice;
      old.highPrice = nextValues.highPrice;
      old.lowPrice = nextValues.lowPrice;
      old.quoteUpdatedAt = payload.updatedAt;
      changed = true;
    });
    if (changed) {
      savePositions();
      renderSummary();
      renderPositions();
    }
  } catch {
    // Keep locally entered prices if realtime quote temporarily fails.
  }
}

function schedulePositionRefresh() {
  if (quoteTimer) {
    clearTimeout(quoteTimer);
    quoteTimer = null;
  }
  if (!autoRefreshEnabled) return;
  if (!currentUser || !positionRows().length) return;
  if (!marketRefreshWindow()) {
    quoteTimer = setTimeout(schedulePositionRefresh, SCHEDULE_CHECK_MS);
    return;
  }
  refreshPositionQuotes();
  quoteTimer = setInterval(() => {
    if (!marketRefreshWindow()) {
      clearTimeout(quoteTimer);
      quoteTimer = null;
      schedulePositionRefresh();
      return;
    }
    refreshPositionQuotes();
  }, 3000);
}

function updateAutoRefreshUi() {
  const button = document.getElementById("accountAutoRefreshBtn");
  if (!button) return;
  button.textContent = autoRefreshEnabled ? "自动：开" : "自动：关";
  button.setAttribute("aria-pressed", String(autoRefreshEnabled));
}

function toggleAutoRefresh() {
  autoRefreshEnabled = !autoRefreshEnabled;
  updateAutoRefreshUi();
  schedulePositionRefresh();
}

document.getElementById("accountAuthForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await loginUser(
      document.getElementById("accountUsername").value,
      document.getElementById("accountPassword").value
    );
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  }
});

document.getElementById("accountLogoutBtn").addEventListener("click", logoutUser);
document.getElementById("accountRefreshBtn").addEventListener("click", refreshPositionQuotes);
document.getElementById("accountAutoRefreshBtn").addEventListener("click", toggleAutoRefresh);
document.getElementById("openLoginBtn").addEventListener("click", () => openModal("loginModal"));
document.getElementById("openMoneyBtn").addEventListener("click", () => openModal("moneyModal"));
document.getElementById("openTradeBtn").addEventListener("click", () => openModal("tradeModal"));
document.getElementById("openPasswordBtn").addEventListener("click", () => openModal("passwordModal"));
document.getElementById("openAdminUserBtn").addEventListener("click", () => openModal("adminUserModal"));
document.getElementById("syncPaperBtn").addEventListener("click", () => {
  loadPaperAccount(false).catch((error) => {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  });
});
document.getElementById("runPaperBtn").addEventListener("click", () => {
  loadPaperAccount(true).catch((error) => {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  });
});
document.getElementById("saveStrategyBtn").addEventListener("click", () => {
  savePaperStrategy(readStrategyForm(false)).catch((error) => {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  });
});
document.getElementById("resetStrategyBtn").addEventListener("click", () => {
  savePaperStrategy(readStrategyForm(true)).catch((error) => {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  });
});
document.getElementById("saveSelectionStrategyBtn").addEventListener("click", () => {
  saveSelectionStrategy(readSelectionStrategyForm(false)).catch((error) => {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  });
});
document.getElementById("resetSelectionStrategyBtn").addEventListener("click", () => {
  saveSelectionStrategy(readSelectionStrategyForm(true)).catch((error) => {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  });
});

document.getElementById("strategyList").addEventListener("click", (event) => {
  const detail = event.target.closest("[data-strategy-detail]");
  if (detail) {
    openStrategyDetail(detail.dataset.strategyDetail, "operation");
  }
});

document.getElementById("strategyList").addEventListener("change", (event) => {
  if (event.target.matches("[data-strategy-enable]")) {
    const field = strategyFields.find((item) => item.key === event.target.dataset.strategyEnable);
    if (field) updateStrategyRowState(field, "strategy", event.target.checked);
    return;
  }
  if (event.target.matches('input[type="checkbox"][data-strategy-key="tradeMarkets"]')) {
    const inputs = Array.from(document.querySelectorAll('[data-strategy-key="tradeMarkets"]'));
    if (event.target.value === "all" && event.target.checked) {
      inputs.forEach((input) => {
        if (input.value !== "all") input.checked = false;
      });
    } else if (event.target.value !== "all" && event.target.checked) {
      const all = inputs.find((input) => input.value === "all");
      if (all) all.checked = false;
    }
    if (!inputs.some((input) => input.checked)) {
      const chiNext = inputs.find((input) => input.value === "chinext");
      if (chiNext) chiNext.checked = true;
    }
    return;
  }
});

document.getElementById("selectionStrategyList").addEventListener("click", (event) => {
  const detail = event.target.closest("[data-selection-detail]");
  if (detail) {
    openStrategyDetail(detail.dataset.selectionDetail, "selection");
  }
});

document.getElementById("selectionStrategyList").addEventListener("change", (event) => {
  if (event.target.matches("[data-selection-enable]")) {
    const key = event.target.dataset.selectionEnable;
    if (key === "useLateMomentumSort") {
      updateMomentumRowState(event.target.checked);
    } else {
      const field = selectionStrategyFields.find((item) => item.key === key);
      if (field) updateStrategyRowState(field, "selection", event.target.checked);
    }
    return;
  }
  if (event.target.matches('input[type="checkbox"][data-selection-key="useLateMomentumSort"]')) {
    updateMomentumRowState(event.target.checked);
    return;
  }
  if (event.target.matches('input[type="checkbox"][data-selection-key="useStockChangeFilter"]')) {
    const row = event.target.closest(".strategy-row");
    if (row) {
      row.classList.toggle("is-custom", event.target.checked);
      row.classList.toggle("is-default", !event.target.checked);
    }
    return;
  }
  if (event.target.matches('input[type="checkbox"][data-selection-key="useTurnoverVolumeRatio"]')) {
    const row = event.target.closest(".strategy-row");
    if (row) {
      row.classList.toggle("is-custom", event.target.checked);
      row.classList.toggle("is-default", !event.target.checked);
    }
    return;
  }
  if (event.target.matches('input[type="checkbox"][data-selection-key="useVolumeRatioFilter"]')) {
    const row = event.target.closest(".strategy-row");
    if (row) {
      row.classList.toggle("is-custom", event.target.checked);
      row.classList.toggle("is-default", !event.target.checked);
    }
    return;
  }
  if (event.target.matches('input[type="checkbox"][data-selection-key="useBoardScoreFilter"]')) {
    const row = event.target.closest(".strategy-row");
    if (row) {
      row.classList.toggle("is-custom", event.target.checked);
      row.classList.toggle("is-default", !event.target.checked);
    }
    return;
  }
  if (event.target.matches('input[type="checkbox"][data-selection-key="requireTenDayGainLimit"]')) {
    const row = event.target.closest(".strategy-row");
    if (row) {
      row.classList.toggle("is-custom", event.target.checked);
      row.classList.toggle("is-default", !event.target.checked);
    }
    return;
  }
  if (event.target.matches('input[type="checkbox"][data-selection-key="requireRecentVolumeExpansion"]')) {
    const row = event.target.closest(".strategy-row");
    if (row) {
      row.classList.toggle("is-custom", event.target.checked);
      row.classList.toggle("is-default", !event.target.checked);
    }
    return;
  }
  if (event.target.matches('input[type="checkbox"][data-selection-key="requireSixtyDayHighBreakout"]')) {
    const row = event.target.closest(".strategy-row");
    if (row) {
      row.classList.toggle("is-custom", event.target.checked);
      row.classList.toggle("is-default", !event.target.checked);
    }
    return;
  }
  if (event.target.matches('input[type="checkbox"][data-selection-key="requirePreviousDayChangeLimit"]')) {
    const row = event.target.closest(".strategy-row");
    if (row) {
      row.classList.toggle("is-custom", event.target.checked);
      row.classList.toggle("is-default", !event.target.checked);
    }
    return;
  }
  if (event.target.matches('input[type="checkbox"][data-selection-key="requireFreeFloatCapLimit"]')) {
    const row = event.target.closest(".strategy-row");
    if (row) {
      row.classList.toggle("is-custom", event.target.checked);
      row.classList.toggle("is-default", !event.target.checked);
    }
    return;
  }
  if (event.target.matches('input[type="checkbox"][data-selection-key="selectionMarkets"]')) {
    const inputs = Array.from(document.querySelectorAll('[data-selection-key="selectionMarkets"]'));
    if (event.target.value === "all" && event.target.checked) {
      inputs.forEach((input) => {
        if (input.value !== "all") input.checked = false;
      });
    } else if (event.target.value !== "all" && event.target.checked) {
      const all = inputs.find((input) => input.value === "all");
      if (all) all.checked = false;
    }
    if (!inputs.some((input) => input.checked)) {
      const all = inputs.find((input) => input.value === "all");
      if (all) all.checked = true;
    }
    return;
  }
});

document.getElementById("selectionStrategyList").addEventListener("input", updateSelectionScorePreview);
document.getElementById("selectionStrategyList").addEventListener("change", updateSelectionScorePreview);

document.getElementById("adminUserList").addEventListener("click", (event) => {
  const button = event.target.closest(".reset-managed-user");
  if (!button) return;
  document.getElementById("newManagedUsername").value = button.dataset.userName || button.dataset.userKey || "";
  document.getElementById("newManagedPassword").value = "";
  openModal("adminUserModal");
  document.getElementById("newManagedPassword").focus();
});

document.addEventListener("click", (event) => {
  const close = event.target.closest("[data-close]");
  if (close) closeModal(close.dataset.close);
  if (event.target.classList.contains("auth-modal")) closeModal(event.target.id);
});

document.getElementById("moneyForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) return setMessage("请先登录", "error");
  account.initialCapital = Number(document.getElementById("initialCapital").value || 0);
  account.cash = Number(document.getElementById("cashAmount").value || 0);
  saveAccount();
  renderAll();
  setMessage("账户资金已保存", "ok");
});

document.getElementById("adminUserForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await createManagedUser(
      document.getElementById("newManagedUsername").value,
      document.getElementById("newManagedPassword").value
    );
    event.target.reset();
    closeModal("adminUserModal");
    setMessage("用户已新增", "ok");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  }
});

document.getElementById("positionsList").addEventListener("click", (event) => {
  const row = event.target.closest(".edit-row");
  if (!row) return;
  try {
    if (event.target.closest(".sell-position")) {
      openSellTrade(row.dataset.code);
      return;
    }
    if (event.target.closest(".sell-detail")) {
      openSellDetail(row.dataset.code);
      return;
    }
    if (event.target.closest(".edit-position")) {
      editingCode = editingCode === row.dataset.code ? "" : row.dataset.code;
      renderPositions();
      return;
    }
    if (event.target.closest(".save-position")) {
      editingCode = "";
      saveEditedPosition(row);
      setMessage("持仓已更新", "ok");
    }
    if (event.target.closest(".delete-position")) {
      delete positions[row.dataset.code];
      savePositions();
      renderAll();
      schedulePositionRefresh();
      setMessage("持仓已删除", "ok");
    }
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  }
});

document.getElementById("passwordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    throw new Error("预置账号暂不支持自助改密");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  }
});

document.getElementById("tradeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    applyTrade({
      type: document.getElementById("tradeType").value,
      code: document.getElementById("tradeCode").value,
      name: document.getElementById("tradeName").value,
      quantity: document.getElementById("tradeQuantity").value,
      price: document.getElementById("tradePrice").value
    });
    event.target.reset();
    setMessage("买卖记录已保存", "ok");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  }
});

function init() {
  const sessionKey = localStorage.getItem(SESSION_KEY);
  authToken = localStorage.getItem(AUTH_TOKEN_KEY) || "";
  const users = loadProfileCache();
  currentUser = sessionKey && users[sessionKey] ? users[sessionKey] : null;
  paperMode = currentUser && currentUser.key === "test";
  if (currentUser) loadUserData();
  renderAll();
  updateAutoRefreshUi();
  if (paperMode) loadPaperAccount(false).catch((error) => {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  });
  if (currentUser && currentUser.role === "admin") loadAdminUsers();
  if (!currentUser && new URLSearchParams(location.search).has("login")) {
    openModal("loginModal");
    document.getElementById("accountUsername").focus();
  }
}

init();
