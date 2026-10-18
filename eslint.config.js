import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  // Папки, які ESLint не перевіряє (згенеровані автоматично)
  globalIgnores(['dist', 'coverage']),

  {
    // Які файли перевіряти
    files: ['**/*.{js,ts}'],
    // Набори правил: рекомендовані для JS + рекомендовані для TS
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      // Дозволяємо глобальні змінні браузера: window, document, fetch...
      globals: globals.browser,
    },
  },

  // Обов'язково ОСТАННІМ: вимикає правила, що конфліктують з Prettier
  prettier,
]);
