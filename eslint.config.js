import js from '@eslint/js';

/** @param {string[]} names */
const readonlyGlobals = (names) => Object.fromEntries(names.map((name) => [name, 'readonly']));

const browser = readonlyGlobals([
  'document',
  'window',
  'fetch',
  'AbortController',
  'AbortSignal',
  'DOMException',
  'URLSearchParams',
  'setTimeout',
  'clearTimeout',
  'globalThis',
]);
const node = readonlyGlobals([...Object.keys(browser), 'URL', 'process', 'console']);

export default [
  { ignores: ['node_modules/', 'coverage/'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: browser },
    rules: {
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      curly: ['error', 'multi-line'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  { files: ['tests/**', 'eslint.config.js'], languageOptions: { globals: node } },
];
