import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves from /delivery-exception-monitor/ so we need that
  // sub-path in production. Locally (dev) the root "/" still works fine.
  base: process.env.NODE_ENV === "production"
    ? "/delivery-exception-monitor/"
    : "/",
  server: {
    port: 5174,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
