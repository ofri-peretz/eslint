#!/usr/bin/env -S npx tsx

/**
 * generate-changelogs.mjs — Generate CHANGELOGs from git history
 *
 * Usage:
 *   tsx scripts/generate-changelogs.ts                     # all plugins missing CHANGELOGs
 *   tsx scripts/generate-changelogs.ts secure-coding       # single plugin
 *   tsx scripts/generate-changelogs.ts --all               # all plugins (overwrite existing)
 *   tsx scripts/generate-changelogs.ts --check             # dry-run: list missing
 *
 * Reads git log for each package → groups by conventional commit type → writes CHANGELOG.md
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = path.join(__dirname, '..', 'packages');
const ROOT = path.join(__dirname, '..');

function getGitLog(packageDir) {
  const relPath = path.relative(ROOT, packageDir);
  try {
    const log = execSync(
      `git log --format="%h|%s|%as" --no-merges -- "${relPath}"`,
      { cwd: ROOT, encoding: 'utf-8', maxBuffer: 1024 * 1024 }
    ).trim();
    return log ? log.split('\n').map(line => {
      const [hash, subject, date] = line.split('|');
      return { hash, subject, date };
    }) : [];
  } catch {
    return [];
  }
}

function categorizeCommits(commits) {
  const categories = {
    feat: { label: '### ✨ Features', items: [] },
    fix: { label: '### 🐛 Bug Fixes', items: [] },
    refactor: { label: '### ♻️ Refactors', items: [] },
    perf: { label: '### ⚡ Performance', items: [] },
    docs: { label: '### 📝 Documentation', items: [] },
    test: { label: '### 🧪 Tests', items: [] },
    chore: { label: '### 🔧 Chores', items: [] },
    other: { label: '### 📦 Other', items: [] },
  };

  for (const commit of commits) {
    const match = commit.subject.match(/^(feat|fix|refactor|perf|docs|test|chore|ci|build|style)(\([^)]+\))?:\s*(.+)/);
    if (match) {
      const type = match[1] === 'ci' || match[1] === 'build' || match[1] === 'style' ? 'chore' : match[1];
      categories[type].items.push({ ...commit, message: match[3] });
    } else {
      categories.other.items.push({ ...commit, message: commit.subject });
    }
  }

  return categories;
}

function generateChangelog(pluginName, packageDir) {
  const commits = getGitLog(packageDir);
  if (commits.length === 0) {
    return null;
  }

  const categories = categorizeCommits(commits);
  const pkgJson = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf-8'));

  let changelog = `# Changelog — ${pkgJson.name}\n\nAll notable changes to this project will be documented in this file.\n`;
  changelog += `See [Conventional Commits](https://www.conventionalcommits.org) for commit guidelines.\n\n`;

  // Group by date ranges (simplified: show all as current version)
  changelog += `## ${pkgJson.version || '1.0.0'} (${new Date().toISOString().split('T')[0]})\n\n`;

  for (const [, cat] of Object.entries(categories)) {
    if (cat.items.length === 0) continue;
    changelog += `${cat.label}\n\n`;
    for (const item of cat.items) {
      changelog += `- ${item.message} (${item.hash}) — ${item.date}\n`;
    }
    changelog += '\n';
  }

  return changelog;
}

// ── CLI ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isAll = args.includes('--all');
const isCheck = args.includes('--check');
const specificPlugin = args.find(a => !a.startsWith('--'));

const plugins = fs.readdirSync(PACKAGES_DIR)
  .filter(d => d.startsWith('eslint-plugin-') && fs.existsSync(path.join(PACKAGES_DIR, d, 'package.json')));

console.log(`\n📋 CHANGELOG Generator\n`);

const summary = { created: 0, skipped: 0, missing: [] };

for (const plugin of plugins) {
  if (specificPlugin && !plugin.includes(specificPlugin)) continue;

  const pkgDir = path.join(PACKAGES_DIR, plugin);
  const changelogPath = path.join(pkgDir, 'CHANGELOG.md');
  const exists = fs.existsSync(changelogPath);
  const isSkeleton = exists && fs.statSync(changelogPath).size < 200;

  if (isCheck) {
    if (!exists || isSkeleton) {
      console.log(`  ❌ ${plugin}: ${isSkeleton ? 'skeleton' : 'missing'}`);
      summary.missing.push(plugin);
    } else {
      console.log(`  ✅ ${plugin}`);
    }
    continue;
  }

  if (exists && !isSkeleton && !isAll) {
    console.log(`  ✅ ${plugin}: CHANGELOG exists, skipping`);
    summary.skipped++;
    continue;
  }

  const changelog = generateChangelog(plugin, pkgDir);
  if (changelog) {
    fs.writeFileSync(changelogPath, changelog, 'utf-8');
    console.log(`  📝 ${plugin}: ${exists ? 'regenerated' : 'created'}`);
    summary.created++;
  } else {
    console.log(`  ⚠️  ${plugin}: no git history found`);
    summary.skipped++;
  }
}

console.log(`\n${'─'.repeat(50)}`);
if (isCheck) {
  console.log(`📊 Missing: ${summary.missing.length} / ${plugins.length}`);
} else {
  console.log(`📊 Created: ${summary.created}, Skipped: ${summary.skipped}`);
}
console.log('');
