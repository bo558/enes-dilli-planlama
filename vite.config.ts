import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

// Derleme çıktısı tek bir HTML dosyasıdır: sunucu gerekmeden çift tıklayarak açılabilir.
// Göreli base sayesinde depo alt yolunda (GitHub Pages) ve yerelde aynı çıktı çalışır.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: { assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 4000 },
  // @ts-expect-error vitest alanı Vite tiplerinde tanımlı değil
  test: { include: ['src/**/*.test.ts'] },
});
