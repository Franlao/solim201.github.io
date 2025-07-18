import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
    site: 'https://solim201.github.io',
    base: '/',
    output: 'server',
    adapter: node({
        mode: 'standalone'
    }),
    build: {
        assets: 'assets'
    },
    vite: {
        build: {
            rollupOptions: {
                output: {
                    entryFileNames: 'assets/[name].[hash].js',
                    chunkFileNames: 'assets/[name].[hash].js',
                    assetFileNames: 'assets/[name].[hash].[ext]'
                }
            }
        }
    },
    compressHTML: true,
    prefetch: true,
    integrations: [tailwind()],
    i18n: {
        defaultLocale: "fr",
        locales: ["fr", "en"],
        routing: {
            prefixDefaultLocale: false
        }
    }
});
