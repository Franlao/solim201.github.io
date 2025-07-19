import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
    site: 'https://my-portfolio-solim.vercel.app',
    base: '/',
    output: 'server',
    adapter: vercel(),
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
