#!/usr/bin/env tsx
/**
 * Version Alignment Checker
 * 
 * Ensures package.json versions match lockfile and published versions.
 * 
 * Usage:
 *   npx tsx scripts/check-version-alignment.ts
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

type Severity = 'error' | 'warning' | 'info';

interface Issue {
  severity: Severity;
  message: string;
}

interface PackageInfo {
  name: string;
  path: string;
  packageJsonVersion: string;
  lockfileVersion?: string;
  publishedVersion?: string;
  issues: Issue[];
}

// Compare semver-ish strings as numeric triples. Returns -1, 0, or 1.
// Pre-release suffixes (e.g. "-beta.1") are stripped — version drift from
// pre-release tags is out of scope for this check.
function compareSemver(a: string, b: string): number {
  const parse = (v: string) =>
    v.replace(/-.*$/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const [aa, ab, ac] = parse(a);
  const [ba, bb, bc] = parse(b);
  if (aa !== ba) return aa < ba ? -1 : 1;
  if (ab !== bb) return ab < bb ? -1 : 1;
  if (ac !== bc) return ac < bc ? -1 : 1;
  return 0;
}

const issues: PackageInfo[] = [];

// Enumerate every non-private package under `packages/*` (Turborepo workspace).
function getReleaseProjects(): string[] {
  const packagesDir = 'packages';
  if (!existsSync(packagesDir)) return [];
  return readdirSync(packagesDir)
    .map((entry) => join(packagesDir, entry))
    .filter((path) => {
      const pkgJsonPath = join(path, 'package.json');
      if (!statSync(path).isDirectory() || !existsSync(pkgJsonPath)) return false;
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      return pkg.private !== true;
    });
}

// Get version from package.json
function getPackageJsonVersion(projectPath: string): string | null {
  const packageJsonPath = join(projectPath, 'package.json');
  if (!existsSync(packageJsonPath)) return null;
  
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
}

// Get version from lockfile
function getLockfileVersion(packageName: string): string | null {
  try {
    if (existsSync('package-lock.json')) {
      const lockfile = JSON.parse(readFileSync('package-lock.json', 'utf-8'));
      // Search in packages (npm v2/v3 lockfile format)
      if (lockfile.packages) {
        // Try exact path in monorepo first
        for (const [path, info] of Object.entries(lockfile.packages)) {
          if ((info as any).name === packageName) {
            return (info as any).version;
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Get latest published version from npm
function getPublishedVersion(packageName: string): string | null {
  try {
    const result = execSync(`npm view ${packageName} version`, { 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    return result.trim();
  } catch {
    return null;
  }
}

// Check a single package
function checkPackage(projectPath: string): PackageInfo | null {
  const packageJsonPath = join(projectPath, 'package.json');
  if (!existsSync(packageJsonPath)) return null;

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const packageName = packageJson.name;
  const packageJsonVersion = packageJson.version;
  
  if (!packageName || !packageJsonVersion) return null;

  const lockfileVersion = getLockfileVersion(packageName);
  const publishedVersion = getPublishedVersion(packageName);
  
  const packageInfo: PackageInfo = {
    name: packageName,
    path: projectPath,
    packageJsonVersion,
    lockfileVersion: lockfileVersion || undefined,
    publishedVersion: publishedVersion || undefined,
    issues: [],
  };

  // Lockfile drift is always an error — package.json and lockfile MUST agree
  // or the install graph is broken.
  if (lockfileVersion && lockfileVersion !== packageJsonVersion) {
    packageInfo.issues.push({
      severity: 'error',
      message: `Lockfile version (${lockfileVersion}) doesn't match package.json (${packageJsonVersion})`,
    });
  }

  // Published vs package.json: differentiate regression from pending publish.
  //   - published > package.json  → ERROR (someone decreased the version)
  //   - published < package.json  → INFO  (normal — bump landed, publish is queued)
  //   - published == package.json → no-op (aligned)
  if (publishedVersion) {
    const cmp = compareSemver(publishedVersion, packageJsonVersion);
    if (cmp > 0) {
      packageInfo.issues.push({
        severity: 'error',
        message: `Published version (${publishedVersion}) is AHEAD of package.json (${packageJsonVersion}) — package.json regressed. Bump it forward, never backward.`,
      });
    } else if (cmp < 0) {
      packageInfo.issues.push({
        severity: 'info',
        message: `Published version (${publishedVersion}) is behind package.json (${packageJsonVersion}) — release pending. Will be published on the next publish run.`,
      });
    }
  }

  // Check if dependencies use caret versions (best practice)
  try {
    const packageJson = JSON.parse(readFileSync(join(projectPath, 'package.json'), 'utf-8'));
    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'];
    
    for (const depType of depTypes) {
      if (packageJson[depType]) {
        for (const [depName, version] of Object.entries(packageJson[depType])) {
          if (typeof version === 'string' &&
              version.match(/^\d+\.\d+\.\d+$/) && // Exact version (no caret/tilde)
              !version.startsWith('file:') &&
              !version.startsWith('link:') &&
              !version.startsWith('workspace:')) {
            packageInfo.issues.push({
              severity: 'warning',
              message: `Dependency "${depName}" should use caret (^) version range instead of exact version "${version}"`,
            });
          }
        }
      }
    }
  } catch {
    // Skip if can't read package.json
  }

  return packageInfo;
}

// Main function
function main() {
  console.log('🔍 Checking version alignment...\n');

  const projects = getReleaseProjects();
  const packages: PackageInfo[] = [];

  for (const projectPath of projects) {
    const info = checkPackage(projectPath);
    if (info && info.issues.length > 0) {
      packages.push(info);
    }
  }

  if (packages.length === 0) {
    console.log('✅ All versions are aligned!\n');
    process.exit(0);
  }

  const errorCount = packages.reduce(
    (n, p) => n + p.issues.filter((i) => i.severity === 'error').length,
    0,
  );
  const warningCount = packages.reduce(
    (n, p) => n + p.issues.filter((i) => i.severity === 'warning').length,
    0,
  );
  const infoCount = packages.reduce(
    (n, p) => n + p.issues.filter((i) => i.severity === 'info').length,
    0,
  );

  const glyph = { error: '❌', warning: '⚠️ ', info: 'ℹ️ ' };

  console.log(
    `Found ${packages.length} package(s) with version notes (${errorCount} error, ${warningCount} warning, ${infoCount} info):\n`,
  );

  for (const pkg of packages) {
    console.log(`📦 ${pkg.name} (${pkg.path})`);
    console.log(`   package.json: ${pkg.packageJsonVersion}`);
    if (pkg.lockfileVersion) console.log(`   lockfile:    ${pkg.lockfileVersion}`);
    if (pkg.publishedVersion) console.log(`   published:   ${pkg.publishedVersion}`);
    console.log(`   Notes:`);
    for (const issue of pkg.issues) {
      console.log(`     ${glyph[issue.severity]} ${issue.message}`);
    }
    console.log('');
  }

  if (errorCount === 0) {
    console.log('✅ No alignment errors. Warnings/info are advisory.\n');
    process.exit(0);
  }

  console.log('💡 To fix the errors:');
  console.log('   1. Update package.json versions (or run: npm install for lockfile drift)');
  console.log('   2. If a version went backward, bump it forward — never decrease.');
  console.log('   3. Verify: npm run check-versions');

  process.exit(1);
}

main();

