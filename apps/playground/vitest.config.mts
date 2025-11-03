import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { codecovVitePlugin } from "@codecov/vite-plugin";

export default defineConfig({
  root: __dirname,
  plugins: [
    react(),
    nxViteTsPaths(),
    codecovVitePlugin({
      enableBundleAnalysis: process.env['CODECOV_TOKEN'] !== undefined,
      bundleName: "playground",
      uploadToken: process.env['CODECOV_TOKEN'],
    }),
  ],
  test: {
    name: 'playground',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8' as const,
      reporter: ['json', 'text'],
      reportOnFailure: true,
      exclude: ['node_modules/', 'dist/', '**/*.{test,spec}.ts{,x}'],
    },
    // ✅ JUnit reporter for test analytics in Codecov
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-report.junit.xml',
    },
  },
});
