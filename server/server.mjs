import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createApiMiddleware } from "./handler.mjs";

// minimalus .env nuskaitymas (be priklausomybių)
try {
  for (const l of fs.readFileSync(".env", "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const api = createApiMiddleware(process.env.WARERA_API_KEY);
const dist = path.resolve("dist");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) { req.url = req.url.slice(4); return api(req, res); }
  let p = path.join(dist, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(dist) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(dist, "index.html");
  res.setHeader("Content-Type", types[path.extname(p)] ?? "application/octet-stream");
  fs.createReadStream(p).pipe(res);
}).listen(process.env.PORT ?? 8787, () => console.log("WarEra planner on :" + (process.env.PORT ?? 8787)));
