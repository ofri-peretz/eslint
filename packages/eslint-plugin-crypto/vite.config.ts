import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/eslint-plugin-crypto',
    // Uncomment this if you are using workers.
  // worker: {
  //    // },
  test: {
    name: 'eslint-plugin-crypto',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/eslint-plugin-crypto',
      provider: 'v8' as const,
    },
  },
}));
