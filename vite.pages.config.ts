import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
  root: root + "web",
  envDir: root,
  publicDir: root + "public",
  base: process.env.PAGES_BASE_PATH || "/howtokeepinmind/",
  plugins: [react()],
  resolve: {
    alias: { "next/navigation": root + "web/navigation.ts", "@": root },
  },
  build: { outDir: root + "dist-pages", emptyOutDir: true },
});
