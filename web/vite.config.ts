import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import solid from 'vite-plugin-solid';

export default defineConfig({
  base: '/',
  plugins: [ViteEjsPlugin(), solid()],
})
