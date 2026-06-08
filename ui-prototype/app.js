const externalSites = ["东方财富", "同花顺", "雪球"];
const PROFILE_CACHE_KEY = "lateDay.userProfiles.v1";
const SESSION_KEY = "lateDay.session.v1";
const AUTH_TOKEN_KEY = "lateDay.authToken.v1";
const GUEST_ID = "guest";
const SCHEDULE_CHECK_MS = 60 * 1000;
const SELECTION_STRATEGY_VERSION = 3;
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
  requirePreviousDayPattern: true,
  avoidPreviousLimitMove: true,
  maxPreviousBullBodyPct: 5,
  preferElastic20cm: true,
  strictLateWindow: false
};

let boards = [];
let selected = {
  boardId: "",
  stockCode: ""
};
let expanded = {
  boardId: "",
  stockCode: ""
};
let strategySummary = null;
let isLoading = false;
let currentUser = null;
let authToken = "";
let selectionStrategy = { ...DEFAULT_SELECTION_STRATEGY };
let favorites = new Set();
let positions = {};
let buyTarget = null;
let refreshTimer = null;

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

function loadUserState() {
  const state = readJson(scopedKey("state"), {});
  selected = state.selected || { boardId: "", stockCode: "" };
  expanded = state.expanded || { boardId: "", stockCode: "" };
  favorites = new Set(readJson(scopedKey("favorites"), []));
  positions = readJson(scopedKey("positions"), {});
}

function saveUserState() {
  writeJson(scopedKey("state"), {
    selected,
    expanded,
    updatedAt: new Date().toISOString()
  });
}

function saveFavorites() {
  writeJson(scopedKey("favorites"), Array.from(favorites));
}

function savePositions() {
  writeJson(scopedKey("positions"), positions);
}

function loadAccount() {
  return readJson(scopedKey("account"), {
    initialCapital: 0,
    cash: 0,
    updatedAt: ""
  });
}

function saveAccount(account) {
  writeJson(scopedKey("account"), {
    initialCapital: Number(account.initialCapital || 0),
    cash: Number(account.cash || 0),
    updatedAt: new Date().toISOString()
  });
}

function appendTrade(trade) {
  const trades = readJson(scopedKey("trades"), []);
  trades.unshift({
    id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...trade
  });
  writeJson(scopedKey("trades"), trades.slice(0, 300));
}

function loadLocalSelectionStrategy() {
  const stored = readJson(scopedKey("selectionStrategy"), {});
  const storedVersion = Number(readJson(scopedKey("selectionStrategyVersion"), 0)) || 0;
  if (!storedVersion && stored.requireBullTrend === true) {
    stored.requireBullTrend = DEFAULT_SELECTION_STRATEGY.requireBullTrend;
    writeJson(scopedKey("selectionStrategy"), stored);
    writeJson(scopedKey("selectionStrategyVersion"), SELECTION_STRATEGY_VERSION);
  }
  selectionStrategy = {
    ...DEFAULT_SELECTION_STRATEGY,
    ...stored
  };
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "--";
  return amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function findStock(code) {
  for (const board of boards) {
    const stock = (board.stocks || []).find((item) => String(item.code) === String(code));
    if (stock) return stock;
  }
  return null;
}

function isFavorite(code) {
  return favorites.has(String(code));
}

function toggleFavorite(code) {
  const value = String(code);
  if (favorites.has(value)) favorites.delete(value);
  else favorites.add(value);
  saveFavorites();
  renderBoards();
}

function showAuthModal() {
  window.location.href = "./account.html?login=1";
}

function updateAuthUi() {
  const label = document.getElementById("authLabel");
  const accountLink = document.getElementById("accountLink");
  const logoutBtn = document.getElementById("logoutBtn");
  if (label) label.textContent = currentUser ? currentUser.username.slice(0, 6) : "登录";
  if (accountLink) accountLink.textContent = currentUser ? currentUser.username.slice(0, 6) : "账户";
  if (logoutBtn) logoutBtn.classList.toggle("hidden", !currentUser);
  renderPortfolio();
}

function renderPortfolio() {
  const panel = document.getElementById("portfolioPanel");
  const list = document.getElementById("portfolioList");
  const totalNode = document.getElementById("portfolioTotal");
  if (!panel || !list || !totalNode) return;
  panel.classList.toggle("hidden", !currentUser);
  if (!currentUser) {
    list.innerHTML = "";
    totalNode.textContent = "总金额 --";
    return;
  }
  const rows = Object.values(positions || {}).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  const total = rows.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
  totalNode.textContent = `总金额 ${formatCurrency(total)}`;
  if (!rows.length) {
    list.innerHTML = `<div class="portfolio-empty">暂无买入记录</div>`;
    return;
  }
  list.innerHTML = rows.map((item) => `
    <div class="portfolio-row">
      <div>
        <strong>${item.name}</strong>
        <span>${item.code}</span>
      </div>
      <div>
        <b>${Number(item.quantity || 0)}</b>
        <span>股</span>
      </div>
      <div>
        <b>${formatCurrency(item.totalCost)}</b>
        <span>金额</span>
      </div>
      <div>
        <b>${formatCurrency(item.avgPrice)}</b>
        <span>均价</span>
      </div>
    </div>
  `).join("");
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

function startUserSession(user, token = authToken) {
  currentUser = user;
  authToken = token || "";
  localStorage.setItem(SESSION_KEY, user.key);
  if (authToken) localStorage.setItem(AUTH_TOKEN_KEY, authToken);
  loadUserState();
  loadLocalSelectionStrategy();
  ensureSelection();
  updateAuthUi();
  renderBoards();
  loadPaperSelectionStrategy().finally(() => loadRecommendations({ force: true }));
}

function showLoginRequired() {
  window.location.href = "./account.html?login=1";
}

function openBuyModal(code) {
  if (!currentUser) {
    showLoginRequired();
    return;
  }
  const stock = findStock(code);
  if (!stock) return;
  buyTarget = stock;
  document.getElementById("buyStockName").textContent = `${stock.code} ${stock.name}  现价 ${Number(stock.price || 0).toFixed(2)}`;
  document.getElementById("buyQuantity").value = "100";
  document.getElementById("buyPrice").value = Number(stock.price || 0).toFixed(2);
  document.getElementById("buyMessage").textContent = "";
  document.getElementById("buyMessage").className = "auth-message";
  document.getElementById("buyModal").classList.remove("hidden");
  document.getElementById("buyQuantity").focus();
}

function closeBuyModal() {
  buyTarget = null;
  document.getElementById("buyModal").classList.add("hidden");
}

function recordBuy(quantity, price) {
  if (!currentUser || !buyTarget) return;
  const qty = Number(quantity);
  const buyPrice = Number(price);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("请输入有效买入数量");
  if (!Number.isInteger(qty) || qty % 100 !== 0) throw new Error("A股买入数量需为100股的整数倍");
  if (!Number.isFinite(buyPrice) || buyPrice <= 0) throw new Error("请输入有效买入价格");
  const code = String(buyTarget.code);
  const old = positions[code] || {
    code,
    name: buyTarget.name,
    quantity: 0,
    totalCost: 0,
    avgPrice: 0,
    lastPrice: 0,
    updatedAt: ""
  };
  const totalQuantity = Number(old.quantity || 0) + qty;
  const totalCost = Number(old.totalCost || 0) + qty * buyPrice;
  positions[code] = {
    ...old,
    name: buyTarget.name,
    quantity: totalQuantity,
    totalCost,
    avgPrice: totalCost / totalQuantity,
    lastPrice: buyPrice,
    firstBuyAt: old.firstBuyAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const account = loadAccount();
  const amount = qty * buyPrice;
  account.cash = Number(account.cash || 0) - amount;
  savePositions();
  saveAccount(account);
  appendTrade({
    type: "BUY",
    code,
    name: buyTarget.name,
    quantity: qty,
    price: buyPrice,
    amount,
    note: "主看板记录买入"
  });
  renderPortfolio();
  updateAuthUi();
}

async function loginUser(username, password) {
  let response;
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
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("登录接口返回异常，请确认不是直接打开 HTML 文件");
  }
  const user = response.ok ? payload.user : null;
  if (!user) throw new Error(payload.error || "账号或密码不正确");
  if (!user) throw new Error("登录接口未返回用户信息");
  cacheUserProfile(user);
  startUserSession(user, payload.token || "");
}

function logoutUser() {
  currentUser = null;
  authToken = "";
  selectionStrategy = { ...DEFAULT_SELECTION_STRATEGY };
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  loadUserState();
  ensureSelection();
  updateAuthUi();
  renderBoards();
  loadRecommendations({ force: true });
}

function initAuth() {
  const sessionKey = localStorage.getItem(SESSION_KEY);
  authToken = localStorage.getItem(AUTH_TOKEN_KEY) || "";
  const users = loadProfileCache();
  currentUser = sessionKey && users[sessionKey] ? users[sessionKey] : null;
  loadUserState();
  updateAuthUi();
}

async function loadPaperSelectionStrategy() {
  if (!currentUser) {
    selectionStrategy = { ...DEFAULT_SELECTION_STRATEGY };
    return;
  }
  loadLocalSelectionStrategy();
  if (currentUser.key !== "test" || !authToken) {
    return;
  }
  try {
    const response = await fetch("/api/paper-trading", {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "选股策略读取失败");
    const serverStrategy = payload.account && payload.account.selectionStrategy ? payload.account.selectionStrategy : {};
    if (!Number(payload.account && payload.account.selectionStrategyVersion) && serverStrategy.requireBullTrend === true) {
      serverStrategy.requireBullTrend = DEFAULT_SELECTION_STRATEGY.requireBullTrend;
    }
    selectionStrategy = {
      ...selectionStrategy,
      ...serverStrategy
    };
  } catch {
    loadLocalSelectionStrategy();
  }
}

function riskClass(risk) {
  if (risk === "低") return "risk-low";
  if (risk === "高") return "risk-high";
  return "risk-mid";
}

function formatTime(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function updateClock(value) {
  document.getElementById("updatedAt").textContent = formatTime(value);
}

function updateMarketStatus(market) {
  const node = document.getElementById("marketStatus");
  const dataMode = document.getElementById("dataMode");
  const buyWindow = document.getElementById("buyWindow");
  if (market) {
    const modeText = {
      realtime: "实时",
      "late-day": "实时",
      "auction-open": "竞价",
      "auction-locked": "竞价",
      "pre-open": "开盘前",
      "close-auction": "尾盘竞价",
      "lunch-break": "上午最后",
      "previous-session": "前市最后"
    };
    node.textContent = market.label || (market.isTrading ? "交易中" : "前市");
    node.className = `status-pill ${market.mode === "late-day" ? "late" : market.isTrading ? "live" : market.isAuction ? "auction" : "closed"}`;
    node.title = market.note || "";
    if (dataMode) dataMode.textContent = modeText[market.mode] || (market.isTrading ? "实时" : "前市最后");
    if (buyWindow) buyWindow.textContent = market.buyWindow || (market.mode === "late-day" ? "可确认" : market.isTrading ? "跟踪" : "复盘");
    return;
  }

  const { day, minutes } = shanghaiClock();
  const auctionOpen = minutes >= 9 * 60 + 15 && minutes < 9 * 60 + 20;
  const auctionLocked = minutes >= 9 * 60 + 20 && minutes < 9 * 60 + 25;
  const preOpen = minutes >= 9 * 60 + 25 && minutes < 9 * 60 + 30;
  const morning = minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30;
  const lunchBreak = minutes > 11 * 60 + 30 && minutes < 13 * 60;
  const afternoon = minutes >= 13 * 60 && minutes < 14 * 60 + 30;
  const lateDay = minutes >= 14 * 60 + 30 && minutes < 14 * 60 + 57;
  const closeAuction = minutes >= 14 * 60 + 57 && minutes <= 15 * 60;
  const isWeekday = day >= 1 && day <= 5;
  if (isWeekday && auctionOpen) {
    node.textContent = "竞价可撤";
    node.className = "status-pill auction";
    node.title = "9:15-9:20 集合竞价，可撤单";
    if (dataMode) dataMode.textContent = "竞价";
    return;
  }
  if (isWeekday && auctionLocked) {
    node.textContent = "竞价不可撤";
    node.className = "status-pill auction";
    node.title = "9:20-9:25 集合竞价，不可撤单";
    if (dataMode) dataMode.textContent = "竞价";
    return;
  }
  if (isWeekday && preOpen) {
    node.textContent = "开盘前";
    node.className = "status-pill auction";
    node.title = "9:25-9:30 集合竞价结果已出，等待开盘";
    if (dataMode) dataMode.textContent = "开盘前";
    return;
  }
  if (isWeekday && lunchBreak) {
    node.textContent = "午间休市";
    node.className = "status-pill closed";
    node.title = "午间休市，显示上午最后行情";
    if (dataMode) dataMode.textContent = "上午最后";
    return;
  }
  if (isWeekday && closeAuction) {
    node.textContent = "尾盘竞价";
    node.className = "status-pill auction";
    node.title = "14:57-15:00 尾盘集合竞价";
    if (dataMode) dataMode.textContent = "尾盘竞价";
    if (buyWindow) buyWindow.textContent = "复盘";
    return;
  }
  if (isWeekday && lateDay) {
    node.textContent = "尾盘窗口";
    node.className = "status-pill late";
    node.title = "14:30-14:57 尾盘确认承接";
    if (dataMode) dataMode.textContent = "实时";
    if (buyWindow) buyWindow.textContent = "可确认";
    return;
  }
  const isTrading = day >= 1 && day <= 5 && (morning || afternoon || lateDay);
  node.textContent = isTrading ? "交易中" : "前市";
  node.className = `status-pill ${isTrading ? "live" : "closed"}`;
  node.title = isTrading ? "实时行情生成" : "休市，显示前一交易时段最后行情";
  if (dataMode) dataMode.textContent = isTrading ? "实时" : "前市最后";
  if (buyWindow) buyWindow.textContent = isTrading ? "跟踪" : "复盘";
}

function isMarketRefreshWindow(date = new Date()) {
  const { day, minutes } = shanghaiClock(date);
  const isWeekday = day >= 1 && day <= 5;
  const auction = minutes >= 9 * 60 + 15 && minutes < 9 * 60 + 30;
  const morning = minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30;
  const afternoon = minutes >= 13 * 60 && minutes <= 15 * 60;
  return isWeekday && (auction || morning || afternoon);
}

function scheduleBoardRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (!isMarketRefreshWindow()) {
    refreshTimer = setTimeout(scheduleBoardRefresh, SCHEDULE_CHECK_MS);
    return;
  }
  refreshTimer = setInterval(() => {
    if (!isMarketRefreshWindow()) {
      clearInterval(refreshTimer);
      refreshTimer = null;
      updateMarketStatus();
      scheduleBoardRefresh();
      return;
    }
    loadRecommendations();
  }, 3000);
}

function chooseFastSite() {
  const site = externalSites[Math.floor(Math.random() * externalSites.length)];
  document.getElementById("fastSite").textContent = site;
}

function marketCode(code) {
  if (code.startsWith("6")) return "sh";
  if (code.startsWith("8") || code.startsWith("4") || code.startsWith("9")) return "bj";
  return "sz";
}

function externalUrl(code) {
  const site = document.getElementById("fastSite").textContent || "东方财富";
  const market = marketCode(code);
  if (site === "雪球") return `https://xueqiu.com/S/${market.toUpperCase()}${code}`;
  if (site === "同花顺") return `https://stockpage.10jqka.com.cn/${code}/`;
  return `https://quote.eastmoney.com/${market}${code}.html`;
}

function setSource(source) {
  const node = document.getElementById("quoteSource");
  if (node) node.textContent = source || "实时接口";
}

function setLoading(message = "正在实时生成候选...") {
  renderSummary(null);
  document.getElementById("boards").innerHTML = `
    <div class="system-panel loading">
      <strong>${message}</strong>
      <span>正在拉取板块和成分股行情，按尾盘买入法规则排序。</span>
    </div>
  `;
}

function setError(message, detail = "") {
  renderSummary(null);
  document.getElementById("boards").innerHTML = `
    <div class="system-panel error">
      <strong>${message}</strong>
      <span>${detail || "请稍后点击刷新重试。"}</span>
    </div>
  `;
}

function renderSummary(summary) {
  const node = document.getElementById("strategySummary");
  if (!node) return;
  if (!summary) {
    node.innerHTML = "";
    return;
  }
  node.innerHTML = `
    <div>
      <strong>${summary.phase}</strong>
      <span>${summary.action}</span>
    </div>
    <p>${summary.topLine}</p>
  `;
}

function ensureSelection() {
  const firstBoard = boards[0];
  const firstStock = firstBoard && firstBoard.stocks && firstBoard.stocks[0];
  if (!firstBoard || !firstStock) {
    selected = { boardId: "", stockCode: "" };
    expanded = { boardId: "", stockCode: "" };
    return;
  }

  const boardExists = boards.some((board) => board.id === selected.boardId);
  const stockExists = boardExists && boards
    .find((board) => board.id === selected.boardId)
    .stocks.some((stock) => stock.code === selected.stockCode);

  if (!stockExists) {
    selected = {
      boardId: firstBoard.id,
      stockCode: firstStock.code
    };
  }
}

function renderBoards() {
  const container = document.getElementById("boards");
  if (!boards.length) {
    setError("暂无实时推荐", "接口没有返回可展示的板块。");
    return;
  }

  container.innerHTML = boards.map((board) => `
    <article class="sector ${selected.boardId === board.id ? "active" : ""}" data-board="${board.id}">
      <div class="sector-head">
        <div class="sector-top">
          <div class="sector-title">
            <span class="rank">${board.rank}</span>
            <h3>${board.name}</h3>
          </div>
          <strong class="sector-change up">+${Number(board.change || 0).toFixed(2)}%</strong>
          <span class="sector-risk ${riskClass(board.risk)}">风险${board.risk}</span>
        </div>
        <div class="sector-sub">
          <span class="sector-theme">${board.theme}</span>
          <span><b>强</b>${board.score}</span>
          <span><b>20</b>${board.front20}</span>
          <span><b>10</b>${board.support10}</span>
          <span><b>窗</b>${board.window}</span>
          <span><b>判</b>${board.action}</span>
        </div>
      </div>
      <div class="stock-table">
        <div class="stock-head">
          <span>代码/名称</span><span>涨幅</span><span>换手</span><span>成交额</span><span>量比</span><span>市值</span><span>尾盘</span><span>评分</span><span>风险</span><span>触发条件</span><span>详情</span><span>自选</span><span>买入</span>
        </div>
        ${board.stocks.map((stock) => renderStock(board, stock)).join("")}
      </div>
    </article>
  `).join("");
}

function renderStock(board, stock) {
  const isSelected = selected.boardId === board.id && selected.stockCode === stock.code;
  const isExpanded = expanded.boardId === board.id && expanded.stockCode === stock.code;
  const url = externalUrl(stock.code);
  const site = document.getElementById("fastSite").textContent || "东方财富";
  const keyReason = `${stock.trigger}｜${stock.state}，风险${stock.risk}，评分${stock.score}`;
  const favorite = isFavorite(stock.code);

  return `
    <div class="stock-row ${isSelected ? "selected" : ""}" data-board="${board.id}" data-stock="${stock.code}">
      <div class="stock-top">
        <span class="stock-code">${stock.code}</span>
        <a class="stock-name stock-link" href="${url}" target="_blank" rel="noopener noreferrer" data-board="${board.id}" data-stock="${stock.code}" title="打开最快外部站点">${stock.name}</a>
        <span class="num up">+${Number(stock.change || 0).toFixed(2)}%</span>
        <span class="score">${stock.score}</span>
      </div>
      <div class="stock-stats">
        <span><b>换</b>${Number(stock.turnover || 0).toFixed(1)}%</span>
        <span><b>额</b>${stock.amount}</span>
        <span><b>量</b>${Number(stock.volumeRatio || 0).toFixed(1)}</span>
        <span><b>值</b>${stock.cap}</span>
      </div>
      <div class="stock-meta">
        <span class="action-tag">${stock.action}</span>
        <span class="state-tag">${stock.state}</span>
        <span class="trend-tag ${stock.trend && stock.trend.bullish ? "trend-bull" : ""}">日${stock.trend ? stock.trend.label : "待确认"}</span>
        <span class="tag">${stock.risk}</span>
        <span class="reason">${keyReason}</span>
      </div>
      <button class="mini-btn detail-toggle" type="button" data-board="${board.id}" data-stock="${stock.code}" aria-expanded="${isExpanded}">${isExpanded ? "收起" : "详情"}</button>
      <button class="favorite-btn ${favorite ? "active" : ""}" type="button" data-favorite="${stock.code}" aria-label="${favorite ? "取消自选" : "加入自选"}">${favorite ? "★" : "☆"}</button>
      <button class="buy-btn" type="button" data-buy="${stock.code}" aria-label="记录买入${stock.name}">买</button>
    </div>
    <div class="details ${isExpanded ? "open" : ""}" data-detail="${stock.code}">
      <div class="detail-card">
        <h4>候选逻辑</h4>
        <p>${stock.reason}</p>
        <ul>${(stock.reasons || []).map((item) => `<li>${item}</li>`).join("")}</ul>
        <a class="detail-link" href="${url}" target="_blank" rel="noopener noreferrer">打开${site}</a>
      </div>
      <div class="detail-card">
        <h4>过滤点</h4>
        <ul>${(stock.risks || []).map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
      <div class="detail-card">
        <h4>次日纪律</h4>
        <ul>${(stock.plan || []).map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
    </div>
  `;
}

function selectStock(boardId, stockCode) {
  selected = { boardId, stockCode };
  saveUserState();
  renderBoards();
}

function recommendationsUrl() {
  const params = new URLSearchParams({ t: String(Date.now()) });
  Object.entries(selectionStrategy || {}).forEach(([key, value]) => {
    params.set(`s_${key}`, String(value));
  });
  return `/api/recommendations?${params}`;
}

async function loadRecommendations(options = {}) {
  if (isLoading && !options.force) return;
  isLoading = true;
  updateMarketStatus();
  if (!boards.length || options.force) setLoading();
  try {
    const response = await fetch(recommendationsUrl(), {
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || payload.error || `HTTP ${response.status}`);
    }
    boards = Array.isArray(payload.boards) ? payload.boards : [];
    strategySummary = payload.summary || null;
    ensureSelection();
    updateClock(payload.updatedAt);
    updateMarketStatus(payload.market);
    setSource(payload.source);
    renderSummary(strategySummary);
    renderBoards();
  } catch (error) {
    boards = [];
    strategySummary = null;
    setSource("接口失败");
    updateClock();
    setError("实时行情生成失败", error instanceof Error ? error.message : String(error));
  } finally {
    isLoading = false;
  }
}

document.addEventListener("click", (event) => {
  const buyBtn = event.target.closest(".buy-btn");
  if (buyBtn) {
    event.preventDefault();
    event.stopPropagation();
    openBuyModal(buyBtn.dataset.buy);
    return;
  }

  const favoriteBtn = event.target.closest(".favorite-btn");
  if (favoriteBtn) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(favoriteBtn.dataset.favorite);
    return;
  }

  const link = event.target.closest(".stock-link");
  if (link) {
    selected = { boardId: link.dataset.board, stockCode: link.dataset.stock };
    saveUserState();
    return;
  }

  const toggle = event.target.closest(".detail-toggle");
  if (toggle) {
    const isOpen = expanded.boardId === toggle.dataset.board && expanded.stockCode === toggle.dataset.stock;
    expanded = isOpen ? { boardId: "", stockCode: "" } : { boardId: toggle.dataset.board, stockCode: toggle.dataset.stock };
    selectStock(toggle.dataset.board, toggle.dataset.stock);
    return;
  }

  const row = event.target.closest(".stock-row");
  if (!row) return;
  selected = { boardId: row.dataset.board, stockCode: row.dataset.stock };
  saveUserState();
  renderBoards();
});

document.getElementById("refreshBtn").addEventListener("click", () => {
  chooseFastSite();
  updateMarketStatus();
  loadRecommendations({ force: true });
});

const authBtn = document.getElementById("authBtn");
if (authBtn) authBtn.addEventListener("click", showAuthModal);

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);
document.getElementById("buyClose").addEventListener("click", closeBuyModal);
document.getElementById("buyCancel").addEventListener("click", closeBuyModal);
document.getElementById("buyModal").addEventListener("click", (event) => {
  if (event.target.id === "buyModal") closeBuyModal();
});

document.getElementById("buyForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const message = document.getElementById("buyMessage");
  try {
    recordBuy(
      document.getElementById("buyQuantity").value,
      document.getElementById("buyPrice").value
    );
    message.textContent = "买入记录已保存到当前账号";
    message.className = "auth-message ok";
    setTimeout(closeBuyModal, 450);
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : String(error);
    message.className = "auth-message error";
  }
});

async function init() {
  initAuth();
  chooseFastSite();
  updateMarketStatus();
  await loadPaperSelectionStrategy();
  await loadRecommendations();
  scheduleBoardRefresh();
}

init();
