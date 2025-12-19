import nextConfig from 'eslint-config-next';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: ['node_modules/**', '.next/**'],
  },
  ...nextConfig,
  prettierConfig,
];
