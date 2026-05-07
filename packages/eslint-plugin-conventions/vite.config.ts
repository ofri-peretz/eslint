import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/eslint-plugin-conventions',
    // Uncomment this if you are using workers.
  // worker: {
  //    // },
  test: {
    name: 'eslint-plugin-conventions',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/packages/eslint-plugin-conventions',
      provider: 'v8' as const,
    },
  },
}));
