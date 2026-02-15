import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Plugin to serve index-dashboard.html for root URL
function serveDashboardHtml(): Plugin {
  return {
    name: "serve-dashboard-html",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Serve index-dashboard.html for root and all non-asset routes
        if (req.url === "/" || (req.url && !req.url.includes(".") && !req.url.startsWith("/@") && !req.url.startsWith("/src") && !req.url.startsWith("/node_modules"))) {
          req.url = "/index-dashboard.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  server: {
    host: "::",
    port: 3001,
  },
  plugins: [serveDashboardHtml(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@dashboard": path.resolve(__dirname, "./src/dashboard"),
    },
    dedupe: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
  },
  build: {
    outDir: "dist-dashboard",
    minify: "esbuild",
    target: "es2020",
    cssMinify: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index-dashboard.html"),
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-ui": ["framer-motion", "lucide-react"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-charts": ["recharts"],
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    chunkSizeWarningLimit: 300,
  },
});
