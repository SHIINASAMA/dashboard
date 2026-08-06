import { createServer } from "node:http";
import { createRequestListener } from "@react-router/node";
import * as build from "../build/server/index.js";

const port = Number(process.env.PORT || 3000);
const app = createRequestListener({ build });

// Mirrors the security headers previously set by next.config.ts.
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function listener(req, res) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
  if (req.url?.startsWith("/api/")) {
    res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGINS || "*");
  }
  app(req, res);
}

const server = createServer(listener);

server.listen(port, () => {
  console.log(`dashboard listening on http://localhost:${port}`);
});
