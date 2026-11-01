// Minimal static server for the built SPA: serves dist/, falls back to
// index.html for client-side routes, and listens on $PORT (default 8080).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const DIST = resolve(process.cwd(), "dist");
const PORT = Number(process.env.PORT) || 8080;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".map": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const target = join(DIST, decodeURIComponent(url.pathname).replace(/^\/+/, ""));
    let file = target.startsWith(DIST) ? target : join(DIST, "index.html");
    let body;
    try {
      body = await readFile(file);
    } catch {
      file = join(DIST, "index.html"); // client-side route: serve the SPA shell
      body = await readFile(file);
    }
    res.writeHead(200, { "content-type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Server error");
  }
}).listen(PORT, () => {
  console.log(`flowtask serving dist/ on :${PORT}`);
});
