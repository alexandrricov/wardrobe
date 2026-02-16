import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";
  const base = isProd ? "/closet-book/" : "/";

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        filename: "sw.js",
        registerType: "autoUpdate",
        injectRegister: "auto",
        manifest: {
          name: "ClosetBook",
          short_name: "ClosetBook",
          description: "Personal closet catalog with photos and details.",
          start_url: base,
          scope: base,
          display: "standalone",
          background_color: "#f0f2f7",
          theme_color: "#b04a75",
          icons: [
            { src: "icons/pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "icons/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
              },
            },
          ],
          navigateFallback: isProd ? "/closet-book/index.html" : "/index.html",
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    server: {
      port: 5178,
    },
    base: isProd ? "/closet-book/" : "/",
  };
});
