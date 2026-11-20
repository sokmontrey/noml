import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const packageRoot = fileURLToPath(new URL("../../packages", import.meta.url));

const aliases = [
    "@noml/core",
    "@noml/kernel",
    "@noml/services",
    "@noml/infra",
    "@noml/ui",
    "@noml/plugin-sdk",
].map((name) => ({
    find: name,
    replacement: `${packageRoot}/${name.replace("@noml/", "")}/src/index.ts`,
}));

export default defineConfig({
    resolve: {
        alias: [
            ...aliases,
            {
                find: "@noml/plugin-core-notes",
                replacement: `${packageRoot}/plugins/core-notes/src/index.ts`,
            },
        ],
    },
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: [
                "favicon.svg",
                "robots.txt",
                "apple-touch-icon.png",
            ],
            manifest: {
                name: "Noml",
                short_name: "Noml",
                description: "A local-first notes PWA with a plugin kernel",
                theme_color: "#ffffff",
                background_color: "#ffffff",
                display: "standalone",
                start_url: "/",
                icons: [
                    {
                        src: "pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
            },
        }),
    ],
});
