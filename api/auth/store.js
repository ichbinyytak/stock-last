const crypto = require("crypto");
const ADMIN_USERS = require("./users");

const USERS_KEY = "lateDay:managedUsers:v1";
const localManagedUsers = {};
const DEFAULT_MANAGED_USERS = {
  test: {
    key: "test",
    id: "u_test_demo",
    username: "test",
    role: "user",
    passwordHash: "d964ad049b52aa1762f1f9feef9faf7b7a4e8879008300f27266978eb4f28329",
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
    seeded: true
  }
};

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function hashPassword(username, password) {
  return crypto
    .createHash("sha256")
    .update(`late-day-buying:${normalizeUsername(username)}:${password}`)
    .digest("hex");
}

function publicUser(user) {
  return {
    key: user.key,
    id: user.id,
    username: user.username,
    role: user.role || "user"
  };
}

function publicManagedUser(user) {
  return {
    ...publicUser(user),
    createdAt: user.createdAt || "",
    updatedAt: user.updatedAt || "",
    seeded: Boolean(user.seeded)
  };
}

function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function allowLocalUserStore() {
  return !process.env.VERCEL;
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

async function readStoredManagedUsers() {
  if (!kvConfigured()) return allowLocalUserStore() ? { ...localManagedUsers } : {};
  const payload = await kvRequest(`/get/${encodeURIComponent(USERS_KEY)}`);
  if (!payload.result) return {};
  if (typeof payload.result === "string") return JSON.parse(payload.result);
  return payload.result;
}

async function writeStoredManagedUsers(users) {
  if (!kvConfigured()) {
    if (allowLocalUserStore()) {
      Object.keys(localManagedUsers).forEach((key) => delete localManagedUsers[key]);
      Object.assign(localManagedUsers, { ...users });
      return;
    }
    throw new Error("未配置服务器用户存储，请在 Vercel 配置 KV_REST_API_URL 和 KV_REST_API_TOKEN");
  }
  await kvRequest("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(["SET", USERS_KEY, JSON.stringify(users)])
  });
}

async function managedUsers() {
  return {
    ...DEFAULT_MANAGED_USERS,
    ...await readStoredManagedUsers()
  };
}

async function findUser(username) {
  const key = normalizeUsername(username);
  return ADMIN_USERS.find((item) => item.key === key) || (await managedUsers())[key] || null;
}

async function listManagedUsers() {
  return Object.values(await managedUsers())
    .sort((a, b) => String(a.key).localeCompare(String(b.key)))
    .map(publicManagedUser);
}

async function upsertManagedUser(username, password) {
  const key = normalizeUsername(username);
  if (!key || key.length < 2) throw new Error("账号至少 2 个字符");
  if (key === "admin") throw new Error("admin 是系统超级用户");
  if (!String(password || "").trim()) throw new Error("请输入密码");

  const storedUsers = await readStoredManagedUsers();
  const old = storedUsers[key] || DEFAULT_MANAGED_USERS[key] || {};
  const user = {
    key,
    id: old.id || `u_managed_${key}`,
    username: String(username).trim(),
    role: "user",
    passwordHash: hashPassword(key, password),
    createdAt: old.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seeded: false
  };
  storedUsers[key] = user;
  await writeStoredManagedUsers(storedUsers);
  return publicManagedUser(user);
}

module.exports = {
  findUser,
  hashPassword,
  listManagedUsers,
  normalizeUsername,
  publicUser,
  upsertManagedUser
};
