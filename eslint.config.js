import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  // Directories that should never be linted.
  // engine/ and libcpp/ are git submodules with their own CI.
  { ignores: ['**/dist/**', '**/node_modules/**', 'src/lib/engine/**', 'src/lib/libcpp/**', '**/build/**'] },

  js.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tseslint.configs.recommended.rules,

      // React hooks: enforce rules-of-hooks and deps; the remaining rules
      // belong to the React Compiler plugin which this project does not use.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/preserve-manual-memoization': 'off',

      // Disabled because many .tsx files export helpers alongside components.
      'react-refresh/only-export-components': 'off',

      // The base no-unused-vars and no-undef clash with TypeScript;
      // the TS-specific variants handle these correctly.
      'no-unused-vars': 'off',
      'no-undef': 'off',

      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Config files and scripts run in Node, not the browser.
  {
    files: ['*.config.{js,ts}', '**/*.config.{js,ts}', 'scripts/**/*.{js,ts}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
