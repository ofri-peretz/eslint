import { defineConfig } from 'vitest/config';
import { codecovVitePlugin } from "@codecov/vite-plugin";

export default defineConfig({
  plugins: [
    // Put the Codecov vite plugin after all other plugins
    codecovVitePlugin({
      enableBundleAnalysis: process.env['CODECOV_TOKEN'] !== undefined,
      bundleName: "eslint-plugin-utils",
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
      reporter: ['json'],
      reportOnFailure: true,
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
    },
    // ✅ JUnit reporter for test analytics in Codecov
    reporters: ['junit', 'text', 'json'],
    outputFile: {
      junit: './test-report.junit.xml',
    },
  },
});
