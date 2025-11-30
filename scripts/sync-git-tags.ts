#!/usr/bin/env tsx
/**
 * Sync Git Tags with Package Versions
 * 
 * This script aligns git tags with current package.json versions.
 * Useful when packages are published manually without going through nx release.
 * 
 * Usage:
 *   pnpm tsx scripts/sync-git-tags.ts [--dry-run] [--commit SHA]
 * 
 * Options:
 *   --dry-run    Preview what tags would be created without creating them
 *   --commit SHA  Point tags to specific commit (default: HEAD)
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface PackageInfo {
  path: string;
  name: string;
  version: string;
  tagName: string;
}

// Read nx.json to get release projects
function getReleaseProjects(): string[] {
  const nxConfig = JSON.parse(readFileSync('nx.json', 'utf-8'));
  return nxConfig.release?.projects || [];
}

// Read package.json and extract name and version
function getPackageInfo(projectPath: string): PackageInfo | null {
  const packageJsonPath = join(projectPath, 'package.json');
  
  if (!existsSync(packageJsonPath)) {
    console.warn(`⚠️  Package.json not found: ${packageJsonPath}`);
    return null;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const name = packageJson.name;
  const version = packageJson.version;

  if (!name || !version) {
    console.warn(`⚠️  Missing name or version in ${packageJsonPath}`);
    return null;
  }

  // Convert package name to tag format
  // @forge-js/eslint-plugin-llm-optimized -> eslint-plugin-llm-optimized
  // @forge-js/cli -> cli
  const tagName = name.replace(/^@[^/]+\//, '');

  return {
    path: projectPath,
    name,
    version,
    tagName: `${tagName}@${version}`,
  };
}

// Check if tag already exists
function tagExists(tagName: string): boolean {
  try {
    execSync(`git rev-parse "${tagName}"`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Get current commit SHA
function getCurrentCommit(): string {
  return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
}

// Create git tag
function createTag(tagName: string, commit: string, dryRun: boolean): void {
  if (dryRun) {
    console.log(`  [DRY RUN] Would create tag: ${tagName} -> ${commit}`);
    return;
  }

  try {
    execSync(`git tag -f "${tagName}" "${commit}"`, { stdio: 'inherit' });
    console.log(`  ✅ Created/updated tag: ${tagName}`);
  } catch (error) {
    console.error(`  ❌ Failed to create tag ${tagName}:`, error);
    process.exit(1);
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const commitIndex = args.indexOf('--commit');
  const commit = commitIndex !== -1 && args[commitIndex + 1]
    ? args[commitIndex + 1]
    : getCurrentCommit();

  console.log('🔍 Syncing Git Tags with Package Versions\n');
  console.log(`📝 Commit: ${commit}`);
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN (preview only)' : 'LIVE (will create tags)'}\n`);

  const projects = getReleaseProjects();
  const packages: PackageInfo[] = [];

  // Collect package info
  for (const projectPath of projects) {
    const info = getPackageInfo(projectPath);
    if (info) {
      packages.push(info);
    }
  }

  if (packages.length === 0) {
    console.error('❌ No packages found to sync');
    process.exit(1);
  }

  console.log(`📦 Found ${packages.length} packages:\n`);

  // Display current state and create tags
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const pkg of packages) {
    const exists = tagExists(pkg.tagName);
    const currentTagCommit = exists
      ? execSync(`git rev-parse "${pkg.tagName}"`, { encoding: 'utf-8' }).trim()
      : null;

    if (exists && currentTagCommit === commit) {
      console.log(`  ✓ ${pkg.tagName} (already points to ${commit.substring(0, 7)})`);
      skipped++;
    } else {
      if (exists) {
        console.log(`  🔄 ${pkg.tagName} (will update from ${currentTagCommit?.substring(0, 7) || 'unknown'})`);
        updated++;
      } else {
        console.log(`  ➕ ${pkg.tagName} (will create)`);
        created++;
      }
      createTag(pkg.tagName, commit, dryRun);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);

  if (!dryRun && (created > 0 || updated > 0)) {
    console.log('\n💡 Next steps:');
    console.log('  1. Review tags: git tag --list | grep -E "@(1\\.|2\\.)"');
    console.log('  2. Push tags: git push --tags');
    console.log('  3. Verify: pnpm nx release version --dry-run');
  } else if (dryRun) {
    console.log('\n💡 Run without --dry-run to create tags');
  }
}

main();

