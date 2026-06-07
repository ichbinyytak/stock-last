const PROFILE_CACHE_KEY = "lateDay.userProfiles.v1";
const SESSION_KEY = "lateDay.session.v1";
const AUTH_TOKEN_KEY = "lateDay.authToken.v1";
const GUEST_ID = "guest";
const SCHEDULE_CHECK_MS = 60 * 1000;

let currentUser = null;
let authToken = "";
let positions = {};
let account = {
  initialCapital: 0,
  cash: 0,
  updatedAt: ""
};
let trades = [];
let editingCode = "";
let quoteTimer = null;

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
  if (pnlPct >= 2 || openPct >= 1.5 || quoteChange >= 3) {
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
  if (pnlPct >= -1 && openPct >= -1.2) {
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

function loadUserData() {
  positions = readJson(scopedKey("positions"), {});
  account = readJson(scopedKey("account"), {
    initialCapital: 0,
    cash: 0,
    updatedAt: ""
  });
  trades = readJson(scopedKey("trades"), []);
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
  localStorage.setItem(SESSION_KEY, user.key);
  if (authToken) localStorage.setItem(AUTH_TOKEN_KEY, authToken);
  loadUserData();
  renderAll();
  schedulePositionRefresh();
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

function logoutUser() {
  if (quoteTimer) {
    clearInterval(quoteTimer);
    quoteTimer = null;
  }
  currentUser = null;
  authToken = "";
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
  document.getElementById("accountTitle").textContent = logged ? `${currentUser.username} 的账户` : "账户数据";
  document.getElementById("accountUserLabel").textContent = logged ? currentUser.username : "请先登录";
  document.getElementById("accountLogoutBtn").disabled = !logged;
  document.getElementById("openPasswordBtn").disabled = true;
  document.getElementById("openPasswordBtn").title = "预置账号暂不支持自助改密";
  document.getElementById("accountLoginNote").classList.toggle("hidden", logged);
  document.querySelectorAll(".auth-only").forEach((node) => node.classList.toggle("hidden", !logged));
  document.getElementById("adminSection").classList.toggle("hidden", !isAdmin);
  document.querySelectorAll(".locked").forEach((node) => node.classList.toggle("disabled", !logged));

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
          <button class="danger-btn sell-position" type="button">卖出</button>
          <button class="secondary-btn sell-detail" type="button">详情</button>
          <button class="secondary-btn edit-position" type="button">${editingCode === item.code ? "收起" : "编辑"}</button>
          <button class="secondary-btn save-position" type="button">保存</button>
          <button class="danger-btn delete-position" type="button">删除</button>
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
  document.getElementById("tradeCount").textContent = `${trades.length} 条`;
  if (!currentUser) {
    list.innerHTML = `<div class="portfolio-empty">登录后查看历史买卖</div>`;
    return;
  }
  if (!trades.length) {
    list.innerHTML = `<div class="portfolio-empty">暂无历史记录</div>`;
    return;
  }
  list.innerHTML = trades.slice(0, 80).map((item) => `
    <div class="history-row">
      <span class="${item.type === "SELL" ? "down" : "up"}">${item.type === "SELL" ? "卖出" : "买入"}</span>
      <strong>${item.name}</strong>
      <b>${item.code}</b>
      <em>${Number(item.quantity || 0)}股 @ ${formatCurrency(item.price)}</em>
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
      <small>${item.seeded ? "默认" : "服务器"}</small>
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
      old.lastPrice = quote.price;
      old.name = old.name || quote.name;
      old.quoteChange = quote.change;
      old.openPrice = quote.open || old.openPrice || 0;
      old.highPrice = quote.high || old.highPrice || 0;
      old.lowPrice = quote.low || old.lowPrice || 0;
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
    clearInterval(quoteTimer);
    quoteTimer = null;
  }
  if (!currentUser || !positionRows().length) return;
  if (!marketRefreshWindow()) {
    quoteTimer = setTimeout(schedulePositionRefresh, SCHEDULE_CHECK_MS);
    return;
  }
  refreshPositionQuotes();
  quoteTimer = setInterval(() => {
    if (!marketRefreshWindow()) {
      clearInterval(quoteTimer);
      quoteTimer = null;
      schedulePositionRefresh();
      return;
    }
    refreshPositionQuotes();
  }, 3000);
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
document.getElementById("openLoginBtn").addEventListener("click", () => openModal("loginModal"));
document.getElementById("openMoneyBtn").addEventListener("click", () => openModal("moneyModal"));
document.getElementById("openTradeBtn").addEventListener("click", () => openModal("tradeModal"));
document.getElementById("openPasswordBtn").addEventListener("click", () => openModal("passwordModal"));
document.getElementById("openAdminUserBtn").addEventListener("click", () => openModal("adminUserModal"));

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
  if (currentUser) loadUserData();
  renderAll();
  schedulePositionRefresh();
  if (currentUser && currentUser.role === "admin") loadAdminUsers();
  if (!currentUser && new URLSearchParams(location.search).has("login")) {
    openModal("loginModal");
    document.getElementById("accountUsername").focus();
  }
}

init();
