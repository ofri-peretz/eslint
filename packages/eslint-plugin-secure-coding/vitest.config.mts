import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for eslint-plugin-secure-coding package
 *
 * @description
 * Configures Vitest for testing security ESLint rules with the following setup:
 * - Node environment for running ESLint rule tests
 * - Coverage tracking with v8 provider
 * - JUnit reporting for CI/CD pipeline integration
 */
export default defineConfig({
  root: __dirname,
  plugins: [],
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: [
      'src/**/*.test.ts',
    ],
    // Setting `exclude` replaces vitest's defaults — spread them back in and
    // add build-artifact dirs so stale outputs can never shadow real tests.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      '**/.next/**',
      '**/.turbo/**',
      '**/storybook-static/**',
      '**/coverage/**',
    ],
    passWithNoTests: true,
    globalSetup: ['../../vitest.global-setup.ts'],
    name: { label: 'secure-coding', color: 'green' },
    // Use forks to prevent coverage race conditions
    // pool: 'forks',
    pool: 'vmThreads',
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
      ignoreClassMethods: ['context.report'],
      clean: true,
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80
      }
    },
    reporters: ['default', 'verbose'],
    // outputFile: {
    //   // junit: './test-report.junit.xml',

    // },
    // onConsoleLog(log, type) {
    //   if (process.env['VITEST_CONSOLE_LOG'] === 'true') {
    //     return true; // Allow log
    //   }
    //   return false; // Suppress log
    // },
  },
});


