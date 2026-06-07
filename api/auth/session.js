const crypto = require("crypto");

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret() {
  return process.env.AUTH_SECRET || "late-day-buying-method-dev-secret";
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function createToken(user) {
  const payload = base64url(JSON.stringify({
    key: user.key,
    id: user.id,
    username: user.username,
    role: user.role || "user",
    exp: Date.now() + TOKEN_TTL_MS
  }));
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function bearerUser(req) {
  const auth = req.headers.authorization || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? verifyToken(match[1]) : null;
}

module.exports = {
  bearerUser,
  createToken,
  verifyToken
};
