import js from '@eslint/js';

const browser = Object.fromEntries(['document', 'window', 'fetch', 'AbortController', 'AbortSignal', 'DOMException', 'URLSearchParams', 'setTimeout', 'clearTimeout', 'globalThis'].map((n) => [n, 'readonly']));

export default [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: browser },
    rules: { eqeqeq: 'error', 'no-var': 'error', 'prefer-const': 'error', curly: ['error', 'multi-line'], 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
];
