import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'Users/**',
    'next-env.d.ts',
    '.source/**',
  ]),
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      // Disabled for external images (shields.io badges, dev.to avatars/covers)
      // These dynamic external URLs don't benefit from Next.js Image optimization
      '@next/next/no-img-element': 'off',
    },
  },
]);

export default eslintConfig;