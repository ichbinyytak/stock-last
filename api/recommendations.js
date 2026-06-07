const HOSTS = [
  "https://push2delay.eastmoney.com",
  "https://push2.eastmoney.com",
  "https://33.push2.eastmoney.com",
  "https://80.push2.eastmoney.com",
  "https://81.push2.eastmoney.com",
  "https://82.push2.eastmoney.com",
  "https://87.push2.eastmoney.com"
];

const UT = "bd1d9ddb04089700cf9c27f6f7426281";
const BOARD_FIELDS = "f12,f14,f2,f3,f4,f8,f20,f104,f105,f128,f140";
const STOCK_FIELDS = "f12,f14,f2,f3,f4,f6,f8,f10,f20";

function chinaTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const get = (type) => (parts.find((part) => part.type === type) || {}).value || "";
  return {
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute"))
  };
}

function marketStatus(date = new Date()) {
  const time = chinaTimeParts(date);
  const weekdayMap = {
    周一: 1,
    周二: 2,
    周三: 3,
    周四: 4,
    周五: 5,
    周六: 6,
    周日: 0,
    星期一: 1,
    星期二: 2,
    星期三: 3,
    星期四: 4,
    星期五: 5,
    星期六: 6,
    星期日: 0
  };
  const day = weekdayMap[time.weekday];
  const minutes = time.hour * 60 + time.minute;
  const isWeekday = day >= 1 && day <= 5;
  const auctionOpen = minutes >= 9 * 60 + 15 && minutes < 9 * 60 + 20;
  const auctionLocked = minutes >= 9 * 60 + 20 && minutes < 9 * 60 + 25;
  const preOpen = minutes >= 9 * 60 + 25 && minutes < 9 * 60 + 30;
  const morning = minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30;
  const lunchBreak = minutes > 11 * 60 + 30 && minutes < 13 * 60;
  const afternoon = minutes >= 13 * 60 && minutes < 14 * 60 + 30;
  const lateDay = minutes >= 14 * 60 + 30 && minutes < 14 * 60 + 57;
  const closeAuction = minutes >= 14 * 60 + 57 && minutes <= 15 * 60;
  const isTrading = isWeekday && (morning || afternoon || lateDay);

  if (isWeekday && auctionOpen) {
    return {
      isTrading: false,
      isAuction: true,
      label: "竞价可撤",
      mode: "auction-open",
      buyWindow: "预筛",
      note: "9:15-9:20 集合竞价，可撤单，显示竞价行情"
    };
  }

  if (isWeekday && auctionLocked) {
    return {
      isTrading: false,
      isAuction: true,
      label: "竞价不可撤",
      mode: "auction-locked",
      buyWindow: "预筛",
      note: "9:20-9:25 集合竞价，不可撤单，显示竞价行情"
    };
  }

  if (isWeekday && preOpen) {
    return {
      isTrading: false,
      isAuction: true,
      label: "开盘前",
      mode: "pre-open",
      buyWindow: "预筛",
      note: "9:25-9:30 集合竞价结果已出，等待连续竞价开盘"
    };
  }

  if (isWeekday && closeAuction) {
    return {
      isTrading: false,
      isAuction: true,
      label: "尾盘竞价",
      mode: "close-auction",
      buyWindow: "复盘",
      note: "14:57-15:00 尾盘集合竞价"
    };
  }

  if (isWeekday && lateDay) {
    return {
      isTrading: true,
      isAuction: false,
      label: "尾盘窗口",
      mode: "late-day",
      buyWindow: "可确认",
      note: "14:30-14:57 尾盘买入法确认区间"
    };
  }

  if (isWeekday && lunchBreak) {
    return {
      isTrading: false,
      isAuction: false,
      label: "午间休市",
      mode: "lunch-break",
      buyWindow: "复盘",
      note: "午间休市，显示上午最后行情"
    };
  }

  return {
    isTrading,
    isAuction: false,
    label: isTrading ? "交易中" : "前市",
    mode: isTrading ? "realtime" : "previous-session",
    buyWindow: isTrading ? "跟踪" : "复盘",
    note: isTrading ? "实时行情生成" : "休市，显示前一交易时段最后行情"
  };
}

function params(fs, fields, pz, fid = "f3") {
  return new URLSearchParams({
    pn: "1",
    pz: String(pz),
    po: "1",
    np: "1",
    ut: UT,
    fltt: "2",
    invt: "2",
    fid,
    fs,
    fields
  });
}

async function fetchJson(host, fs, fields, pz, timeoutMs = 4500, fid = "f3") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${host}/api/qt/clist/get?${params(fs, fields, pz, fid)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://quote.eastmoney.com/",
        Accept: "application/json,text/plain,*/*"
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const rows = payload && payload.data && payload.data.diff;
    return Array.isArray(rows) ? rows : [];
  } finally {
    clearTimeout(timer);
  }
}

async function chooseHost() {
  const tests = await Promise.allSettled(
    HOSTS.map(async (host) => {
      const start = Date.now();
      const rows = await fetchJson(host, "m:90+t:2", "f12,f14,f3", 1, 2500);
      if (!rows.length) throw new Error("empty response");
      return { host, ms: Date.now() - start };
    })
  );
  const ok = tests
    .filter((item) => item.status === "fulfilled")
    .map((item) => item.value)
    .sort((a, b) => a.ms - b.ms);
  if (!ok.length) throw new Error("所有行情源暂时不可用");
  return ok[0];
}

function number(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function pct(row) {
  return number(row.f3, -999);
}

function is20Or30(code) {
  const value = String(code);
  return ["30", "68", "920", "83", "87", "43"].some((prefix) => value.startsWith(prefix));
}

function is10(code) {
  const value = String(code);
  return ["00", "001", "002", "003", "60", "600", "601", "603", "605"].some((prefix) => value.startsWith(prefix));
}

function isTradableStock(row) {
  const name = String(row.f14 || "");
  if (!row.f12) return false;
  if (name.startsWith("N") || name.includes("退市") || name.includes("ST")) return false;
  return true;
}

function isNearLimit(row) {
  const code = String(row.f12);
  const change = pct(row);
  if (["920", "83", "87", "43"].some((prefix) => code.startsWith(prefix))) return change >= 29;
  if (["30", "68"].some((prefix) => code.startsWith(prefix))) return change >= 19;
  if (is10(code)) return change >= 9.6;
  return false;
}

function isLateDayCandidate(row) {
  const change = pct(row);
  const turnover = number(row.f8, 0);
  if (!isTradableStock(row)) return false;
  if (isNearLimit(row)) return false;
  return change >= 3 && change <= 18.8 && turnover >= 2;
}

function formatMoney(value) {
  const amount = number(value, 0);
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}亿`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}万`;
  return amount ? String(Math.round(amount)) : "--";
}

function boardRawScore(board, rows) {
  const change = Math.max(pct(board), 0);
  const turnover = Math.max(number(board.f8, 0), 0);
  const up = Math.max(number(board.f104, 0), 0);
  const down = Math.max(number(board.f105, 0), 0);
  const breadth = (up - down) / Math.max(up + down, 1);
  const front20 = rows.filter((row) => is20Or30(row.f12) && pct(row) >= 15).length;
  const support10 = rows.filter((row) => is10(row.f12) && pct(row) >= 9).length;
  const active = rows.filter((row) => pct(row) >= 5).length;
  const tailCandidates = rows.filter((row) => pct(row) >= 5 && pct(row) <= 18 && number(row.f8, 0) >= 3).length;
  return change * 5 + turnover * 0.35 + breadth * 20 + front20 * 8 + support10 * 5 + active * 0.7 + tailCandidates * 2.5;
}

function isTradableTheme(board) {
  const name = String(board.f14 || "");
  const blocked = [
    "昨日",
    "近期",
    "涨停",
    "打板",
    "炸板",
    "龙虎榜",
    "融资融券",
    "沪股通",
    "深股通",
    "MSCI",
    "富时",
    "标普",
    "AH股",
    "转债"
  ];
  return !blocked.some((word) => name.includes(word));
}

function normalizeScores(items) {
  const values = items.map((item) => item.rawScore);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return items.map((item, index) => {
    const normalized = max === min ? 82 - index * 2 : 68 + ((item.rawScore - min) / (max - min)) * 28;
    return { ...item, score: Math.max(60, Math.min(96, Math.round(normalized))) };
  });
}

function boardRisk(board, front20, support10) {
  const change = pct(board);
  if (front20 >= 3 && support10 >= 3 && change >= 3) return "低";
  if (front20 >= 1 || support10 >= 2) return "中";
  return "高";
}

function boardMetrics(board, rows) {
  const up = Math.max(number(board.f104, 0), 0);
  const down = Math.max(number(board.f105, 0), 0);
  const total = Math.max(up + down, 1);
  const front20 = rows.filter((row) => is20Or30(row.f12) && pct(row) >= 15).length;
  const sealed20 = rows.filter((row) => is20Or30(row.f12) && pct(row) >= 19.5).length;
  const support10 = rows.filter((row) => is10(row.f12) && pct(row) >= 9).length;
  const sealed10 = rows.filter((row) => is10(row.f12) && pct(row) >= 9.7).length;
  const active = rows.filter((row) => pct(row) >= 5).length;
  return {
    up,
    down,
    breadth: up / total,
    strengthDiff: (up - down) / total,
    front20,
    sealed20,
    support10,
    sealed10,
    active
  };
}

function phaseAdvice(market) {
  const mode = market.mode;
  if (mode === "auction-open") {
    return {
      summary: "可撤竞价只筛方向，不确认买点",
      boardAction: "竞价观察",
      stockAction: "只观察",
      dataMode: "竞价",
      buyWindow: false
    };
  }
  if (mode === "auction-locked") {
    return {
      summary: "不可撤竞价看真实强弱，强票等9:25确认",
      boardAction: "竞价确认",
      stockAction: "等确认",
      dataMode: "竞价",
      buyWindow: true
    };
  }
  if (mode === "pre-open") {
    return {
      summary: "竞价结果已出，等待9:30连续竞价验证",
      boardAction: "开盘确认",
      stockAction: "等开盘",
      dataMode: "开盘前",
      buyWindow: true
    };
  }
  if (mode === "realtime") {
    return {
      summary: "14:30前只跟踪强线，尾盘再确认承接",
      boardAction: "盘中跟踪",
      stockAction: "等尾盘",
      dataMode: "实时",
      buyWindow: false
    };
  }
  if (mode === "late-day") {
    return {
      summary: "尾盘窗口，按板块强度和个股承接确认候选",
      boardAction: "尾盘确认",
      stockAction: "尾盘候选",
      dataMode: "实时",
      buyWindow: true
    };
  }
  if (mode === "lunch-break") {
    return {
      summary: "午间休市，显示上午最后快照，下午需重新确认",
      boardAction: "午间复盘",
      stockAction: "下午确认",
      dataMode: "上午最后",
      buyWindow: false
    };
  }
  if (mode === "close-auction") {
    return {
      summary: "尾盘竞价只做复盘和次日计划，不追新仓",
      boardAction: "尾盘复盘",
      stockAction: "不追",
      dataMode: "尾盘竞价",
      buyWindow: false
    };
  }
  return {
    summary: "休市显示前一交易时段最后行情，只做复盘",
    boardAction: "前市复盘",
    stockAction: "复盘",
    dataMode: "前市最后",
    buyWindow: false
  };
}

function boardReasons(board, metrics) {
  const reasons = [];
  reasons.push(`板块涨幅${number(board.f3, 0).toFixed(2)}%，当前在强势队列`);
  if (metrics.front20) reasons.push(`${metrics.front20}只20cm/30cm前排，其中${metrics.sealed20}只近封`);
  if (metrics.support10) reasons.push(`${metrics.support10}只10cm助攻，其中${metrics.sealed10}只近封`);
  if (metrics.breadth >= 0.6) reasons.push(`上涨广度${Math.round(metrics.breadth * 100)}%，资金有扩散`);
  else reasons.push(`上涨广度${Math.round(metrics.breadth * 100)}%，扩散仍需确认`);
  return reasons.slice(0, 4);
}

function boardWarnings(board, metrics) {
  const warnings = [];
  if (metrics.front20 === 0) warnings.push("缺少20cm/30cm前排，弹性确认不足");
  if (metrics.support10 === 0) warnings.push("缺少10cm助攻，板块广度不足");
  if (metrics.breadth < 0.45) warnings.push("上涨家数不足，可能是局部拉升");
  if (number(board.f3, 0) >= 5 && metrics.active <= 3) warnings.push("板块涨幅高但扩散窄，警惕追高");
  return warnings;
}

function boardDecision(score, risk, metrics, market) {
  const phase = phaseAdvice(market);
  if (!phase.buyWindow) return phase.boardAction;
  if (score >= 86 && risk !== "高" && (metrics.front20 >= 1 || metrics.support10 >= 2) && metrics.breadth >= 0.55) {
    return "尾盘主线";
  }
  if (score >= 78 && metrics.front20 + metrics.support10 >= 2) return "观察确认";
  return "降级观察";
}

function stockState(row) {
  const change = pct(row);
  const code = String(row.f12);
  if (is20Or30(code)) {
    if (change >= 29.5) return "30cm近封";
    if (change >= 19.5) return "20cm确认";
    if (change >= 15) return "弹性前排";
    if (change >= 8) return "弹性承接";
  }
  if (is10(code)) {
    if (change >= 9.7) return "10cm确认";
    if (change >= 7) return "10cm助攻";
  }
  if (change >= 5) return "承接观察";
  return "观察";
}

function stockRisk(row, state) {
  const turnover = number(row.f8, 0);
  const cap = number(row.f20, 0);
  if (turnover >= 25) return "高换手";
  if (cap >= 30000000000) return "容量大";
  if (state.includes("近封") && turnover > 5 && turnover < 22) return "低";
  if (state.includes("观察") || state === "前排跟随") return "中";
  return "补涨";
}

function stockScore(row, boardScore, state) {
  const change = Math.max(pct(row), 0);
  const turnover = number(row.f8, 0);
  const volumeRatio = number(row.f10, 0);
  const stateScore = state.includes("30cm") ? 8
    : state.includes("20cm确认") ? 10
    : state.includes("弹性前排") ? 26
    : state.includes("弹性承接") ? 22
    : state.includes("10cm确认") ? 8
    : state.includes("10cm助攻") ? 14
    : 8;
  const turnoverScore = turnover >= 5 && turnover <= 22 ? 10 : turnover > 22 ? 5 : 6;
  const positionScore = change >= 5 && change <= 16 ? 8 : change > 18 ? 2 : 4;
  return Math.round(Math.min(96, boardScore * 0.33 + stateScore + change * 0.55 + turnoverScore + positionScore + Math.min(volumeRatio, 5)));
}

function stockConfidence(score, risk, market) {
  let confidence = Math.max(45, Math.min(92, score));
  if (risk === "高换手") confidence -= 8;
  if (risk === "补涨" || risk === "中") confidence -= 4;
  if (market.mode === "auction-open") confidence -= 14;
  if (market.mode === "auction-locked" || market.mode === "pre-open") confidence -= 8;
  if (market.mode === "previous-session" || market.mode === "lunch-break") confidence -= 12;
  return Math.max(35, Math.min(92, Math.round(confidence)));
}

function stockAction(score, risk, state, board, market) {
  const phase = phaseAdvice(market);
  if (market.mode === "auction-open") return "只观察";
  if (market.mode === "auction-locked") {
    if (score >= 86 && board.score >= 86 && risk !== "高换手") return "竞价强";
    return "等9:25";
  }
  if (market.mode === "pre-open") {
    if (score >= 84 && board.score >= 84 && (state.includes("20cm") || state.includes("10cm确认"))) return "开盘盯";
    return "等9:30";
  }
  if (market.mode !== "late-day") return phase.stockAction;
  if (score >= 84 && board.score >= 84 && risk !== "高换手") return "尾盘候选";
  if (score >= 76) return "等承接";
  return "降级";
}

function stockTrigger(row, market) {
  const change = number(row.f3, 0);
  if (isNearLimit(row)) return "涨停/近封只作板块锚点，不列为尾盘买点";
  if (market.mode !== "late-day") return "14:30后再确认均价线和收盘强区";
  if (change >= 18) return "近高位只看开板回封或强承接";
  if (change >= 8) return "站稳均价线，尾盘低点抬高";
  if (change >= 5) return "板块未退潮，尾盘放量上攻";
  return "只观察，不做尾盘买点";
}

function stockReason(boardName, state, risk, score, action, trigger) {
  return `${boardName}方向${state}，${action}，${trigger}，风险${risk}，评分${score}`;
}

function stockReasons(row, board, state) {
  const reasons = [];
  reasons.push(`所属板块${board.name}评分${board.score}`);
  reasons.push(`个股状态${state}，涨幅${number(row.f3, 0).toFixed(2)}%`);
  reasons.push(`换手${number(row.f8, 0).toFixed(1)}%，量比${number(row.f10, 0).toFixed(1)}`);
  if (board.front20) reasons.push(`同板块有${board.front20}只20cm/30cm前排`);
  if (board.support10) reasons.push(`同板块有${board.support10}只10cm助攻`);
  reasons.push("尾盘买入只在14:30后确认承接，不提前抢跑");
  return reasons.slice(0, 5);
}

function stockRisks(boardName, risk, market) {
  const base = [`若${boardName}板块掉出前排，候选优先降级`];
  if (risk === "高换手") base.push("高换手容易放大次日分歧");
  else if (risk === "容量大") base.push("容量票封板弹性较弱，更多看承接");
  else base.push("尾盘急拉但板块不跟随时降低次日溢价预期");
  if (market.mode === "auction-open") base.push("9:20前可撤单，竞价强弱可能失真");
  if (market.mode === "auction-locked") base.push("9:20后不可撤单，但仍需9:25和9:30确认");
  if (market.mode === "pre-open") base.push("竞价结果已出，开盘后若不主动则降级");
  if (market.mode === "late-day") base.push("14:57后进入尾盘竞价，不再追新的突然拉升");
  return base;
}

function nextDayPlan(market) {
  if (market.mode === "auction-open") {
    return ["9:15-9:20：只观察，不按可撤竞价下结论", "9:20后：看不可撤竞价是否继续增强", "9:30后：用连续竞价确认主动性"];
  }
  if (market.mode === "auction-locked") {
    return ["9:20-9:25：只看不可撤竞价中的强弱排序", "9:25-9:30：确认竞价结果是否维持", "9:30后：不主动上攻则降级"];
  }
  if (market.mode === "pre-open") {
    return ["开盘前：准备观察，不追无确认高开", "9:30-9:35：看板块扩散和个股主动性", "弱开或板块掉队：直接降级"];
  }
  return ["强竞价：第一波冲高分批兑现", "平竞价：观察10-30分钟量价承接", "弱竞价：优先卖出，不把尾盘短线做成长线"];
}

function mapStock(row, board, market) {
  const state = stockState(row);
  const risk = stockRisk(row, state);
  const score = stockScore(row, board.score, state);
  const action = stockAction(score, risk, state, board, market);
  const confidence = stockConfidence(score, risk, market);
  const trigger = stockTrigger(row, market);
  return {
    code: String(row.f12),
    name: row.f14 || "--",
    change: number(row.f3, 0),
    turnover: number(row.f8, 0),
    amount: formatMoney(row.f6),
    volumeRatio: number(row.f10, 0),
    cap: formatMoney(row.f20),
    state,
    score,
    risk,
    action,
    confidence,
    trigger,
    reason: stockReason(board.name, state, risk, score, action, trigger),
    reasons: stockReasons(row, board, state),
    risks: stockRisks(board.name, risk, market),
    plan: nextDayPlan(market)
  };
}

async function buildRecommendations() {
  const fastest = await chooseHost();
  const now = new Date();
  const market = marketStatus(now);
  const [industry, concept] = await Promise.all([
    fetchJson(fastest.host, "m:90+t:2", BOARD_FIELDS, 24),
    fetchJson(fastest.host, "m:90+t:3", BOARD_FIELDS, 24)
  ]);
  const seen = new Set();
  const boards = [...industry, ...concept]
    .filter((board) => board.f12 && !seen.has(board.f12) && seen.add(board.f12))
    .filter(isTradableTheme)
    .sort((a, b) => pct(b) - pct(a))
    .slice(0, 18);

  const enriched = await Promise.all(
    boards.map(async (board) => {
      const rows = await fetchJson(fastest.host, `b:${board.f12}`, STOCK_FIELDS, 60, 4500);
      return { board, rows, rawScore: boardRawScore(board, rows) };
    })
  );

  const scored = normalizeScores(enriched)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item, index) => {
      const metrics = boardMetrics(item.board, item.rows);
      const front20 = metrics.front20;
      const support10 = metrics.support10;
      const risk = boardRisk(item.board, front20, support10);
      const anchors = item.rows
        .filter((row) => isTradableStock(row) && isNearLimit(row))
        .slice(0, 3)
        .map((row) => `${row.f14}${number(row.f3, 0).toFixed(1)}%`);
      const board = {
        id: String(item.board.f12),
        code: String(item.board.f12),
        rank: index + 1,
        name: item.board.f14 || "--",
        theme: anchors.length ? `锚点 ${anchors.join(" / ")}` : `领涨 ${item.board.f128 || "待确认"}`,
        change: number(item.board.f3, 0),
        score: item.score,
        front20,
        support10,
        risk,
        window: market.buyWindow || "复盘",
        action: boardDecision(item.score, risk, metrics, market),
        confidence: Math.max(45, Math.min(94, Math.round(item.score - (risk === "高" ? 12 : risk === "中" ? 5 : 0)))),
        reasons: boardReasons(item.board, metrics),
        warnings: boardWarnings(item.board, metrics),
        metrics: {
          up: metrics.up,
          down: metrics.down,
          breadth: Math.round(metrics.breadth * 100),
          active: metrics.active,
          sealed20: metrics.sealed20,
          sealed10: metrics.sealed10
        }
      };
      const stocks = item.rows
        .filter(isLateDayCandidate)
        .map((row) => mapStock(row, board, market))
        .sort((a, b) => b.score - a.score || b.change - a.change)
        .slice(0, 5);
      return { ...board, stocks };
    });
  const phase = phaseAdvice(market);

  return {
    updatedAt: now.toISOString(),
    source: fastest.host.replace("https://", ""),
    market,
    summary: {
      phase: market.label,
      action: phase.summary,
      topLine: scored[0] ? `${scored[0].name}：${scored[0].action}` : "暂无主线",
      note: "页面结果由尾盘买入法规则实时生成，不使用模拟数据"
    },
    boards: scored
  };
}

async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const result = await buildRecommendations();
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(result);
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({
      error: "实时行情生成失败",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

handler.marketStatus = marketStatus;
module.exports = handler;
