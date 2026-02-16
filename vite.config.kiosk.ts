import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import viteCompression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";

// Plugin to serve index-kiosk.html for root URL
function serveKioskHtml(): Plugin {
  return {
    name: "serve-kiosk-html",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Serve index-kiosk.html for root and all non-asset routes
        if (req.url === "/" || (req.url && !req.url.includes(".") && !req.url.startsWith("/@") && !req.url.startsWith("/src") && !req.url.startsWith("/node_modules"))) {
          req.url = "/index-kiosk.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  server: {
    host: "::",
    port: 3000,
  },
  plugins: [
    serveKioskHtml(), 
    react(),
    viteCompression(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "9Yards Food Kiosk",
        short_name: "9Yards",
        description: "Self-service food ordering kiosk",
        theme_color: "#E6411C",
        background_color: "#ffffff",
        display: "fullscreen",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@kiosk": path.resolve(__dirname, "./src/kiosk"),
    },
    dedupe: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "framer-motion",
      "@tanstack/react-query",
    ],
    exclude: [],
  },
  build: {
    outDir: "dist-kiosk",
    minify: "esbuild",
    target: "es2020",
    cssMinify: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index-kiosk.html"),
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-ui": ["framer-motion", "lucide-react"],
          "vendor-query": ["@tanstack/react-query"],
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    chunkSizeWarningLimit: 300,
  },
});
