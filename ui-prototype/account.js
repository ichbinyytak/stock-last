const USERS_KEY = "lateDay.users.v1";
const SESSION_KEY = "lateDay.session.v1";
const GUEST_ID = "guest";

let currentUser = null;
let positions = {};
let account = {
  initialCapital: 0,
  cash: 0,
  updatedAt: ""
};
let trades = [];

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

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function userScope() {
  return currentUser ? currentUser.id : GUEST_ID;
}

function scopedKey(name) {
  return `lateDay.${userScope()}.${name}.v1`;
}

function loadUsers() {
  return readJson(USERS_KEY, {});
}

function saveUsers(users) {
  writeJson(USERS_KEY, users);
}

async function hashPassword(username, password) {
  const payload = `late-day-buying:${normalizeUsername(username)}:${password}`;
  if (window.crypto && window.crypto.subtle) {
    const bytes = new TextEncoder().encode(payload);
    const hash = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return btoa(unescape(encodeURIComponent(payload)));
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "--";
  return amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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

function setMessage(message, type = "") {
  const node = document.getElementById("accountMessage");
  node.textContent = message || "";
  node.className = `auth-message ${type}`;
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

function startUserSession(user) {
  currentUser = user;
  localStorage.setItem(SESSION_KEY, user.key);
  loadUserData();
  renderAll();
}

async function registerUser(username, password) {
  const key = normalizeUsername(username);
  if (!key || key.length < 2) throw new Error("账号至少 2 个字符");
  if (String(password || "").length < 4) throw new Error("密码至少 4 位");
  const users = loadUsers();
  if (users[key]) throw new Error("账号已存在，请直接登录");
  const user = {
    key,
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    username: String(username).trim(),
    passwordHash: await hashPassword(key, password),
    createdAt: new Date().toISOString()
  };
  users[key] = user;
  saveUsers(users);
  startUserSession(user);
  setMessage("注册成功，已登录", "ok");
}

async function loginUser(username, password) {
  const key = normalizeUsername(username);
  const users = loadUsers();
  const user = users[key];
  if (!user) throw new Error("账号不存在");
  const hash = await hashPassword(key, password);
  if (hash !== user.passwordHash) throw new Error("密码不正确");
  startUserSession(user);
  setMessage("登录成功", "ok");
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem(SESSION_KEY);
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
  document.getElementById("authState").textContent = logged ? "已登录" : "未登录";
  document.getElementById("accountTitle").textContent = logged ? `${currentUser.username} 的账户` : "账户数据";
  document.getElementById("accountUserLabel").textContent = logged ? currentUser.username : "请先登录";
  document.getElementById("accountLogoutBtn").disabled = !logged;
  document.querySelectorAll(".locked").forEach((node) => node.classList.toggle("disabled", !logged));

  document.getElementById("initialCapital").value = logged ? Number(account.initialCapital || 0).toFixed(2) : "";
  document.getElementById("cashAmount").value = logged ? Number(account.cash || 0).toFixed(2) : "";

  renderSummary();
  renderPositions();
  renderSellAdvice();
  renderHistory();
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
    <div class="edit-row" data-code="${item.code}">
      <div class="edit-title">
        <strong>${item.name}</strong>
        <span>${item.code}</span>
      </div>
      <label><span>数量</span><input data-field="quantity" type="number" min="0" step="100" value="${Number(item.quantity || 0)}"></label>
      <label><span>均价</span><input data-field="avgPrice" type="number" min="0" step="0.01" value="${Number(item.avgPrice || 0).toFixed(2)}"></label>
      <label><span>现价</span><input data-field="lastPrice" type="number" min="0" step="0.01" value="${Number(item.lastPrice || item.avgPrice || 0).toFixed(2)}"></label>
      <div class="edit-actions">
        <button class="secondary-btn save-position" type="button">保存</button>
        <button class="danger-btn delete-position" type="button">删除</button>
      </div>
    </div>
  `).join("");
}

function renderSellAdvice() {
  const list = document.getElementById("sellAdviceList");
  if (!currentUser) {
    list.innerHTML = `<div class="portfolio-empty">登录后生成卖盘建议</div>`;
    return;
  }
  const rows = positionRows();
  if (!rows.length) {
    list.innerHTML = `<div class="portfolio-empty">暂无持仓，暂不生成卖盘建议</div>`;
    return;
  }
  list.innerHTML = rows.map((item) => {
    const qty = Number(item.quantity || 0);
    const avg = Number(item.avgPrice || 0);
    const last = Number(item.lastPrice || avg);
    const pnl = qty * (last - avg);
    const advice = pnl > 0 ? "已有浮盈，次日优先看竞价和第一波冲高，适合分批处理。" : "未形成浮盈，若板块弱或低开，优先控制回撤。";
    return `
      <div class="advice-row">
        <strong>${item.name}</strong>
        <span>${advice}</span>
      </div>
    `;
  }).join("");
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
      updatedAt: new Date().toISOString()
    };
  }
  savePositions();
  renderAll();
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

document.getElementById("accountRegisterBtn").addEventListener("click", async () => {
  try {
    await registerUser(
      document.getElementById("accountUsername").value,
      document.getElementById("accountPassword").value
    );
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), "error");
  }
});

document.getElementById("accountLogoutBtn").addEventListener("click", logoutUser);

document.getElementById("moneyForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) return setMessage("请先登录", "error");
  account.initialCapital = Number(document.getElementById("initialCapital").value || 0);
  account.cash = Number(document.getElementById("cashAmount").value || 0);
  saveAccount();
  renderAll();
  setMessage("账户资金已保存", "ok");
});

document.getElementById("positionsList").addEventListener("click", (event) => {
  const row = event.target.closest(".edit-row");
  if (!row) return;
  try {
    if (event.target.closest(".save-position")) {
      saveEditedPosition(row);
      setMessage("持仓已更新", "ok");
    }
    if (event.target.closest(".delete-position")) {
      delete positions[row.dataset.code];
      savePositions();
      renderAll();
      setMessage("持仓已删除", "ok");
    }
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
  const users = loadUsers();
  currentUser = sessionKey && users[sessionKey] ? users[sessionKey] : null;
  if (currentUser) loadUserData();
  renderAll();
  if (!currentUser && new URLSearchParams(location.search).has("login")) {
    document.getElementById("accountUsername").focus();
  }
}

init();
