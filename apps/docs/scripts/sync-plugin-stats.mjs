#!/usr/bin/env node
/**
 * Sync Plugin Stats Script
 * 
 * Scans all ESLint plugin packages and counts their rules.
 * Outputs to a JSON file for consumption by the docs site.
 * 
 * Run: node scripts/sync-plugin-stats.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = join(__dirname, '../../../packages');
const OUTPUT_FILE = join(__dirname, '../src/data/plugin-stats.json');

/**
 * Count rules by parsing the rules export in index.ts
 */
export function countRulesInPackage(packagePath) {
  const indexPath = join(packagePath, 'src/index.ts');
  
  if (!existsSync(indexPath)) {
    return 0;
  }

  const content = readFileSync(indexPath, 'utf-8');
  
  // Match rule entries like "'rule-name': ruleName,"
  const ruleMatches = content.match(/^\s+'[a-z-]+'\s*:/gm);
  return ruleMatches ? ruleMatches.length : 0;
}

export function getPackageMetadata(packagePath) {
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
  };
}

export function getCategory(packageName) {
  if (packageName.includes('express') || 
      packageName.includes('nestjs') || 
      packageName.includes('lambda')) {
    return 'framework';
  }
  if (packageName.includes('import-next') || 
      packageName.includes('architecture')) {
    return 'architecture';
  }
  if (packageName.includes('quality')) {
    return 'quality';
  }
  if (packageName.includes('react')) {
    return 'react';
  }
  return 'security';
}

async function main() {
  console.log('🔍 Scanning ESLint plugin packages...\n');
  
  const packages = readdirSync(PACKAGES_DIR)
    .filter(name => name.startsWith('eslint-plugin-'))
    .map(name => join(PACKAGES_DIR, name));

  const stats = [];
  let totalRules = 0;

  const UNPUBLISHED_PLUGINS = [
    'eslint-plugin-react-features',
    'eslint-plugin-architecture', 
    'eslint-plugin-react-a11y',
    'eslint-plugin-quality'
  ];

  for (const packagePath of packages) {
    const metadata = getPackageMetadata(packagePath);
    if (!metadata) continue;
    if (metadata.private === true) continue;
    if (UNPUBLISHED_PLUGINS.includes(metadata.name)) continue;

    const ruleCount = countRulesInPackage(packagePath);
    const category = getCategory(metadata.name);
    
    stats.push({
      name: metadata.name,
      rules: ruleCount,
      description: metadata.description?.split('.')[0] || '',
      category,
      version: metadata.version,
    });

    totalRules += ruleCount;
    console.log(`  ✓ ${metadata.name}: ${ruleCount} rules`);

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
    totalRules,
    totalPlugins: stats.length,
    generatedAt: new Date().toISOString(),
  };

  // Ensure output directory exists
  const outputDir = dirname(OUTPUT_FILE);
  if (!existsSync(outputDir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\n✅ Generated plugin-stats.json`);
  console.log(`   Total: ${totalRules} rules across ${stats.length} plugins`);
}

export { countRulesInPackage, getPackageMetadata, getCategory };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
