const { bearerUser } = require("./session");
const { listManagedUsers, upsertManagedUser } = require("./store");

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

function requireAdmin(req, res) {
  const user = bearerUser(req);
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "需要超级用户权限" });
    return null;
  }
  return user;
}

async function handler(req, res) {
  try {
    if (!requireAdmin(req, res)) return;
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "GET") {
      res.status(200).json({ users: await listManagedUsers() });
      return;
    }

    if (req.method === "POST") {
      const body = JSON.parse(await readBody(req) || "{}");
      const user = await upsertManagedUser(body.username, body.password);
      res.status(200).json({ user, users: await listManagedUsers() });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

module.exports = handler;
