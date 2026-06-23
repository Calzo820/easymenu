import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const commonRules = {
  'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
  'no-empty': 'off',
  'no-control-regex': 'off',
}

export default defineConfig([
  globalIgnores(['dist', 'node_modules', '.vercel', 'backend/socket/index.js']),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      ...commonRules,
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['backend/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: commonRules,
  },
])
