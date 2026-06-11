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
  { key: "tradeMarkets", label: "买入市场", type: "multiSelect", unit: "", options: [
    { value: "all", label: "全部" },
    { value: "chinext", label: "创业板" },
    { value: "star", label: "科创板" },
    { value: "main", label: "主板" },
    { value: "beijing", label: "北交所" }
  ], detail: "自动买入允许操作的市场范围，支持多选。勾选全部时允许所有市场；默认仅创业板。其它市场即使未勾选，仍可作为板块强度佐证。" },
  { key: "buyOncePerDay", label: "每日一次买入", type: "boolean", unit: "", detail: "开启后每天只在尾盘窗口执行一次新开仓。默认开启，避免反复运行重复买入。" },
  { key: "strongPnlPct", label: "强势盈利", type: "number", min: 0, max: 10, step: 0.1, unit: "%", detail: "次日持仓浮盈达到该比例时标记强势兑现。默认 2%。" },
  { key: "strongOpenPct", label: "强势开盘", type: "number", min: 0, max: 10, step: 0.1, unit: "%", detail: "次日开盘价相对成本达到该比例时标记强势兑现。默认 1.5%。" },
  { key: "strongQuoteChangePct", label: "强势涨幅", type: "number", min: 0, max: 10, step: 0.1, unit: "%", detail: "次日个股实时涨幅达到该比例时标记强势兑现。默认 3%。" },
  { key: "flatPnlFloorPct", label: "平盘盈亏", type: "number", min: -10, max: 5, step: 0.1, unit: "%", detail: "次日浮盈亏不低于该值时标记平盘确认。默认 -1%，低于则偏弱势风控。" },
  { key: "flatOpenFloorPct", label: "平盘开盘", type: "number", min: -10, max: 5, step: 0.1, unit: "%", detail: "次日开盘相对成本不低于该值时标记平盘确认。默认 -1.2%，低于则偏弱势风控。" }
];

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
const SELECTION_STRATEGY_VERSION = 12;

const SELECTION_STRATEGY_FIELDS = [
  { key: "useLateMomentumSort", label: "分钟涨幅排序", type: "boolean", unit: "", detail: "开启后从14:30开始，过滤指定分钟涨幅低于下限的股票，并按该分钟涨幅降序排列。" },
  { key: "lateMomentumMinutes", label: "涨幅分钟数", type: "integer", min: 1, max: 60, step: 1, unit: "分钟", detail: "计算尾盘短周期涨幅的分钟数，默认15分钟。只有开启分钟涨幅排序时生效。" },
  { key: "minLateMomentumPct", label: "最低分钟涨幅", type: "number", min: -5, max: 20, step: 0.1, unit: "%", detail: "14:30后指定分钟涨幅下限，默认3%。只有开启分钟涨幅排序时生效。" },
  { key: "useStockChangeFilter", label: "涨幅筛选", type: "boolean", unit: "", detail: "勾选后按最低涨幅和最高涨幅过滤候选；不勾选时当日涨幅只展示，不参与候选过滤。默认开启，建议先用 3%-18.8%。" },
  { key: "minStockChangePct", label: "最低涨幅", type: "number", min: 0, max: 12, step: 0.1, unit: "%", detail: "涨幅筛选开启时，候选股票当日涨幅必须大于等于该数值。默认 3%，用于确认个股有主动性。" },
  { key: "maxStockChangePct", label: "最高涨幅", type: "number", min: 5, max: 19.5, step: 0.1, unit: "%", detail: "涨幅筛选开启时，候选股票当日涨幅必须小于等于该数值。默认 18.8%，用于避开涨停和近涨停追高。" },
  { key: "useTurnoverVolumeRatio", label: "换手筛选", type: "boolean", unit: "", detail: "勾选后按最低换手和最高换手过滤候选；不勾选时换手率只展示，不参与筛选。默认关闭。" },
  { key: "minTurnoverPct", label: "最低换手", type: "number", min: 0, max: 20, step: 0.1, unit: "%", detail: "换手筛选开启时，候选股票换手率必须大于等于该数值。默认 2%。" },
  { key: "maxTurnoverPct", label: "最高换手", type: "number", min: 5, max: 60, step: 0.5, unit: "%", detail: "换手筛选开启时，候选股票换手率必须小于等于该数值。默认 25%。" },
  { key: "useVolumeRatioFilter", label: "量比筛选", type: "boolean", unit: "", detail: "勾选后按最低量比和最高量比过滤候选；不勾选时量比只展示。量比 = 当前平均每分钟成交量 / 过去5个交易日平均每分钟成交量。默认关闭，建议先用 1.0-5.0。" },
  { key: "minVolumeRatio", label: "最低量比", type: "number", min: 0, max: 8, step: 0.1, unit: "", detail: "量比筛选开启时，候选股票量比必须大于等于该数值。默认 1.0。低于 1 通常表示当前成交节奏弱于过去5日均值。" },
  { key: "maxVolumeRatio", label: "最高量比", type: "number", min: 1, max: 20, step: 0.1, unit: "", detail: "量比筛选开启时，候选股票量比必须小于等于该数值。默认 5.0。过高量比可能意味着突发放量、分歧加大或消息刺激。" },
  { key: "useBoardScoreFilter", label: "板块评分", type: "boolean", unit: "", detail: "勾选后按最低板块评分过滤候选；不勾选时不按板块强度过滤，只把板块评分作为展示和排序参考。默认开启。" },
  { key: "minBoardScore", label: "板块评分", type: "integer", min: 60, max: 96, step: 1, unit: "分", detail: "板块评分筛选开启时，看板展示的最低板块强度。默认 78 分，提高后只显示更强热点方向，降低后候选更多。" },
  { key: "selectionMarkets", label: "选股市场", type: "multiSelect", unit: "", options: [
    { value: "all", label: "全部" },
    { value: "chinext", label: "创业板" },
    { value: "star", label: "科创板" },
    { value: "main", label: "主板" },
    { value: "beijing", label: "北交所" }
  ], detail: "看板候选允许展示的市场范围，支持多选。勾选全部时显示所有市场，默认创业板。" },
  { key: "requireBullTrend", label: "日线多头", type: "boolean", unit: "", detail: "开启后看板只显示日线多头排列候选。默认关闭，避免盘前或日线源不稳定时把候选全部筛空。" },
  { key: "requireTenDayGainLimit", label: "涨幅限制", type: "boolean", unit: "", detail: "勾选后按指定交易日内的累计涨幅区间过滤候选；不勾选时该周期涨幅只展示。默认关闭；开启后建议 10日 -100%-60%，等价于只限制最近10日涨幅不大于60%。" },
  { key: "tenDayGainLookbackDays", label: "涨幅观察日数", type: "integer", min: 3, max: 60, step: 1, unit: "日", detail: "计算累计涨幅的交易日数量，默认10日。" },
  { key: "minTenDayGainPct", label: "最低区间涨幅", type: "number", min: -100, max: 200, step: 1, unit: "%", detail: "涨幅限制开启时，候选股票指定周期累计涨幅必须大于等于该数值。默认 -100%，用于保持原先只看最高涨幅的逻辑。" },
  { key: "maxTenDayGainPct", label: "最高区间涨幅", type: "number", min: -100, max: 300, step: 1, unit: "%", detail: "涨幅限制开启时，候选股票指定周期累计涨幅必须小于等于该数值。默认60%。" },
  { key: "requireRecentVolumeExpansion", label: "成交量限制", type: "boolean", unit: "", detail: "勾选后要求指定观察期内，至少有指定天数成交量大于长期平均成交量。默认关闭；开启后建议 10日内3天成交量大于120日平均成交量。" },
  { key: "recentVolumeLookbackDays", label: "成交量观察日数", type: "integer", min: 3, max: 30, step: 1, unit: "日", detail: "统计放量次数的观察窗口，默认10日。" },
  { key: "minRecentHighVolumeDays", label: "最低放量天数", type: "integer", min: 1, max: 20, step: 1, unit: "天", detail: "观察窗口内成交量高于长期均量的最低天数，默认3天。" },
  { key: "volumeAverageDays", label: "成交量平均日数", type: "integer", min: 20, max: 250, step: 5, unit: "日", detail: "长期平均成交量的计算周期，默认120日。" },
  { key: "requireSixtyDayHighBreakout", label: "新高观察周期", type: "boolean", unit: "", detail: "勾选后要求当前实时价格达到指定观察周期内已完成交易日的最高价。默认关闭；开启后建议60日。" },
  { key: "highBreakoutLookbackDays", label: "新高观察周期", type: "integer", min: 20, max: 120, step: 5, unit: "日", detail: "计算阶段高点的交易日数量，默认60日。只有开启新高观察周期时生效。" },
  { key: "requirePreviousDayChangeLimit", label: "昨日最高涨幅", type: "boolean", unit: "", detail: "勾选后按昨日收盘价相对前日收盘价的实际涨幅上限过滤。默认小于5%。" },
  { key: "maxPreviousDayChangePct", label: "昨日最高涨幅", type: "number", min: -5, max: 20, step: 0.1, unit: "%", detail: "昨日实际涨幅必须小于该值，默认小于5%。" },
  { key: "requireFreeFloatCapLimit", label: "流通市值筛选", type: "boolean", unit: "", detail: "勾选后按最低流通市值和最高流通市值过滤候选；不勾选时流通市值只展示。公开行情使用流通市值作为自由流通市值的近似口径。默认关闭；开启后建议先用 0-800 亿。" },
  { key: "minFreeFloatCapYi", label: "最低流通市值", type: "number", min: 0, max: 5000, step: 10, unit: "亿", detail: "流通市值筛选开启时，候选股票流通市值必须大于等于该数值。默认 0 亿。" },
  { key: "maxFreeFloatCapYi", label: "最高流通市值", type: "number", min: 10, max: 5000, step: 10, unit: "亿", detail: "流通市值筛选开启时，候选股票流通市值必须小于等于该数值。默认 800 亿。" },
  { key: "avoidNearLimit", label: "避开近涨停", type: "boolean", unit: "", detail: "开启后涨停和近涨停只作板块锚点，不作为尾盘买点。默认开启。" },
  { key: "avoidPreviousLimitMove", label: "前日涨跌停", type: "boolean", unit: "", detail: "勾选后过滤前一交易日涨停或跌停的个股。系统按前一交易日收盘涨跌幅和对应市场涨跌停阈值判断。默认开启，用来避开前一天已经极端高潮或极端恐慌的股票。" },
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
    if (field.type === "multiSelect") {
      const allowed = new Set((field.options || []).map((option) => option.value));
      const source = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
      const values = source.filter((value) => allowed.has(value));
      normalized[field.key] = values.includes("all") ? ["all"] : values.length ? Array.from(new Set(values)) : [...defaults[field.key]];
      return;
    }
    const value = field.type === "integer" ? Math.round(Number(raw)) : Number(raw);
    if (!Number.isFinite(value)) return;
    normalized[field.key] = Math.min(field.max, Math.max(field.min, value));
  });
  return normalized;
}

function fieldByKey(fields, key) {
  return fields.find((field) => field.key === key) || {};
}

function repairNumericRange(normalized, fields, minKey, maxKey, step = 1) {
  const minField = fieldByKey(fields, minKey);
  const maxField = fieldByKey(fields, maxKey);
  if (normalized[maxKey] > normalized[minKey]) return;
  const nextMax = normalized[minKey] + step;
  if (Number.isFinite(maxField.max) && nextMax <= maxField.max) {
    normalized[maxKey] = nextMax;
    return;
  }
  normalized[maxKey] = Number.isFinite(maxField.max) ? maxField.max : nextMax;
  const nextMin = normalized[maxKey] - step;
  if (Number.isFinite(minField.min)) normalized[minKey] = Math.max(minField.min, nextMin);
  else normalized[minKey] = nextMin;
}

function normalizeOperationStrategy(input = {}) {
  const normalized = normalizeStrategy(input, DEFAULT_OPERATION_STRATEGY, OPERATION_STRATEGY_FIELDS);
  repairNumericRange(normalized, OPERATION_STRATEGY_FIELDS, "minChangePct", "maxChangePct", 0.5);
  return normalized;
}

function normalizeSelectionStrategy(input = {}) {
  const normalized = normalizeStrategy(input, DEFAULT_SELECTION_STRATEGY, SELECTION_STRATEGY_FIELDS);
  repairNumericRange(normalized, SELECTION_STRATEGY_FIELDS, "minStockChangePct", "maxStockChangePct", 0.5);
  repairNumericRange(normalized, SELECTION_STRATEGY_FIELDS, "minVolumeRatio", "maxVolumeRatio", 0.1);
  repairNumericRange(normalized, SELECTION_STRATEGY_FIELDS, "minTenDayGainPct", "maxTenDayGainPct", 1);
  repairNumericRange(normalized, SELECTION_STRATEGY_FIELDS, "minFreeFloatCapYi", "maxFreeFloatCapYi", 10);
  normalized.minRecentHighVolumeDays = Math.min(normalized.minRecentHighVolumeDays, normalized.recentVolumeLookbackDays);
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
