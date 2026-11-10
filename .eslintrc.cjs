/* eslint-env node */

module.exports = {
  ignorePatterns: ['dist/', 'coverage/', 'test-results/', 'playwright-report/'],
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['tsconfig.json', 'tsconfig.node.json', 'tsconfig.e2e.json'],
  },
  settings: { react: { version: 'detect' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'warn',
    quotes: ['error', 'single', { avoidEscape: true }],
  },
  overrides: [
    {
      files: ['src/components/ui/**/*.{ts,tsx}'],
      rules: {
        'react-refresh/only-export-components': [
          'warn',
          {
            allowExportNames: ['buttonVariants', 'badgeVariants'],
          },
        ],
      },
    },
    {
      files: ['*test*'],
      rules: { '@typescript-eslint/unbound-method': 'off' },
    },
  ],
};
