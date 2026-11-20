import { defineConfig } from 'vite';
import { ink } from './tools/ink-plugin.ts';

export default defineConfig({
  base: './',
  plugins: [ink()],
  build: { chunkSizeWarningLimit: 2000 }, // Phaser alone is ~1.2 MB minified
});
