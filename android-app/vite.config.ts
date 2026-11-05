import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  publicDir: fileURLToPath(new URL('../website/public', import.meta.url)),
  build: { outDir: 'dist', emptyOutDir: true },
});
