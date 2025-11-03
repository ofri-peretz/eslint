import { defineConfig } from 'vitest/config';
import { codecovVitePlugin } from "@codecov/vite-plugin";

export default defineConfig({
  plugins: [
    // Put the Codecov vite plugin after all other plugins
    codecovVitePlugin({
      enableBundleAnalysis: process.env['CODECOV_TOKEN'] !== undefined,
      bundleName: "eslint-plugin",
      uploadToken: process.env['CODECOV_TOKEN'],
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['json', 'text'],  // ← Only json for Codecov (fastest)
      reportOnFailure: true,
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
    },
    // ✅ JUnit reporter for test analytics in Codecov
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-report.junit.xml',
    },
  },
});

