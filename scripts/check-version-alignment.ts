#!/usr/bin/env tsx
/**
 * Version Alignment Checker
 * 
 * Ensures package.json versions match lockfile and published versions.
 * 
 * Usage:
 *   pnpm tsx scripts/check-version-alignment.ts
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

interface PackageInfo {
  name: string;
  path: string;
  packageJsonVersion: string;
  lockfileVersion?: string;
  publishedVersion?: string;
  issues: string[];
}

const issues: PackageInfo[] = [];

// Get all release projects from nx.json
function getReleaseProjects(): string[] {
  const nxConfig = JSON.parse(readFileSync('nx.json', 'utf-8'));
  return nxConfig.release?.projects || [];
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
    const lockfile = readFileSync('pnpm-lock.yaml', 'utf-8');
    const regex = new RegExp(`'${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*\\n\\s*specifier:\\s*([^\\n]+)`, 'm');
    const match = lockfile.match(regex);
    return match ? match[1].trim().replace(/['"]/g, '') : null;
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

  // Check alignment
  if (lockfileVersion && lockfileVersion !== packageJsonVersion) {
    packageInfo.issues.push(
      `Lockfile version (${lockfileVersion}) doesn't match package.json (${packageJsonVersion})`
    );
  }

  if (publishedVersion && publishedVersion !== packageJsonVersion) {
    packageInfo.issues.push(
      `Published version (${publishedVersion}) doesn't match package.json (${packageJsonVersion})`
    );
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
            packageInfo.issues.push(
              `Dependency "${depName}" should use caret (^) version range instead of exact version "${version}"`
            );
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

  console.log(`❌ Found ${packages.length} package(s) with version misalignment:\n`);

  for (const pkg of packages) {
    console.log(`📦 ${pkg.name} (${pkg.path})`);
    console.log(`   package.json: ${pkg.packageJsonVersion}`);
    if (pkg.lockfileVersion) {
      console.log(`   lockfile:    ${pkg.lockfileVersion}`);
    }
    if (pkg.publishedVersion) {
      console.log(`   published:   ${pkg.publishedVersion}`);
    }
    console.log(`   Issues:`);
    for (const issue of pkg.issues) {
      console.log(`     ❌ ${issue}`);
    }
    console.log('');
  }

  console.log('💡 To fix:');
  console.log('   1. Update package.json versions');
  console.log('   2. Run: pnpm install');
  console.log('   3. Run: pnpm sync-tags (if git tags are out of sync)');
  console.log('   4. Verify: pnpm nx lint <project>');
  
  process.exit(1);
}

main();

