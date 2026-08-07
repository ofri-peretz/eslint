#!/usr/bin/env -S npx tsx
/**
 * Sync Plugin Stats Script
 * 
 * Scans all ESLint plugin packages and counts their rules.
 * Outputs to a JSON file for consumption by the docs site.
 * 
 * Run: tsx scripts/sync-plugin-stats.ts
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeJsonIfChanged } from './lib/write-json-if-changed.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGES_DIR = join(__dirname, '../../../packages');
const OUTPUT_FILE = join(__dirname, '../src/data/plugin-stats.json');
const NUMBERS_FILE = join(__dirname, '../src/data/interlace-numbers.json');

/**
 * The body of the `rules` object literal in a plugin's `index.ts`.
 *
 * Scoping the count to this block is the whole point. The previous version
 * matched `/^\s+'[a-z-]+'\s*:/gm` against the *entire file*, which also matched
 * the `plugins: { 'mcp-sdk-security': plugin }` line inside every preset — so
 * each plugin was over-counted by roughly one per config it ships, plus any
 * other quoted-kebab key anywhere in the file.
 *
 * That inflated 21 of 30 published plugins by 68 rules in total, and the
 * numbers flow from here into `interlace-numbers.json`, the docs site, and
 * every README badge. A public rule count that overstates by ~14% is worse
 * than no count.
 *
 * Returns `undefined` when the block cannot be located, so the caller can fail
 * loudly rather than silently report zero.
 */
export function rulesBlock(content: string): string | undefined {
  // `\b` and an explicit optional type annotation: without them,
  // `export const rulesHelper = {` appearing earlier in the file would capture
  // the wrong block and return a confident wrong number.
  const start = content.search(/\bexport\s+const\s+rules\b\s*(?::[^=]*)?=\s*\{/);
  if (start === -1) return undefined;
  const open = content.indexOf('{', start);

  // Brace-match rather than regex: a rule map contains nested objects in some
  // plugins, and a lazy `[\s\S]*?\}` would stop at the first inner brace.
  let depth = 0;
  for (let i = open; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) return content.slice(open + 1, i);
    }
  }
  return undefined;
}

/**
 * Top-level keys of a `rules` object body.
 *
 * Both spellings are in use across the ecosystem and both are real rule ids:
 * most plugins quote them (`'no-unsafe-query': …`) because the names contain
 * hyphens, while `eslint-plugin-import-next` does not (`named: named,`,
 * `default: defaultRule,`). Matching only the quoted form silently undercounted
 * that plugin by 7.
 *
 * Depth-aware so a nested object inside a rule entry cannot contribute keys of
 * its own.
 */
export function countRuleKeys(block: string): number {
  let depth = 0;
  // An alias is the same rule object under a second id — `order:
  // enforceImportOrder` alongside `'enforce-import-order': enforceImportOrder`.
  // It is not an additional rule, and the oxlint shim generator already counts
  // it that way ("12 flat + 12 aliased").
  //
  // Only a *bare identifier* value can be an alias. A call is a distinct rule
  // even when two entries use the same factory:
  //
  //     'rule-a': makeRule({ foo: 1 }),
  //     'rule-b': makeRule({ bar: 2 }),
  //
  // Deduplicating on the callee name would collapse those to one, so
  // call-valued entries are counted individually and never deduplicated.
  const aliasable = new Set<string>();
  let distinct = 0;
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trim();
    if (depth === 0) {
      const entry = /^(?:'[a-z0-9-]+'|[A-Za-z_$][\w$]*)\s*:\s*(.*)$/.exec(line);
      if (entry) {
        // Strip a trailing line comment before classifying. The one real alias
        // in the ecosystem carries one — `order: enforceImportOrder, // Alias
        // for backwards compat` — and leaving it attached made the value look
        // like an expression rather than a bare identifier.
        const value = entry[1].replace(/\/\/.*$/, '').trim();
        const bareIdentifier = /^([A-Za-z_$][\w$]*)\s*,?$/.exec(value);
        if (bareIdentifier) aliasable.add(bareIdentifier[1]);
        else distinct++;
      }
    }
    for (const ch of rawLine) {
      if (ch === '{' || ch === '[' || ch === '(') depth++;
      else if (ch === '}' || ch === ']' || ch === ')') depth--;
    }
  }
  return aliasable.size + distinct;
}

/**
 * Count rules by parsing the `rules` export in index.ts.
 *
 * Only top-level keys of that object count.
 */
export function countRulesInPackage(packagePath: string) {
  const indexPath = join(packagePath, 'src/index.ts');

  if (!existsSync(indexPath)) {
    return 0;
  }

  const content = readFileSync(indexPath, 'utf-8');
  const block = rulesBlock(content);
  if (block === undefined) return 0;

  return countRuleKeys(block);
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
 * First sentence of a package description, for the docs plugin cards.
 *
 * Splits on a sentence boundary — a period followed by whitespace or the end
 * of the string — not on any period. Descriptions legitimately contain dotted
 * terms ("Node.js", "Array.at", "process.exit", "3.1x"), and a bare
 * `split('.')[0]` truncated those mid-word: "ESLint plugin for Node".
 */
export function firstSentence(description?: string): string {
  if (!description) return '';
  const end = description.search(/\.(?:\s|$)/);
  return end === -1 ? description : description.slice(0, end);
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
    // Date, not wall-clock. `writeJsonIfChanged` below already suppresses no-op
    // rewrites, but it cannot help when the data legitimately changes on two
    // branches at once: each writes its own millisecond timestamp, and the
    // merge then conflicts on a line carrying no information. Whoever wins
    // that conflict with `--theirs` silently takes the other branch's rule
    // counts too, which is how a 487-rule manifest quietly became 484.
    // Day granularity makes same-day regenerations byte-identical, so the
    // file only conflicts when the actual data disagrees.
    generatedAt: new Date().toISOString().slice(0, 10),
  };

  const numbers = buildNumbersManifest(stats, output.generatedAt);

  // Ensure output directory exists
  const outputDir = dirname(OUTPUT_FILE);
  if (!existsSync(outputDir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(outputDir, { recursive: true });
  }

  writeJsonIfChanged(OUTPUT_FILE, output, 'plugin-stats.json');
  writeJsonIfChanged(NUMBERS_FILE, numbers, 'interlace-numbers.json');
  console.log(`   Published: ${totalRules} rules across ${output.totalPlugins} plugins`);
  console.log(`   Total (incl. unpublished): ${stats.reduce((acc, p) => acc + p.rules, 0)} rules across ${stats.length} plugins`);
}



if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
