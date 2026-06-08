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
  buyOncePerDay: true,
  strongPnlPct: 2,
  strongOpenPct: 1.5,
  strongQuoteChangePct: 3,
  flatPnlFloorPct: -1,
  flatOpenFloorPct: -1.2
};

const OPERATION_STRATEGY_FIELDS = [
  { key: "maxPositions", label: "最大持仓", type: "integer", min: 1, max: 8, step: 1, unit: "只", detail: "限制模拟盘同时持有的股票数量。默认 3 只，越大越分散，越小越集中。" },
  { key: "maxPositionPct", label: "单票仓位", type: "number", min: 5, max: 80, step: 1, unit: "%", detail: "单只股票最多使用初始本金的比例。默认 30%，100000 元本金时单票最多约 30000 元。" },
  { key: "minChangePct", label: "买入最低涨幅", type: "number", min: 0, max: 15, step: 0.1, unit: "%", detail: "自动买入时的个股涨幅下限。默认 3%，太低说明主动性不足。" },
  { key: "maxChangePct", label: "买入最高涨幅", type: "number", min: 5, max: 19.5, step: 0.1, unit: "%", detail: "自动买入时的个股涨幅上限。默认 18.8%，用于避开涨停和近涨停的追高票。" },
  { key: "minBoardScore", label: "买入板块评分", type: "integer", min: 60, max: 96, step: 1, unit: "分", detail: "自动买入时所属板块最低强度评分。默认 84，要求板块先成为强方向。" },
  { key: "minStockScore", label: "买入个股评分", type: "integer", min: 60, max: 96, step: 1, unit: "分", detail: "自动买入时个股最低评分。默认 84，综合涨幅、换手、量比、状态和日线排列。" },
  { key: "minConfidence", label: "买入置信度", type: "integer", min: 35, max: 92, step: 1, unit: "分", detail: "自动买入时最低置信度。默认 70，用来过滤盘口阶段和风险扣分后的弱候选。" },
  { key: "maxTurnoverPct", label: "买入最高换手", type: "number", min: 5, max: 60, step: 0.5, unit: "%", detail: "自动买入时的最高换手率。默认 25%，超过后容易放大次日分歧。" },
  { key: "requireBullTrend", label: "买入日线多头", type: "boolean", unit: "", detail: "开启后自动买入只选日线多头排列股票。默认开启，对应 MA5 > MA10 > MA20 且收盘在 MA5 上方。" },
  { key: "buyOncePerDay", label: "每日一次买入", type: "boolean", unit: "", detail: "开启后每天只在尾盘窗口执行一次新开仓。默认开启，避免反复运行重复买入。" },
  { key: "strongPnlPct", label: "强势盈利", type: "number", min: 0, max: 10, step: 0.1, unit: "%", detail: "次日持仓浮盈达到该比例时标记强势兑现。默认 2%。" },
  { key: "strongOpenPct", label: "强势开盘", type: "number", min: 0, max: 10, step: 0.1, unit: "%", detail: "次日开盘价相对成本达到该比例时标记强势兑现。默认 1.5%。" },
  { key: "strongQuoteChangePct", label: "强势涨幅", type: "number", min: 0, max: 10, step: 0.1, unit: "%", detail: "次日个股实时涨幅达到该比例时标记强势兑现。默认 3%。" },
  { key: "flatPnlFloorPct", label: "平盘盈亏", type: "number", min: -10, max: 5, step: 0.1, unit: "%", detail: "次日浮盈亏不低于该值时标记平盘确认。默认 -1%，低于则偏弱势风控。" },
  { key: "flatOpenFloorPct", label: "平盘开盘", type: "number", min: -10, max: 5, step: 0.1, unit: "%", detail: "次日开盘相对成本不低于该值时标记平盘确认。默认 -1.2%，低于则偏弱势风控。" }
];

const DEFAULT_SELECTION_STRATEGY = {
  minStockChangePct: 3,
  maxStockChangePct: 18.8,
  minTurnoverPct: 2,
  maxTurnoverPct: 25,
  minVolumeRatio: 1,
  minBoardScore: 78,
  minStockScore: 76,
  minBoardBreadthPct: 45,
  minActiveStocks: 3,
  requireBullTrend: false,
  avoidNearLimit: true,
  preferElastic20cm: true,
  strictLateWindow: false
};
const SELECTION_STRATEGY_VERSION = 2;

const SELECTION_STRATEGY_FIELDS = [
  { key: "minStockChangePct", label: "最低涨幅", type: "number", min: 0, max: 12, step: 0.1, unit: "%", detail: "看板选股的当日涨幅下限。常见尾盘买入法会要求个股有主动性，默认 3%。" },
  { key: "maxStockChangePct", label: "最高涨幅", type: "number", min: 5, max: 19.5, step: 0.1, unit: "%", detail: "看板选股的当日涨幅上限。默认 18.8%，用于放弃涨停和近涨停，避免尾盘追高。" },
  { key: "minTurnoverPct", label: "最低换手", type: "number", min: 0, max: 20, step: 0.1, unit: "%", detail: "看板选股的最低换手。常见变形会用 3%-10% 或更宽区间确认活跃度，默认 2%。" },
  { key: "maxTurnoverPct", label: "最高换手", type: "number", min: 5, max: 60, step: 0.5, unit: "%", detail: "看板选股的最高换手。默认 25%，过高容易表示分歧大，次日波动也更大。" },
  { key: "minVolumeRatio", label: "最低量比", type: "number", min: 0, max: 8, step: 0.1, unit: "", detail: "看板选股的最低量比。部分变形要求量比 1.2 以上确认资金活跃，默认 1.0。" },
  { key: "minBoardScore", label: "板块评分", type: "integer", min: 60, max: 96, step: 1, unit: "分", detail: "看板展示的最低板块强度。提高后只显示更强热点方向，降低后候选更多。" },
  { key: "minStockScore", label: "个股评分", type: "integer", min: 50, max: 96, step: 1, unit: "分", detail: "看板展示的最低个股评分。提高后偏强势前排，降低后包含更多跟随承接票。" },
  { key: "minBoardBreadthPct", label: "上涨广度", type: "integer", min: 0, max: 90, step: 1, unit: "%", detail: "板块上涨家数占比下限。用于确认板块不是单点拉升，默认 45%。" },
  { key: "minActiveStocks", label: "活跃家数", type: "integer", min: 0, max: 20, step: 1, unit: "只", detail: "板块中涨幅 5% 以上股票的最低数量。默认 3，只显示更有扩散的板块。" },
  { key: "requireBullTrend", label: "日线多头", type: "boolean", unit: "", detail: "开启后看板只显示日线多头排列候选。默认关闭，避免盘前或日线源不稳定时把候选全部筛空。" },
  { key: "avoidNearLimit", label: "避开近涨停", type: "boolean", unit: "", detail: "开启后涨停和近涨停只作板块锚点，不作为尾盘买点。默认开启。" },
  { key: "preferElastic20cm", label: "偏好20cm", type: "boolean", unit: "", detail: "开启后 20cm/30cm 弹性票评分略占优。关闭后 10cm 助攻和普通承接票权重更平均。" },
  { key: "strictLateWindow", label: "仅尾盘候选", type: "boolean", unit: "", detail: "开启后只有 14:30 后尾盘窗口才显示买点候选，其它时间主要用于复盘和跟踪。" }
];

function normalizeStrategy(input = {}, defaults, fields) {
  const normalized = { ...defaults };
  fields.forEach((field) => {
    const raw = input[field.key];
    if (field.type === "boolean") {
      if (typeof raw === "boolean") normalized[field.key] = raw;
      if (raw === "true") normalized[field.key] = true;
      if (raw === "false") normalized[field.key] = false;
      return;
    }
    const value = field.type === "integer" ? Math.round(Number(raw)) : Number(raw);
    if (!Number.isFinite(value)) return;
    normalized[field.key] = Math.min(field.max, Math.max(field.min, value));
  });
  return normalized;
}

function normalizeOperationStrategy(input = {}) {
  const normalized = normalizeStrategy(input, DEFAULT_OPERATION_STRATEGY, OPERATION_STRATEGY_FIELDS);
  if (normalized.maxChangePct <= normalized.minChangePct) normalized.maxChangePct = normalized.minChangePct + 0.5;
  return normalized;
}

function normalizeSelectionStrategy(input = {}) {
  const normalized = normalizeStrategy(input, DEFAULT_SELECTION_STRATEGY, SELECTION_STRATEGY_FIELDS);
  if (normalized.maxStockChangePct <= normalized.minStockChangePct) normalized.maxStockChangePct = normalized.minStockChangePct + 0.5;
  return normalized;
}

function fieldsWithDefaults(fields, defaults) {
  return fields.map((field) => ({
    ...field,
    defaultValue: defaults[field.key]
  }));
}

module.exports = {
  DEFAULT_OPERATION_STRATEGY,
  DEFAULT_SELECTION_STRATEGY,
  SELECTION_STRATEGY_VERSION,
  OPERATION_STRATEGY_FIELDS,
  SELECTION_STRATEGY_FIELDS,
  fieldsWithDefaults,
  normalizeOperationStrategy,
  normalizeSelectionStrategy
};
