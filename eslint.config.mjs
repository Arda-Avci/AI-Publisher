import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'no-empty': 'off',
      'no-var': 'off',
      'prefer-const': 'warn',
      'no-console': 'off',
      'no-undef': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'videolar/', 'uploads/', '*.py', 'Wav2Lip/', 'scratch/', 'fix_translations.js', 'src/**/*.js', 'src/**/*.js.map', 'src/**/*.d.ts', 'client/src/**/*.js', 'client/src/**/*.js.map', 'client/tests/'],
  }
);
