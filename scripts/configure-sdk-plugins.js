#!/usr/bin/env node
/**
 * Script to configure package.json, project.json, and tsconfig files
 * for the 3 SDK-specific security plugins
 */

const fs = require('fs');
const path = require('path');

const PLUGINS_CONFIG = [
  {
    name: 'openai',
    fullName: 'eslint-plugin-openai-security',
    description: 'OpenAI SDK security-focused ESLint plugin with rules for detecting vulnerabilities in OpenAI API usage. Verifiable security patterns for GPT models.',
    keywords: ['openai', 'gpt', 'chatgpt', 'gpt-4', 'gpt-3.5'],
    color: 'cyan'
  },
  {
    name: 'anthropic',
    fullName: 'eslint-plugin-anthropic-security',
    description: 'Anthropic SDK security-focused ESLint plugin with rules for detecting vulnerabilities in Claude API usage. Verifiable security patterns for Claude models.',
    keywords: ['anthropic', 'claude', 'claude-3', 'claude-2'],
    color: 'magenta'
  },
  {
    name: 'google-ai',
    fullName: 'eslint-plugin-google-ai-security',
    description: 'Google AI SDK security-focused ESLint plugin with rules for detecting vulnerabilities in Gemini API usage. Verifiable security patterns for Gemini models.',
    keywords: ['google', 'gemini', 'google-ai', 'palm', 'bard'],
    color: 'yellow'
  }
];

PLUGINS_CONFIG.forEach(plugin => {
  const pkgDir = path.join(__dirname, '..', 'packages', plugin.fullName);
  
  console.log(`\nConfiguring ${plugin.fullName}...`);
  
  // Update package.json
  const packageJsonPath = path.join(pkgDir, 'package.json');
  const packageJson = {
    name: plugin.fullName,
    version: '0.0.1',
    description: plugin.description,
    type: 'commonjs',
    main: './src/index.js',
    types: './src/index.d.ts',
    exports: {
      '.': {
        types: './src/index.d.ts',
        default: './src/index.js'
      },
      './types': {
        types: './src/types/index.d.ts',
        default: './src/types/index.js'
      }
    },
    author: 'Ofri Peretz <ofriperetzdev@gmail.com>',
    license: 'MIT',
    homepage: `https://github.com/ofri-peretz/eslint/blob/main/packages/${plugin.fullName}/README.md`,
    repository: {
      type: 'git',
      url: 'git+https://github.com/ofri-peretz/eslint.git',
      directory: `packages/${plugin.fullName}`
    },
    bugs: {
      url: 'https://github.com/ofri-peretz/eslint/issues'
    },
    publishConfig: {
      access: 'public'
    },
    files: ['src/', 'dist/', 'README.md', 'LICENSE', 'CHANGELOG.md', 'AGENTS.md'],
    keywords: [
      'eslint',
      'eslint-plugin',
      'eslintplugin',
      'security',
      'llm-security',
      ...plugin.keywords,
      'llm-optimized',
      'ai-assistant',
      'auto-fix',
      'typescript',
      'linting',
      'code-quality',
      'ast',
      'static-analysis'
    ],
    engines: {
      node: '>=18.0.0'
    },
    dependencies: {
      tslib: '^2.3.0',
      '@interlace/eslint-devkit': '^1.0.0'
    },
    devDependencies: {
      '@typescript-eslint/parser': '^8.46.2',
      '@typescript-eslint/rule-tester': '^8.46.2',
      vitest: '^4.0.6'
    }
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✓ Updated package.json`);
  
  // Update project.json
  const projectJsonPath = path.join(pkgDir, 'project.json');
  const projectJson = {
    name: plugin.fullName,
    $schema: '../../node_modules/nx/schemas/project-schema.json',
    sourceRoot: `packages/${plugin.fullName}/src`,
    projectType: 'library',
    release: {
      version: {
        manifestRootsToUpdate: ['{projectRoot}', 'dist/{projectRoot}'],
        currentVersionResolver: 'git-tag',
        fallbackCurrentVersionResolver: 'disk'
      }
    },
    tags: [
      'npm:public',
      'npm:eslint',
      'npm:eslint-plugin',
      'npm:typescript',
      'npm:linting',
      'npm:security',
      ...plugin.keywords.map(k => `npm:${k}`),
      'npm:llm-optimized',
      'npm:code-quality',
      'npm:ast',
      'npm:static-analysis'
    ],
    targets: {
      build: {
        executor: '@nx/js:tsc',
        dependsOn: ['^build', 'test'],
        outputs: ['{options.outputPath}'],
        options: {
          outputPath: `dist/packages/${plugin.fullName}`,
          main: `packages/${plugin.fullName}/src/index.ts`,
          tsConfig: `packages/${plugin.fullName}/tsconfig.lib.json`,
          assets: [
            `packages/${plugin.fullName}/README.md`,
            `packages/${plugin.fullName}/CHANGELOG.md`,
            `packages/${plugin.fullName}/LICENSE`,
            `packages/${plugin.fullName}/AGENTS.md`
          ]
        }
      },
      test: {
        executor: '@nx/vite:test',
        outputs: ['{projectRoot}/coverage'],
        options: {
          configFile: `packages/${plugin.fullName}/vite.config.ts`
        },
        configurations: {
          ci: {
            coverage: true
          }
        }
      },
      'nx-release-publish': {
        executor: 'nx:run-commands',
        dependsOn: ['^nx-release-publish'],
        options: {
          command: 'pnpm publish dist/{projectRoot} --access public --no-git-checks',
          cwd: '{workspaceRoot}'
        }
      },
      publish: {
        executor: 'nx:run-commands',
        dependsOn: ['build'],
        options: {
          command: `npm publish dist/packages/${plugin.fullName} --access public`,
          cwd: '{workspaceRoot}'
        }
      }
    }
  };
  
  fs.writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2) + '\n');
  console.log(`✓ Updated project.json`);
  
  // Update tsconfig.json
  const tsconfigPath = path.join(pkgDir, 'tsconfig.json');
  const tsconfig = {
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      module: 'node16',
      moduleResolution: 'node16',
      forceConsistentCasingInFileNames: true,
      strict: true,
      importHelpers: true,
      noImplicitOverride: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      noPropertyAccessFromIndexSignature: true
    },
    files: [],
    include: [],
    references: [
      { path: './tsconfig.lib.json' },
      { path: './tsconfig.spec.json' }
    ]
  };
  
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
  console.log(`✓ Updated tsconfig.json`);
  
  // Update tsconfig.lib.json
  const tsconfigLibPath = path.join(pkgDir, 'tsconfig.lib.json');
  const tsconfigLib = {
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      composite: true,
      outDir: '../../dist/out-tsc',
      declaration: true,
      types: ['node']
    },
    include: ['src/**/*.ts'],
    exclude: [
      'vite.config.ts',
      'vite.config.mts',
      'vitest.config.ts',
      'vitest.config.mts',
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'src/**/*.test.tsx',
      'src/**/*.spec.tsx',
      'src/**/*.test.js',
      'src/**/*.spec.js',
      'src/**/*.test.jsx',
      'src/**/*.spec.jsx'
    ]
  };
  
  fs.writeFileSync(tsconfigLibPath, JSON.stringify(tsconfigLib, null, 2) + '\n');
  console.log(`✓ Updated tsconfig.lib.json`);
  
  // Update vite.config.ts
  const viteConfigPath = path.join(pkgDir, 'vite.config.ts');
  const viteConfig = `import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for ${plugin.fullName} package
 */
export default defineConfig({
  root: __dirname,
  plugins: [],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    globalSetup: ['../../vitest.global-setup.ts'],
    name: { label: '${plugin.name}-security', color: '${plugin.color}' },
    pool: 'vmThreads',
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
      ignoreClassMethods: ['context.report'],
      clean: true,
      reporter: ['text', 'text-summary'],
    },
    reporters: ['default', 'verbose'],
  },
});
`;
  
  fs.writeFileSync(viteConfigPath, viteConfig);
  console.log(`✓ Updated vite.config.ts`);
  
  console.log(`✅ Completed ${plugin.fullName}`);
});

console.log('\n🎉 All 3 SDK security plugins configured successfully!\n');
