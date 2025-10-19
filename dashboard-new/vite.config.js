import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

// https://vite.dev/config/
export default defineConfig({
  base: "/dashboard-new/",
  plugins: [
    // Ensure Tailwind v4 CSS import support
    tailwindcss(),
    react(),
    // Copy service worker and PWA files to root during build
    {
      name: "copy-pwa-files",
      closeBundle() {
        const files = ["sw.js", "offline.html", "manifest.json"];
        files.forEach((file) => {
          const src = path.resolve(__dirname, "public", file);
          const dest = path.resolve(__dirname, "dist", file);
          if (existsSync(src)) {
            copyFileSync(src, dest);
            console.log(`✅ Copied ${file} to dist/`);
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: process.env.PORT || 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: process.env.PORT || 3000,
    allowedHosts: [".railway.app", ".up.railway.app", "localhost"],
  },
});
