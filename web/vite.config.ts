import { defineConfig, loadEnv } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import solid from 'vite-plugin-solid';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // Check if we should proxy to production (for UI-only development)
  const useProductionProxy = !!env.VITE_PROXY_TARGET;
  const proxyTarget = env.VITE_PROXY_TARGET || 'https://contribcard.cncf.io';

  return {
    base: '/',
    plugins: [ViteEjsPlugin(), solid()],
    server: useProductionProxy
      ? {
          proxy: {
            // Proxy API requests to the target site when running dev server
            // This allows UI development without needing to build/collect data locally
            '/static/data': {
              target: proxyTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/static/, ''),
            },
          },
        }
      : undefined,
  };
});
