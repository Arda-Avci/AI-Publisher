import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-namespace': 'off',
      'no-empty': 'off',
      'no-var': 'off',
      'prefer-const': 'warn',
      'no-console': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'videolar/', 'uploads/', '*.py', 'Wav2Lip/'],
  }
);
