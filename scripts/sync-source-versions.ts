#!/usr/bin/env tsx
/**
 * Source Version Sync Script
 *
 * Automatically updates version constants in source code to match package.json.
 * Run this after bumping package.json versions to keep source code in sync.
 *
 * Usage:
 *   npx tsx scripts/sync-source-versions.ts
 *   npx tsx scripts/sync-source-versions.ts --dry-run
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { glob } from 'glob';

const isDryRun = process.argv.includes('--dry-run');

interface Update {
  file: string;
  package: string;
  oldVersion: string;
  newVersion: string;
  pattern: string;
}

export interface VersionPattern {
  name: string;
  /** Replacement regex: `$1` = everything up to the value, `$2` = closing quote. */
  regex: RegExp;
  /** Detection regex: capture group 1 = the current version value. */
  findRegex: RegExp;
}

const updates: Update[] = [];
const syncErrors: string[] = [];

// Patterns to find and replace version strings
export const VERSION_PATTERNS: VersionPattern[] = [
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
 * Pure core: sync version strings inside a string of source content.
 *
 * Returns the rewritten content plus the per-pattern `updates` and `errors`.
 * An **error** is recorded when a pattern's `findRegex` detects a version that
 * DIFFERS from the target but the `regex` replacement fails to rewrite it —
 * i.e. the find/replace pair has drifted apart. Left unflagged (the previous
 * behaviour) this silently produces a mis-synced file: the script reports an
 * "update", writes the unchanged content, and the Version PR ships a stale
 * `meta.version` (exactly how the broken 3.0.3 had `meta.version: '1.0.0'`).
 */
export function syncVersionsInContent(
  content: string,
  targetVersion: string,
  patterns: VersionPattern[] = VERSION_PATTERNS,
): {
  content: string;
  updates: { pattern: string; oldVersion: string }[];
  errors: { pattern: string; detectedVersion: string }[];
} {
  let result = content;
  const upd: { pattern: string; oldVersion: string }[] = [];
  const errs: { pattern: string; detectedVersion: string }[] = [];

  for (const pattern of patterns) {
    const findMatch = result.match(pattern.findRegex);
    if (findMatch && findMatch[1] && findMatch[1] !== targetVersion) {
      const current = findMatch[1];
      result = result.replace(pattern.regex, `$1${targetVersion}$2`);

      // Confirm the rewrite landed: it's a success ONLY if the value is now the
      // target. Anything else — still drifted, or the structure no longer
      // matches (the replace mangled or dropped it) — means the replace regex
      // diverged from findRegex; record an error instead of silently shipping a
      // mis-synced file.
      const after = result.match(pattern.findRegex);
      if (after && after[1] === targetVersion) {
        upd.push({ pattern: pattern.name, oldVersion: current });
      } else {
        errs.push({ pattern: pattern.name, detectedVersion: current });
      }
    }
  }

  return { content: result, updates: upd, errors: errs };
}

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
    } catch {
      console.warn(`⚠️  Could not read ${pkgJsonPath}`);
    }
  }

  return packages;
}

/**
 * Update version strings in a source file
 */
function updateSourceFile(filePath: string, packageName: string, targetVersion: string): boolean {
  const original = readFileSync(filePath, 'utf-8');
  const { content, updates: fileUpdates, errors: fileErrors } = syncVersionsInContent(
    original,
    targetVersion,
  );

  for (const u of fileUpdates) {
    updates.push({
      file: relative(process.cwd(), filePath),
      package: packageName,
      oldVersion: u.oldVersion,
      newVersion: targetVersion,
      pattern: u.pattern,
    });
  }
  for (const e of fileErrors) {
    syncErrors.push(
      `${relative(process.cwd(), filePath)} (${packageName}): ${e.pattern} found ` +
        `${e.detectedVersion} ≠ ${targetVersion} but could not rewrite it`,
    );
  }

  const modified = fileUpdates.length > 0;
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
  // Reset the module-level accumulators so a second call in the same process
  // doesn't accumulate stale counts. The is-main guard prevents this today, but
  // keep main() idempotent for anyone testing it end-to-end.
  updates.length = 0;
  syncErrors.length = 0;

  console.log(`🔄 ${isDryRun ? '[DRY RUN] ' : ''}Syncing source code versions...\n`);

  const packages = getPackages();
  console.log(`📦 Found ${packages.length} package(s)\n`);

  for (const pkg of packages) {
    processPackage(pkg);
  }

  // Fail loudly if any pattern detected a drift it could not rewrite. Otherwise
  // the Version PR is created with a stale meta.version and nobody notices.
  if (syncErrors.length > 0) {
    console.error(
      `\n❌ ${syncErrors.length} version mismatch(es) detected but NOT rewritten — ` +
        `the find/replace patterns are out of sync:`,
    );
    for (const e of syncErrors) console.error(`   - ${e}`);
    console.error(
      '\nFix VERSION_PATTERNS in scripts/sync-source-versions.ts. Failing rather than ' +
        'shipping a mis-synced version.',
    );
    process.exit(1);
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

// Run only when executed directly (not when imported by tests).
const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isMain) {
  main();
}
