const http = require("http");
const fs = require("fs");
const path = require("path");
const recommendations = require("../api/recommendations");

const root = path.resolve(__dirname, "..", "ui-prototype");
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function serveFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.resolve(root, `.${pathname}`);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

function apiResponse(res) {
  return {
    statusCode: 200,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      res.writeHead(this.statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        ...this.headers
      });
      res.end(JSON.stringify(payload));
    }
  };
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith("/api/recommendations")) {
    await recommendations(req, apiResponse(res));
    return;
  }
  serveFile(req, res);
});

server.listen(port, () => {
  console.log(`Local realtime preview: http://localhost:${port}`);
});
