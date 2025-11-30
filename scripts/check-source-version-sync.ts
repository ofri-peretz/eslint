#!/usr/bin/env tsx
/**
 * Source Version Sync Checker
 *
 * Ensures version constants in source code match package.json versions.
 * This prevents version drift between built packages and their metadata.
 *
 * Usage:
 *   pnpm tsx scripts/check-source-version-sync.ts
 *
 * Checked patterns:
 *   - plugin.meta.version in index.ts files
 *   - VERSION constants
 *   - version exports
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { glob } from 'glob';

interface VersionMismatch {
  package: string;
  packageJsonPath: string;
  packageJsonVersion: string;
  sourceFile: string;
  sourceLine: number;
  sourceVersion: string;
  pattern: string;
}

const mismatches: VersionMismatch[] = [];

// Patterns to find version strings in source code
const VERSION_PATTERNS = [
  // ESLint plugin meta version
  {
    name: 'plugin.meta.version',
    regex: /meta:\s*\{[^}]*name:\s*['"][^'"]+['"]\s*,\s*version:\s*['"]([^'"]+)['"]/s,
    lineRegex: /version:\s*['"]([^'"]+)['"]/,
  },
  // VERSION constant
  {
    name: 'VERSION constant',
    regex: /(?:export\s+)?const\s+VERSION\s*=\s*['"]([^'"]+)['"]/,
    lineRegex: /VERSION\s*=\s*['"]([^'"]+)['"]/,
  },
  // version export
  {
    name: 'version export',
    regex: /export\s+const\s+version\s*=\s*['"]([^'"]+)['"]/,
    lineRegex: /version\s*=\s*['"]([^'"]+)['"]/,
  },
];

/**
 * Get packages with source files to check
 */
function getPackagesToCheck(): { name: string; path: string; packageJsonVersion: string }[] {
  const packages: { name: string; path: string; packageJsonVersion: string }[] = [];

  // Find all package.json files in packages/
  const packageJsonFiles = glob.sync('packages/*/package.json');

  for (const pkgJsonPath of packageJsonFiles) {
    try {
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      if (pkgJson.name && pkgJson.version) {
        packages.push({
          name: pkgJson.name,
          path: pkgJsonPath.replace('/package.json', ''),
          packageJsonVersion: pkgJson.version,
        });
      }
    } catch (e) {
      console.warn(`⚠️  Could not read ${pkgJsonPath}`);
    }
  }

  return packages;
}

/**
 * Find version strings in source files
 */
function checkSourceFiles(pkg: { name: string; path: string; packageJsonVersion: string }): void {
  const srcDir = join(pkg.path, 'src');
  if (!existsSync(srcDir)) return;

  // Find TypeScript/JavaScript files
  const sourceFiles = glob.sync(`${srcDir}/**/*.{ts,tsx,js,jsx}`, {
    ignore: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/tests/**'],
  });

  for (const sourceFile of sourceFiles) {
    const content = readFileSync(sourceFile, 'utf-8');
    const lines = content.split('\n');

    for (const pattern of VERSION_PATTERNS) {
      const match = content.match(pattern.regex);
      if (match && match[1]) {
        const sourceVersion = match[1];

        if (sourceVersion !== pkg.packageJsonVersion) {
          // Find the line number
          let lineNumber = 0;
          for (let i = 0; i < lines.length; i++) {
            if (pattern.lineRegex.test(lines[i])) {
              lineNumber = i + 1;
              break;
            }
          }

          mismatches.push({
            package: pkg.name,
            packageJsonPath: join(pkg.path, 'package.json'),
            packageJsonVersion: pkg.packageJsonVersion,
            sourceFile: relative(process.cwd(), sourceFile),
            sourceLine: lineNumber,
            sourceVersion,
            pattern: pattern.name,
          });
        }
      }
    }
  }
}

/**
 * Print results
 */
function printResults(): void {
  if (mismatches.length === 0) {
    console.log('✅ All source code versions match package.json versions!\n');
    return;
  }

  console.log(`❌ Found ${mismatches.length} version mismatch(es):\n`);

  for (const mismatch of mismatches) {
    console.log(`📦 ${mismatch.package}`);
    console.log(`   Pattern: ${mismatch.pattern}`);
    console.log(`   package.json version: ${mismatch.packageJsonVersion}`);
    console.log(`   Source code version:  ${mismatch.sourceVersion}`);
    console.log(`   Location: ${mismatch.sourceFile}:${mismatch.sourceLine}`);
    console.log('');
  }

  console.log('💡 To fix:');
  console.log('   Update the version in source files to match package.json');
  console.log('   Or run: pnpm exec tsx scripts/sync-source-versions.ts');
  console.log('');
}

/**
 * Main function
 */
function main(): void {
  console.log('🔍 Checking source code version sync...\n');

  const packages = getPackagesToCheck();
  console.log(`📦 Found ${packages.length} package(s) to check\n`);

  for (const pkg of packages) {
    checkSourceFiles(pkg);
  }

  printResults();

  if (mismatches.length > 0) {
    process.exit(1);
  }
}

main();

