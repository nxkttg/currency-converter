import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Відносні шляхи до файлів: сайт працюватиме з будь-якої адреси,
  // зокрема з GitHub Pages (nxkttg.github.io/currency-converter/)
  base: './',

  build: {
    rolldownOptions: {
      // Три HTML-сторінки, три точки входу.
      // Без цього Vite зібрав би тільки index.html
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        rates: resolve(import.meta.dirname, 'rates.html'),
        currency: resolve(import.meta.dirname, 'currency.html'),
      },
    },
  },

  test: {
    environment: 'jsdom',
  },
});
