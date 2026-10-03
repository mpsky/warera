// Vercel serverless: /api/<ns.proc>?input=... -> WarEra API (raktas iš env WARERA_API_KEY)
import { createApiMiddleware } from "../server/handler.mjs";
const handle = createApiMiddleware(process.env.WARERA_API_KEY);
export default function handler(req, res) {
  req.url = req.url.replace(/^\/api/, "");
  return handle(req, res);
}
