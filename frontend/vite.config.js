import { defineConfig, loadEnv } from "vite";
import process from "node:process";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const configured = loadEnv(mode, process.cwd(), "VITE_").VITE_PUBLIC_URL?.trim();
  let origin = null;
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname))
      throw new Error("VITE_PUBLIC_URL must be the public HTTPS origin, without a path or credentials.");
    origin = url.origin;
  }
  return {
  plugins: [react(), { name: "returntrail-public-metadata", generateBundle() {
    this.emitFile({ type: "asset", fileName: "robots.txt", source: "User-agent: *\nAllow: /\n" + (origin ? `Sitemap: ${origin}/sitemap.xml\n` : "") });
    if (origin) this.emitFile({ type: "asset", fileName: "sitemap.xml", source: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/","/about","/how-it-works.html","/privacy.html"].map((path) => `<url><loc>${origin}${path}</loc></url>`).join("")}</urlset>` });
  }, transformIndexHtml() {
    if (!origin) return [];
    return [
      { tag: "meta", attrs: { name: "returntrail-public-origin", content: origin }, injectTo: "head" },
      { tag: "link", attrs: { rel: "canonical", href: origin + "/" }, injectTo: "head" },
      { tag: "meta", attrs: { property: "og:url", content: origin + "/" }, injectTo: "head" },
      { tag: "meta", attrs: { property: "og:image", content: origin + "/share-card.png" }, injectTo: "head" },
    ];
  } }],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    proxy: Object.fromEntries(
      ["/api", "/oauth2", "/login/oauth2"].map((prefix) => [
        prefix,
        {
          target: "http://127.0.0.1:8085",
          changeOrigin: true,
          timeout: 420000,
          proxyTimeout: 420000,
        },
      ]),
    ),
  },
  build: { chunkSizeWarningLimit: 1200 },
};
});
