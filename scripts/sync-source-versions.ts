#!/usr/bin/env tsx
/**
 * Source Version Sync Script
 *
 * Automatically updates version constants in source code to match package.json.
 * Run this after bumping package.json versions to keep source code in sync.
 *
 * Usage:
 *   pnpm tsx scripts/sync-source-versions.ts
 *   pnpm tsx scripts/sync-source-versions.ts --dry-run
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { glob } from 'glob';

const isDryRun = process.argv.includes('--dry-run');

interface Update {
  file: string;
  package: string;
  oldVersion: string;
  newVersion: string;
  pattern: string;
}

const updates: Update[] = [];

// Patterns to find and replace version strings
const VERSION_PATTERNS = [
  // ESLint plugin meta version
  {
    name: 'plugin.meta.version',
    regex: /(meta:\s*\{[^}]*name:\s*['"][^'"]+['"]\s*,\s*version:\s*['"]).+?(['"])/s,
    findRegex: /meta:\s*\{[^}]*name:\s*['"][^'"]+['"]\s*,\s*version:\s*['"]([^'"]+)['"]/s,
  },
  // VERSION constant
  {
    name: 'VERSION constant',
    regex: /((?:export\s+)?const\s+VERSION\s*=\s*['"]).+?(['"])/,
    findRegex: /(?:export\s+)?const\s+VERSION\s*=\s*['"]([^'"]+)['"]/,
  },
  // version export
  {
    name: 'version export',
    regex: /(export\s+const\s+version\s*=\s*['"]).+?(['"])/,
    findRegex: /export\s+const\s+version\s*=\s*['"]([^'"]+)['"]/,
  },
];

/**
 * Get packages with source files to check
 */
function getPackages(): { name: string; path: string; version: string }[] {
  const packages: { name: string; path: string; version: string }[] = [];
  const packageJsonFiles = glob.sync('packages/*/package.json');

  for (const pkgJsonPath of packageJsonFiles) {
    try {
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      if (pkgJson.name && pkgJson.version) {
        packages.push({
          name: pkgJson.name,
          path: pkgJsonPath.replace('/package.json', ''),
          version: pkgJson.version,
        });
      }
    } catch (e) {
      console.warn(`⚠️  Could not read ${pkgJsonPath}`);
    }
  }

  return packages;
}

/**
 * Update version strings in a source file
 */
function updateSourceFile(
  filePath: string,
  packageName: string,
  targetVersion: string
): boolean {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;

  for (const pattern of VERSION_PATTERNS) {
    const findMatch = content.match(pattern.findRegex);
    if (findMatch && findMatch[1]) {
      const currentVersion = findMatch[1];

      if (currentVersion !== targetVersion) {
        content = content.replace(pattern.regex, `$1${targetVersion}$2`);
        modified = true;

        updates.push({
          file: relative(process.cwd(), filePath),
          package: packageName,
          oldVersion: currentVersion,
          newVersion: targetVersion,
          pattern: pattern.name,
        });
      }
    }
  }

  if (modified && !isDryRun) {
    writeFileSync(filePath, content, 'utf-8');
  }

  return modified;
}

/**
 * Process all source files in a package
 */
function processPackage(pkg: { name: string; path: string; version: string }): void {
  const srcDir = join(pkg.path, 'src');
  if (!existsSync(srcDir)) return;

  const sourceFiles = glob.sync(`${srcDir}/**/*.{ts,tsx,js,jsx}`, {
    ignore: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/tests/**'],
  });

  for (const sourceFile of sourceFiles) {
    updateSourceFile(sourceFile, pkg.name, pkg.version);
  }
}

/**
 * Main function
 */
function main(): void {
  console.log(`🔄 ${isDryRun ? '[DRY RUN] ' : ''}Syncing source code versions...\n`);

  const packages = getPackages();
  console.log(`📦 Found ${packages.length} package(s)\n`);

  for (const pkg of packages) {
    processPackage(pkg);
  }

  if (updates.length === 0) {
    console.log('✅ All source code versions are already in sync!\n');
    return;
  }

  console.log(`${isDryRun ? 'Would update' : 'Updated'} ${updates.length} file(s):\n`);

  for (const update of updates) {
    console.log(`📝 ${update.file}`);
    console.log(`   Package: ${update.package}`);
    console.log(`   Pattern: ${update.pattern}`);
    console.log(`   ${update.oldVersion} → ${update.newVersion}`);
    console.log('');
  }

  if (isDryRun) {
    console.log('💡 Run without --dry-run to apply changes');
  } else {
    console.log('✅ All versions synced!');
    console.log('💡 Remember to commit the changes');
  }
}

main();

