import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

function serveStaticLegalPages() {
  const routes = new Map([
    ["/privacy", "public/privacy/index.html"],
    ["/privacy/", "public/privacy/index.html"],
    ["/terms", "public/terms/index.html"],
    ["/terms/", "public/terms/index.html"],
  ]);

  const attach = (server) => {
    server.middlewares.use((req, res, next) => {
      const urlPath = (req.url || "").split("?")[0];
      const target = routes.get(urlPath);
      if (!target) return next();
      const filePath = path.resolve(process.cwd(), target);
      if (!fs.existsSync(filePath)) return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(fs.readFileSync(filePath, "utf-8"));
    });
  };

  return {
    name: "serve-static-legal-pages",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig({
  plugins: [serveStaticLegalPages()],
  base: "./",
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
  },
});
