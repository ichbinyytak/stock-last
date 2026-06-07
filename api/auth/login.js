const { createToken } = require("./session");
const { findUser, hashPassword, normalizeUsername, publicUser } = require("./store");

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 16 * 1024) reject(new Error("Request body too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = JSON.parse(await readBody(req) || "{}");
    const key = normalizeUsername(body.username);
    const password = String(body.password || "");
    const user = await findUser(key);
    if (!user || hashPassword(key, password) !== user.passwordHash) {
      res.status(401).json({ error: "账号或密码不正确" });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(400).json({
      error: error instanceof SyntaxError ? "请求格式不正确" : "登录失败",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

module.exports = handler;
