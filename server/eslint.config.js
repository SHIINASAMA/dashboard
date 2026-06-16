import js from '../client/node_modules/@eslint/js/src/index.js'
import tseslint from '../client/node_modules/typescript-eslint/dist/index.js'

export default tseslint.config(
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ['__tests__/**'],
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
)
