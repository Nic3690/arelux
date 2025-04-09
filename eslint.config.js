import eslint from '@eslint/js';
import sveltePlugin from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.svelte'],
    plugins: {
      svelte: sveltePlugin
    },
    languageOptions: {
      parser: sveltePlugin.parser
    },
    rules: {
      'svelte/valid-compile': 'error',
      'svelte/no-at-html-tags': 'warn'
    }
  },
  {
    ignores: ['.svelte-kit/**', 'build/**', 'node_modules/**']
  }
];
