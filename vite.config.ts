import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-ignore - plain JS handler shared with the production server
import { createApiMiddleware } from "./server/handler.mjs";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      {
        name: "warera-api-proxy",
        configureServer(server) {
          server.middlewares.use("/api", createApiMiddleware(env.WARERA_API_KEY));
        },
      },
    ],
  };
});
