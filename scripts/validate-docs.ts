#!/usr/bin/env node

/**
 * Validate Documentation Script
 *
 * Enforces documentation standards across all ESLint plugins.
 * Designed to run in CI to block PRs with non-compliant docs.
 *
 * Checks:
 * 1. Mandatory sections exist (Overview, Rules, License)
 * 2. LICENSE file exists and matches MIT template
 * 3. Copyright footer is present
 * 4. Auto-generated blocks are properly delimited
 * 5. Rules table is in sync with source code (if delimiters exist)
 *
 * Usage: pnpm tsx scripts/validate-docs.ts [--plugin <name>] [--fix]
 *
 * Exit codes:
 *   0 = All checks pass
 *   1 = Validation errors
 */

import * as fs from 'node:fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const ROOT_DIR = path.join(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

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

// MIT License template (first line must match exactly)
const MIT_LICENSE_HEADER = 'MIT License';
const MIT_COPYRIGHT_PATTERN = /Copyright \(c\) \d{4} Ofri Peretz/;

// Mandatory sections (regex patterns)
const MANDATORY_SECTIONS = [
  { name: 'Title', pattern: /^#\s+eslint-plugin-/m },
  { name: 'Rules Section', pattern: /##\s+.*Rules/i },
  { name: 'License Section', pattern: /##\s+.*License/i },
];

// ============================================================================
// Types
// ============================================================================

interface ValidationError {
  plugin: string;
  file: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  plugin: string;
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate README.md for a plugin
 */
function validateReadme(pluginName: string, pluginPath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const readmePath = path.join(pluginPath, 'README.md');

  if (!fs.existsSync(readmePath)) {
    errors.push({
      plugin: pluginName,
      file: 'README.md',
      message: 'README.md file is missing',
      severity: 'error',
    });
    return errors;
  }

  const content = fs.readFileSync(readmePath, 'utf-8');

  // Check mandatory sections
  for (const section of MANDATORY_SECTIONS) {
    if (!section.pattern.test(content)) {
      errors.push({
        plugin: pluginName,
        file: 'README.md',
        message: `Missing mandatory section: ${section.name}`,
        severity: 'error',
      });
    }
  }

  // Check for properly closed delimiters
  const hasRulesStart = content.includes(RULES_TABLE_START);
  const hasRulesEnd = content.includes(RULES_TABLE_END);

  if (hasRulesStart && !hasRulesEnd) {
    errors.push({
      plugin: pluginName,
      file: 'README.md',
      message: 'RULES_TABLE block is not properly closed (missing END delimiter)',
      severity: 'error',
    });
  }

  if (!hasRulesStart && hasRulesEnd) {
    errors.push({
      plugin: pluginName,
      file: 'README.md',
      message: 'RULES_TABLE block is not properly opened (missing START delimiter)',
      severity: 'error',
    });
  }

  // Check block order (START must come before END)
  if (hasRulesStart && hasRulesEnd) {
    const startIdx = content.indexOf(RULES_TABLE_START);
    const endIdx = content.indexOf(RULES_TABLE_END);
    if (startIdx > endIdx) {
      errors.push({
        plugin: pluginName,
        file: 'README.md',
        message: 'RULES_TABLE delimiters are in wrong order (START after END)',
        severity: 'error',
      });
    }
  }

  // Check for license footer
  const hasLicenseFooter =
    content.includes('MIT ©') ||
    content.includes('MIT License') ||
    /©\s*\d{4}.*Ofri Peretz/.test(content);

  if (!hasLicenseFooter) {
    errors.push({
      plugin: pluginName,
      file: 'README.md',
      message: 'Missing copyright/license footer',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Validate LICENSE file for a plugin
 */
function validateLicense(pluginName: string, pluginPath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const licensePath = path.join(pluginPath, 'LICENSE');

  if (!fs.existsSync(licensePath)) {
    errors.push({
      plugin: pluginName,
      file: 'LICENSE',
      message: 'LICENSE file is missing',
      severity: 'error',
    });
    return errors;
  }

  const content = fs.readFileSync(licensePath, 'utf-8');

  // Check MIT header
  if (!content.startsWith(MIT_LICENSE_HEADER)) {
    errors.push({
      plugin: pluginName,
      file: 'LICENSE',
      message: `LICENSE must start with "${MIT_LICENSE_HEADER}"`,
      severity: 'error',
    });
  }

  // Check copyright line
  if (!MIT_COPYRIGHT_PATTERN.test(content)) {
    errors.push({
      plugin: pluginName,
      file: 'LICENSE',
      message: 'LICENSE missing valid copyright line (Copyright (c) YYYY Ofri Peretz)',
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate rules sync (if delimiters exist)
 */
function validateRulesSync(pluginName: string, pluginPath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const readmePath = path.join(pluginPath, 'README.md');
  const indexPath = path.join(pluginPath, 'src', 'index.ts');

  if (!fs.existsSync(readmePath) || !fs.existsSync(indexPath)) {
    return errors;
  }

  const readmeContent = fs.readFileSync(readmePath, 'utf-8');

  // Only validate if delimiters exist
  if (!readmeContent.includes(RULES_TABLE_START)) {
    return errors;
  }

  // Extract rules from index.ts
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  const rulePattern = /['"]([a-z][a-z0-9-]*)['"]:\s*\w+/g;
  const matches = indexContent.matchAll(rulePattern);
  const sourceRules = new Set<string>();

  for (const match of matches) {
    sourceRules.add(match[1]);
  }

  // Extract rules from README table
  const tableRulePattern = /\[([a-z][a-z0-9-]*)\]\(docs\/rules\//g;
  const tableMatches = readmeContent.matchAll(tableRulePattern);
  const tableRules = new Set<string>();

  for (const match of tableMatches) {
    tableRules.add(match[1]);
  }

  // Check for missing rules in table
  for (const rule of sourceRules) {
    if (!tableRules.has(rule)) {
      errors.push({
        plugin: pluginName,
        file: 'README.md',
        message: `Rule "${rule}" exists in source but missing from Rules Table`,
        severity: 'warning',
      });
    }
  }

  // Check for extra rules in table (not in source)
  for (const rule of tableRules) {
    if (!sourceRules.has(rule)) {
      errors.push({
        plugin: pluginName,
        file: 'README.md',
        message: `Rule "${rule}" in Rules Table but not found in source`,
        severity: 'warning',
      });
    }
  }

  return errors;
}

/**
 * Validate CHANGELOG.md follows Keep a Changelog format
 */
function validateChangelog(pluginName: string, pluginPath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const changelogPath = path.join(pluginPath, 'CHANGELOG.md');

  if (!fs.existsSync(changelogPath)) {
    errors.push({
      plugin: pluginName,
      file: 'CHANGELOG.md',
      message: 'CHANGELOG.md file is missing',
      severity: 'warning',
    });
    return errors;
  }

  const content = fs.readFileSync(changelogPath, 'utf-8');

  // Check for Keep a Changelog format indicators
  if (!content.includes('# Changelog') && !content.includes('# CHANGELOG')) {
    errors.push({
      plugin: pluginName,
      file: 'CHANGELOG.md',
      message: 'CHANGELOG.md should start with "# Changelog"',
      severity: 'warning',
    });
  }

  // Check for at least one version entry
  if (!/##\s+\[?\d+\.\d+\.\d+\]?/.test(content)) {
    errors.push({
      plugin: pluginName,
      file: 'CHANGELOG.md',
      message: 'CHANGELOG.md should have at least one version entry (## [x.y.z])',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Validate AGENTS.md exists with required sections
 */
function validateAgentsMd(pluginName: string, pluginPath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const agentsPath = path.join(pluginPath, 'AGENTS.md');

  if (!fs.existsSync(agentsPath)) {
    errors.push({
      plugin: pluginName,
      file: 'AGENTS.md',
      message: 'AGENTS.md file recommended for AI agent context',
      severity: 'warning',
    });
    return errors;
  }

  const content = fs.readFileSync(agentsPath, 'utf-8');

  // Check for key sections
  const requiredSections = [
    { name: 'Setup Commands', pattern: /##\s+.*Setup.*Commands/i },
    { name: 'Testing Instructions', pattern: /##\s+.*Test/i },
  ];

  for (const section of requiredSections) {
    if (!section.pattern.test(content)) {
      errors.push({
        plugin: pluginName,
        file: 'AGENTS.md',
        message: `AGENTS.md missing section: ${section.name}`,
        severity: 'warning',
      });
    }
  }

  return errors;
}

/**
 * Validate a single plugin
 */
function validatePlugin(pluginName: string): ValidationResult {
  const pluginPath = path.join(PACKAGES_DIR, pluginName);
  const allErrors: ValidationError[] = [];

  // Run all validators
  allErrors.push(...validateReadme(pluginName, pluginPath));
  allErrors.push(...validateLicense(pluginName, pluginPath));
  allErrors.push(...validateRulesSync(pluginName, pluginPath));
  allErrors.push(...validateChangelog(pluginName, pluginPath));
  allErrors.push(...validateAgentsMd(pluginName, pluginPath));

  const errors = allErrors.filter((e) => e.severity === 'error');
  const warnings = allErrors.filter((e) => e.severity === 'warning');

  return {
    plugin: pluginName,
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// CLI
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);
  const pluginIdx = args.indexOf('--plugin');
  const singlePlugin = pluginIdx !== -1 ? args[pluginIdx + 1] : null;

  console.log('📋 Documentation Validation\n');
  console.log('='.repeat(60));

  const pluginsToProcess = singlePlugin ? [singlePlugin] : PLUGIN_NAMES;
  const results: ValidationResult[] = [];

  for (const pluginName of pluginsToProcess) {
    const pluginPath = path.join(PACKAGES_DIR, pluginName);

    if (!fs.existsSync(pluginPath)) {
      console.log(`⏭️  Skipping ${pluginName} - not found`);
      continue;
    }

    console.log(`\n📦 ${pluginName}`);
    const result = validatePlugin(pluginName);
    results.push(result);

    if (result.passed && result.warnings.length === 0) {
      console.log('   ✅ All checks passed');
    } else {
      for (const error of result.errors) {
        console.log(`   ❌ ${error.file}: ${error.message}`);
      }
      for (const warning of result.warnings) {
        console.log(`   ⚠️  ${warning.file}: ${warning.message}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  console.log(`   Passed: ${passed}/${results.length}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   Warnings: ${totalWarnings}`);

  if (failed > 0) {
    console.log(`\n❌ ${failed} plugin(s) failed validation`);
    console.log(`   Run 'nx run sync-docs' to fix auto-generated sections.`);
    process.exit(1);
  } else {
    console.log('\n✅ All plugins passed validation');
    process.exit(0);
  }
}

main();
