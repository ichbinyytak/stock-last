const externalSites = ["东方财富", "同花顺", "雪球"];

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

  const now = new Date();
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
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
          <span>代码/名称</span><span>涨幅</span><span>换手</span><span>成交额</span><span>量比</span><span>市值</span><span>尾盘</span><span>评分</span><span>风险</span><span>触发条件</span><span>详情</span>
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
        <span class="tag">${stock.risk}</span>
        <span class="reason">${keyReason}</span>
      </div>
      <button class="mini-btn detail-toggle" type="button" data-board="${board.id}" data-stock="${stock.code}" aria-expanded="${isExpanded}">${isExpanded ? "收起" : "详情"}</button>
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
  renderBoards();
}

async function loadRecommendations(options = {}) {
  if (isLoading && !options.force) return;
  isLoading = true;
  updateMarketStatus();
  if (!boards.length || options.force) setLoading();
  try {
    const response = await fetch(`/api/recommendations?t=${Date.now()}`, {
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
  const link = event.target.closest(".stock-link");
  if (link) {
    selected = { boardId: link.dataset.board, stockCode: link.dataset.stock };
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
  renderBoards();
});

document.getElementById("refreshBtn").addEventListener("click", () => {
  chooseFastSite();
  updateMarketStatus();
  loadRecommendations({ force: true });
});

chooseFastSite();
updateMarketStatus();
loadRecommendations();
setInterval(() => {
  loadRecommendations();
}, 3000);
