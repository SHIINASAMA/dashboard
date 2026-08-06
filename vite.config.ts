import { fileURLToPath, URL } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  // Build-time mirror of MOCK_DATA so the client can show the mock-mode
  // banner (React Router/Vite do not inline NEXT_PUBLIC_* automatically).
  define: {
    "process.env.NEXT_PUBLIC_MOCK_DATA": JSON.stringify(process.env.NEXT_PUBLIC_MOCK_DATA),
  },
  build: {
    rollupOptions: {
      maxParallelFileOps: 1,
    },
  },
});
