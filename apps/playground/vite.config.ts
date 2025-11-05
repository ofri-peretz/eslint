/// <reference types="vitest" />
import { defineConfig } from 'vite';
import type { InlineConfig } from 'vite';

const config: InlineConfig = {
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/playground',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4200,
    host: 'localhost',
  },
  build: {
    outDir: '../../dist/apps/playground',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
};

// Only load React-specific plugins when actually building/serving/testing
// This avoids ES module require() issues during Nx project graph analysis
if (process.env.VITEST || process.argv.some(arg => ['build', 'serve', 'preview'].includes(arg))) {
  const react = require('@vitejs/plugin-react');
  const { nxViteTsPaths } = require('@nx/vite/plugins/nx-tsconfig-paths.plugin');
  const { nxCopyAssetsPlugin } = require('@nx/vite/plugins/nx-copy-assets.plugin');

  config.plugins = [react.default(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])];
  config.test = {
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
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'dist/', '**/*.{test,spec}.ts{,x}'],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-report.junit.xml',
    },
  };
}

export default defineConfig(config);
