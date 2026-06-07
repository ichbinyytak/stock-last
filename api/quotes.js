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
const FIELDS = "f12,f14,f2,f3,f4,f6,f8,f15,f16,f17,f20";
const STOCK_UT = "fa5fd1943c7b386f172d6893dbfba10b";
const STOCK_FIELDS = "f43,f44,f45,f46,f47,f48,f57,f58,f116,f168,f169,f170";

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

function marketPrefix(code) {
  const value = String(code);
  return value.startsWith("6") ? "1" : "0";
}

async function fetchJson(host, codes, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const fs = codes.map((code) => `${marketPrefix(code)}.${code}`).join(",");
    const url = `${host}/api/qt/ulist.np/get?${params(fs, FIELDS, Math.max(codes.length, 1), "f3")}`;
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
    return (payload && payload.data && payload.data.diff) || [];
  } finally {
    clearTimeout(timer);
  }
}

function scaled(value, divisor = 100) {
  return typeof value === "number" && Number.isFinite(value) ? value / divisor : 0;
}

async function fetchStockJson(host, code, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const secid = `${marketPrefix(code)}.${code}`;
    const url = `${host}/api/qt/stock/get?${new URLSearchParams({
      secid,
      ut: STOCK_UT,
      fields: STOCK_FIELDS
    })}`;
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
    const row = payload && payload.data;
    if (!row || !row.f57) return null;
    return {
      code: String(row.f57 || code),
      name: row.f58 || "",
      price: scaled(row.f43),
      change: scaled(row.f170),
      high: scaled(row.f44),
      low: scaled(row.f45),
      open: scaled(row.f46),
      amount: typeof row.f48 === "number" ? row.f48 : 0,
      turnover: scaled(row.f168),
      cap: typeof row.f116 === "number" ? row.f116 : 0
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchStockQuotes(host, codes) {
  const settled = await Promise.allSettled(codes.map((code) => fetchStockJson(host, code)));
  return settled
    .filter((item) => item.status === "fulfilled" && item.value)
    .map((item) => item.value);
}

async function fetchQuotes(codes) {
  let lastError = null;
  for (const host of HOSTS) {
    try {
      const rows = await fetchJson(host, codes);
      if (rows.length) {
        return {
          source: host.replace("https://", ""),
          quotes: rows.map((row) => ({
            code: String(row.f12),
            name: row.f14 || "",
            price: typeof row.f2 === "number" ? row.f2 : 0,
            change: typeof row.f3 === "number" ? row.f3 : 0,
            high: typeof row.f15 === "number" ? row.f15 : 0,
            low: typeof row.f16 === "number" ? row.f16 : 0,
            open: typeof row.f17 === "number" ? row.f17 : 0,
            amount: typeof row.f6 === "number" ? row.f6 : 0,
            turnover: typeof row.f8 === "number" ? row.f8 : 0,
            cap: typeof row.f20 === "number" ? row.f20 : 0
          }))
        };
      }
    } catch (error) {
      lastError = error;
    }
  }
  for (const host of HOSTS) {
    try {
      const quotes = await fetchStockQuotes(host, codes);
      if (quotes.length) {
        return {
          source: `${host.replace("https://", "")}/stock`,
          quotes
        };
      }
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("quotes unavailable");
}

async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const url = new URL(req.url, "http://localhost");
    const codes = String(url.searchParams.get("codes") || "")
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean)
      .slice(0, 60);
    if (!codes.length) {
      res.status(200).json({ updatedAt: new Date().toISOString(), source: "", quotes: [] });
      return;
    }
    const result = await fetchQuotes(codes);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ updatedAt: new Date().toISOString(), ...result });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({
      error: "quotes failed",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

module.exports = handler;
handler.fetchQuotes = fetchQuotes;
