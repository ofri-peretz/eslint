#!/usr/bin/env node

/**
 * Sync README Rules Script
 *
 * Reads rule metadata from plugin source code and docs, then auto-generates
 * the Rules Table in each plugin's README.md.
 *
 * Features:
 * - Parses `src/index.ts` to extract exported rules
 * - Reads `docs/rules/*.md` to extract CWE, OWASP, and description metadata
 * - Generates high-density Rules Table with consistent format
 * - Uses block delimiters to preserve user content
 * - Repair mode scaffolds missing sections
 *
 * Usage: npx tsx scripts/sync-readme-rules.ts [--dry-run] [--plugin <name>]
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const ROOT_DIR = path.join(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

// Plugins to process
const PLUGIN_NAMES = [
  'eslint-plugin-secure-coding',
  'eslint-plugin-pg',
  'eslint-plugin-jwt',
  'eslint-plugin-crypto',
  'eslint-plugin-express-security',
  'eslint-plugin-nestjs-security',
  'eslint-plugin-lambda-security',
  'eslint-plugin-browser-security',
  'eslint-plugin-mongodb-security',
  'eslint-plugin-vercel-ai-security',
  'eslint-plugin-import-next',
];

// Block delimiters
const RULES_TABLE_START = '<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->';
const RULES_TABLE_END = '<!-- AUTO-GENERATED:RULES_TABLE:END -->';
const LICENSE_START = '<!-- AUTO-GENERATED:LICENSE:START -->';
const LICENSE_END = '<!-- AUTO-GENERATED:LICENSE:END -->';

// Copyright template
const COPYRIGHT_TEMPLATE = `MIT © [Ofri Peretz](https://github.com/ofri-peretz)

© 2025 Ofri Peretz. All rights reserved.`;

// ============================================================================
// Types
// ============================================================================

interface RuleMetadata {
  name: string;
  description: string;
  cwe: string;
  owasp: string;
  inRecommended: boolean;
  hasAutofix: boolean;
  hasSuggestions: boolean;
}

interface PluginRules {
  pluginName: string;
  shortName: string;
  rules: RuleMetadata[];
}

// ============================================================================
// Rule Extraction
// ============================================================================

/**
 * Extract rule names from plugin's src/index.ts
 */
function extractRuleNamesFromIndex(pluginPath: string): string[] {
  const indexPath = path.join(pluginPath, 'src', 'index.ts');

  if (!fs.existsSync(indexPath)) {
    console.warn(`  ⚠️  No src/index.ts found`);
    return [];
  }

  const content = fs.readFileSync(indexPath, 'utf-8');

  // Match rule entries in the rules object
  // Pattern: 'rule-name': ruleName, or "rule-name": ruleName,
  const rulePattern = /['"]([a-z][a-z0-9-]*)['"]:\s*\w+/g;
  const matches = content.matchAll(rulePattern);

  const ruleNames: string[] = [];
  for (const match of matches) {
    ruleNames.push(match[1]);
  }

  // Deduplicate
  return [...new Set(ruleNames)];
}

/**
 * Extract metadata from a rule's documentation file
 */
function extractRuleMetadata(
  pluginPath: string,
  ruleName: string,
  shortName: string
): RuleMetadata | null {
  const docPath = path.join(pluginPath, 'docs', 'rules', `${ruleName}.md`);

  const metadata: RuleMetadata = {
    name: ruleName,
    description: '',
    cwe: '',
    owasp: '',
    inRecommended: true, // Default to true, can be refined
    hasAutofix: false,
    hasSuggestions: true, // Most rules have suggestions
  };

  if (!fs.existsSync(docPath)) {
    // No doc file, return basic metadata
    return metadata;
  }

  const content = fs.readFileSync(docPath, 'utf-8');

  // Extract CWE
  const cweMatch = content.match(/CWE[:\s-]*(\d+)/i);
  if (cweMatch) {
    metadata.cwe = `CWE-${cweMatch[1]}`;
  }

  // Extract OWASP
  const owaspMatch = content.match(/(A\d{2}:\d{4})/);
  if (owaspMatch) {
    metadata.owasp = owaspMatch[1];
  }

  // Extract description from first paragraph after title
  const lines = content.split('\n');
  let inDescription = false;
  for (const line of lines) {
    const trimmed = line.trim();

    // Skip title
    if (trimmed.startsWith('# ')) continue;

    // Start capturing after Description header or first non-empty line
    if (trimmed === '## Description') {
      inDescription = true;
      continue;
    }

    if (inDescription && trimmed && !trimmed.startsWith('#')) {
      metadata.description = trimmed
        .replace(/TODO:.*$/, '')
        .replace(/\*\*/g, '')
        .slice(0, 100);
      break;
    }

    // Fallback: first non-header, non-empty line
    if (!trimmed.startsWith('#') && trimmed && !metadata.description) {
      metadata.description = trimmed.slice(0, 100);
    }
  }

  // Check for autofix indicator
  if (content.includes('🔧') || content.toLowerCase().includes('auto-fix')) {
    metadata.hasAutofix = true;
  }

  return metadata;
}

/**
 * Extract all rules from a plugin
 */
function extractPluginRules(pluginName: string): PluginRules | null {
  const pluginPath = path.join(PACKAGES_DIR, pluginName);

  if (!fs.existsSync(pluginPath)) {
    console.warn(`  ⚠️  Plugin ${pluginName} not found`);
    return null;
  }

  // Short name for rule prefixes (e.g., "crypto" from "eslint-plugin-crypto")
  const shortName = pluginName.replace('eslint-plugin-', '');

  console.log(`📦 Processing ${pluginName}`);

  const ruleNames = extractRuleNamesFromIndex(pluginPath);
  console.log(`  Found ${ruleNames.length} rules in index`);

  const rules: RuleMetadata[] = [];

  for (const ruleName of ruleNames) {
    const metadata = extractRuleMetadata(pluginPath, ruleName, shortName);
    if (metadata) {
      rules.push(metadata);
    }
  }

  return {
    pluginName,
    shortName,
    rules,
  };
}

// ============================================================================
// Table Generation
// ============================================================================

/**
 * Generate Rules Table markdown
 */
function generateRulesTable(pluginRules: PluginRules): string {
  const { rules } = pluginRules;

  if (rules.length === 0) {
    return '(No rules found)';
  }

  // Table header
  const lines: string[] = [
    '| Rule | CWE | OWASP | Description | 💼 | 🔧 | 💡 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  // Sort rules alphabetically
  const sortedRules = [...rules].sort((a, b) => a.name.localeCompare(b.name));

  for (const rule of sortedRules) {
    const ruleLink = `[${rule.name}](docs/rules/${rule.name}.md)`;
    const cwe = rule.cwe || '-';
    const owasp = rule.owasp || '-';
    const desc = rule.description || '-';
    const recommended = rule.inRecommended ? '💼' : '';
    const autofix = rule.hasAutofix ? '🔧' : '';
    const suggestions = rule.hasSuggestions ? '💡' : '';

    lines.push(
      `| ${ruleLink} | ${cwe} | ${owasp} | ${desc} | ${recommended} | ${autofix} | ${suggestions} |`
    );
  }

  return lines.join('\n');
}

// ============================================================================
// README Update
// ============================================================================

/**
 * Update README with generated content
 */
function updateReadme(pluginPath: string, pluginRules: PluginRules, dryRun: boolean): boolean {
  const readmePath = path.join(pluginPath, 'README.md');

  if (!fs.existsSync(readmePath)) {
    console.warn(`  ⚠️  No README.md found`);
    return false;
  }

  let content = fs.readFileSync(readmePath, 'utf-8');
  let modified = false;

  // Generate new rules table
  const rulesTable = generateRulesTable(pluginRules);

  // Check if delimiters exist
  const hasRulesDelimiters =
    content.includes(RULES_TABLE_START) && content.includes(RULES_TABLE_END);

  if (hasRulesDelimiters) {
    // Replace content between delimiters
    const startIdx = content.indexOf(RULES_TABLE_START) + RULES_TABLE_START.length;
    const endIdx = content.indexOf(RULES_TABLE_END);

    if (startIdx < endIdx) {
      const before = content.slice(0, startIdx);
      const after = content.slice(endIdx);
      content = `${before}\n${rulesTable}\n${after}`;
      modified = true;
      console.log(`  ✅ Updated Rules Table (${pluginRules.rules.length} rules)`);
    }
  } else {
    console.log(`  ℹ️  No Rules Table delimiters found - skipping auto-generation`);
    console.log(`     Add these markers to enable auto-generation:`);
    console.log(`     ${RULES_TABLE_START}`);
    console.log(`     ${RULES_TABLE_END}`);
  }

  // Check for License delimiter
  const hasLicenseDelimiters = content.includes(LICENSE_START) && content.includes(LICENSE_END);

  if (hasLicenseDelimiters) {
    const startIdx = content.indexOf(LICENSE_START) + LICENSE_START.length;
    const endIdx = content.indexOf(LICENSE_END);

    if (startIdx < endIdx) {
      const before = content.slice(0, startIdx);
      const after = content.slice(endIdx);
      content = `${before}\n${COPYRIGHT_TEMPLATE}\n${after}`;
      modified = true;
      console.log(`  ✅ Updated License footer`);
    }
  }

  // Write back
  if (modified && !dryRun) {
    fs.writeFileSync(readmePath, content);
    console.log(`  💾 Saved README.md`);
  } else if (modified && dryRun) {
    console.log(`  🔍 DRY RUN - would update README.md`);
  }

  return modified;
}

// ============================================================================
// CLI
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const pluginIdx = args.indexOf('--plugin');
  const singlePlugin = pluginIdx !== -1 ? args[pluginIdx + 1] : null;

  console.log('🔄 Sync README Rules Tables\n');

  if (dryRun) {
    console.log('📋 DRY RUN MODE - no files will be modified\n');
  }

  const pluginsToProcess = singlePlugin ? [singlePlugin] : PLUGIN_NAMES;

  let processed = 0;
  let updated = 0;

  for (const pluginName of pluginsToProcess) {
    const pluginPath = path.join(PACKAGES_DIR, pluginName);

    if (!fs.existsSync(pluginPath)) {
      console.log(`⏭️  Skipping ${pluginName} - not found`);
      continue;
    }

    const pluginRules = extractPluginRules(pluginName);

    if (pluginRules) {
      const wasUpdated = updateReadme(pluginPath, pluginRules, dryRun);
      processed++;
      if (wasUpdated) updated++;
    }

    console.log();
  }

  console.log('='.repeat(50));
  console.log(`✨ Processed ${processed} plugins, updated ${updated}`);

  if (!dryRun) {
    console.log(`\nRun 'nx run lint-docs' to validate documentation.`);
  }
}

main();
