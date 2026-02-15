import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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
  plugins: [serveKioskHtml(), react()],
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
