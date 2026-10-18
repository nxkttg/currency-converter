import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Тести запускаються у «віртуальному браузері» jsdom,
    // тому в них доступні document, window, localStorage
    environment: 'jsdom',
  },
});
