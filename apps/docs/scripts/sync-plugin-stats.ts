#!/usr/bin/env -S npx tsx
/**
 * Sync Plugin Stats Script
 * 
 * Scans all ESLint plugin packages and counts their rules.
 * Outputs to a JSON file for consumption by the docs site.
 * 
 * Run: tsx scripts/sync-plugin-stats.ts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = join(__dirname, '../../../packages');
const OUTPUT_FILE = join(__dirname, '../src/data/plugin-stats.json');
const NUMBERS_FILE = join(__dirname, '../src/data/interlace-numbers.json');

/**
 * Count rules by parsing the rules export in index.ts
 */
export function countRulesInPackage(packagePath: string) {
  const indexPath = join(packagePath, 'src/index.ts');
  
  if (!existsSync(indexPath)) {
    return 0;
  }

  const content = readFileSync(indexPath, 'utf-8');
  
  // Match rule entries like "'rule-name': ruleName,"
  const ruleMatches = content.match(/^\s+'[a-z-]+'\s*:/gm);
  return ruleMatches ? ruleMatches.length : 0;
}

export function getPackageMetadata(packagePath: string) {
  const pkgJsonPath = join(packagePath, 'package.json');
  
  if (!existsSync(pkgJsonPath)) {
    return null;
  }

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  return {
    name: pkgJson.name,
    description: pkgJson.description,
    version: pkgJson.version,
    private: pkgJson.private,
    interlace: pkgJson.interlace,
  };
}

/**
 * First sentence of a package description.
 *
 * Splitting on a bare `.` truncated at any dot, so "Node.js" and "Express.js"
 * cut the description to "…plugin for Node" / "…plugin for Express" on the docs
 * site. A sentence boundary is a period followed by whitespace or end-of-string.
 */
export function firstSentence(description?: string) {
  return description?.split(/\.(?=\s|$)/)[0] || '';
}

export function getCategory(packageName: string) {
  // Framework plugins - Express, NestJS, Lambda
  if (packageName.includes('express') || 
      packageName.includes('nestjs') || 
      packageName.includes('lambda')) {
    return 'framework';
  }
  
  // Architecture plugins
  if (packageName.includes('import-next') || 
      packageName.includes('architecture')) {
    return 'architecture';
  }
  
  // Quality/Governance plugins - code quality, maintainability, conventions
  const qualityPlugins = [
    'conventions',
    'maintainability',
    'modularity',
    'operability',
    'reliability',
    'modernization',
    'quality',
  ];
  if (qualityPlugins.some(q => packageName.includes(q))) {
    return 'quality';
  }
  
  // React plugins
  if (packageName.includes('react')) {
    return 'react';
  }
  
  // Default to security for all security-focused plugins
  return 'security';
}

/**
 * Pillar mapping (canonical 3-tier used on every marketing surface):
 *   security = category security | framework
 *   quality  = category quality  | architecture
 *   react    = category react
 * Only published plugins count — this manifest is the single source of
 * truth for every "N plugins / N rules" claim across repos (eslint docs,
 * interlace landing, ofriperetz.dev blog). Consumers commit an exact copy
 * and lock-test against it; never hand-type these numbers.
 */
export function buildNumbersManifest(
  stats: Array<{ rules: number; category: string; published: boolean }>,
  generatedAt: string,
) {
  const published = stats.filter(p => p.published);
  const pillarOf = (category: string) =>
    category === 'security' || category === 'framework' ? 'security'
    : category === 'react' ? 'react'
    : 'quality';
  const count = (pillar: string) => published.filter(p => pillarOf(p.category) === pillar);
  const rulesOf = (list: Array<{ rules: number }>) => list.reduce((sum, p) => sum + p.rules, 0);

  const security = count('security');
  const quality = count('quality');
  const react = count('react');

  return {
    schemaVersion: 1,
    source: 'https://github.com/ofri-peretz/eslint — apps/docs/scripts/sync-plugin-stats.ts',
    plugins: {
      total: published.length,
      security: security.length,
      quality: quality.length,
      react: react.length,
    },
    rules: {
      total: rulesOf(published),
      security: rulesOf(security),
      quality: rulesOf(quality),
      react: rulesOf(react),
    },
    generatedAt,
  };
}

/**
 * Write JSON only when the data (ignoring generatedAt) changed, to prevent
 * git churn. Read directly and catch missing/parse failures rather than
 * `existsSync` + `readFileSync` (CodeQL: file system race condition).
 */
function writeIfChanged(filePath: string, label: string, data: Record<string, unknown>) {
  try {
    const existing = JSON.parse(readFileSync(filePath, 'utf-8'));
    const existingData = { ...existing };
    const newData = { ...data };
    Reflect.deleteProperty(existingData, 'generatedAt');
    Reflect.deleteProperty(newData, 'generatedAt');

    if (JSON.stringify(existingData) === JSON.stringify(newData)) {
      console.log(`\n✅ ${label} data unchanged, skipping write to prevent git churn.`);
      return;
    }
  } catch {
    // Missing or unparseable — fall through to write.
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`\n✅ Generated ${label}`);
}

async function main() {
  console.log('🔍 Scanning ESLint plugin packages...\n');
  
  const packages = readdirSync(PACKAGES_DIR)
    .filter(name => name.startsWith('eslint-plugin-'))
    .map(name => join(PACKAGES_DIR, name));

  const stats = [];
  let totalRules = 0;

  for (const packagePath of packages) {
    const metadata = getPackageMetadata(packagePath);
    if (!metadata) continue;

    // Logic for 'published' status
    let published = true;

    if (metadata.interlace?.docs === true) {
      published = true;
    } else if (metadata.interlace?.docs === false) {
      published = false;
    } else if (metadata.private === true) {
      published = false;
    }

    const ruleCount = countRulesInPackage(packagePath);
    const category = getCategory(metadata.name);
    
    stats.push({
      name: metadata.name,
      rules: ruleCount,
      description: firstSentence(metadata.description),
      category,
      version: metadata.version,
      published,
    });

    if (published) {
      totalRules += ruleCount;
    }
    
    console.log(`  ${published ? '✓' : '◌' } ${metadata.name}: ${ruleCount} rules ${published ? '' : '(unpublished)'}`);
  }

  // Sort by category then by rule count
  stats.sort((a, b) => {
    if (a.category !== b.category) {
      const order = ['security', 'framework', 'architecture', 'quality', 'react'];
      return order.indexOf(a.category) - order.indexOf(b.category);
    }
    return b.rules - a.rules;
  });

  const output = {
    plugins: stats,
    totalRules, // Reflects only published rules for backward compatibility
    totalPlugins: stats.filter(p => p.published).length, // Reflects only published plugins
    allPluginsCount: stats.length,
    generatedAt: new Date().toISOString(),
  };

  const numbers = buildNumbersManifest(stats, output.generatedAt);

  // Ensure output directory exists
  const outputDir = dirname(OUTPUT_FILE);
  if (!existsSync(outputDir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(outputDir, { recursive: true });
  }

  writeIfChanged(OUTPUT_FILE, 'plugin-stats.json', output);
  writeIfChanged(NUMBERS_FILE, 'interlace-numbers.json', numbers);
  console.log(`   Published: ${totalRules} rules across ${output.totalPlugins} plugins`);
  console.log(`   Total (incl. unpublished): ${stats.reduce((acc, p) => acc + p.rules, 0)} rules across ${stats.length} plugins`);
}



if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
