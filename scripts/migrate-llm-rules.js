#!/usr/bin/env node

/**
 * Migration Script: Move LLM Rules to Agentic Security
 * 
 * This script migrates all 17 LLM/Agentic-specific rules from 
 * eslint-plugin-secure-coding to eslint-plugin-agentic-security
 */

const fs = require('fs');
const path = require('path');

// Rules to migrate (from eslint-plugin-secure-coding)
const LLM_RULES = {
  'LLM01: Prompt Injection': [
    'no-unsafe-prompt-concatenation',
    'require-prompt-template-parameterization',
    'no-dynamic-system-prompts',
    'detect-indirect-prompt-injection-vectors',
    'require-input-sanitization-for-llm',
    'detect-rag-injection-risks',
    'no-user-controlled-prompt-instructions',
  ],
  'LLM05: Improper Output Handling': [
    'no-direct-llm-output-execution',
    'require-llm-output-encoding',
    'detect-llm-generated-sql',
  ],
  'LLM06: Excessive Agency': [
    'enforce-llm-tool-least-privilege',
    'require-human-approval-for-critical-actions',
    'detect-llm-unrestricted-tool-access',
  ],
  'LLM10: Unbounded Consumption': [
    'require-llm-rate-limiting',
    'require-llm-token-budget',
    'detect-llm-infinite-loops',
  ],
};

const SOURCE_PKG = path.join(__dirname, '../packages/eslint-plugin-secure-coding');
const TARGET_PKG = path.join(__dirname, '../packages/eslint-plugin-agentic-security');

function getAllRules() {
  const allRules = [];
  for (const category in LLM_RULES) {
    allRules.push(...LLM_RULES[category]);
  }
  return allRules;
}

function moveRuleDirectory(ruleName) {
  const sourcePath = path.join(SOURCE_PKG, 'src/rules', ruleName);
  const targetPath = path.join(TARGET_PKG, 'src/rules', ruleName);

  if (!fs.existsSync(sourcePath)) {
    console.warn(`⚠️  Rule directory not found: ${ruleName}`);
    return false;
  }

  // Create target rules directory if it doesn't exist
  if (!fs.existsSync(path.join(TARGET_PKG, 'src/rules'))) {
    fs.mkdirSync(path.join(TARGET_PKG, 'src/rules'), { recursive: true });
  }

  // Copy directory
  copyRecursiveSync(sourcePath, targetPath);
  console.log(`✅ Copied: ${ruleName}`);

  return true;
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function updateAgenticSecurityIndex() {
  const allRules = getAllRules();
  
  // Generate imports
  const imports = allRules.map(ruleName => {
    const camelCase = ruleName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    return `import { ${camelCase} } from './rules/${ruleName}';`;
  }).join('\n');

  // Generate rule exports
  const ruleExports = allRules.map(ruleName => {
    const camelCase = ruleName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    return `  '${ruleName}': ${camelCase},`;
  }).join('\n');

  // Generate recommended config
  const recommendedRules = allRules.map(ruleName => {
    return `  'agentic-security/${ruleName}': 'error',`;
  }).join('\n');

  const indexContent = `/**
 * eslint-plugin-agentic-security
 * 
 * A comprehensive agentic AI security-focused ESLint plugin
 * for detecting and preventing vulnerabilities in AI agent applications.
 * 
 * Features:
 * - LLM-optimized error messages with CWE references
 * - OWASP Agentic Top 10 2026 coverage
 * - OWASP LLM Top 10 2025 coverage
 * - Auto-fix capabilities where safe
 * - Structured context for AI assistants
 * 
 * @see https://github.com/ofri-peretz/eslint#readme
 */

import type { TSESLint } from '@interlace/eslint-devkit';

// LLM01: Prompt Injection (7 rules)
${imports.split('\n').slice(0, 7).join('\n')}

// LLM05: Improper Output Handling (3 rules)
${imports.split('\n').slice(7, 10).join('\n')}

// LLM06: Excessive Agency (3 rules)
${imports.split('\n').slice(10, 13).join('\n')}

// LLM10: Unbounded Consumption (4 rules)
${imports.split('\n').slice(13).join('\n')}

/**
 * Collection of all agentic security ESLint rules
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // LLM01: Prompt Injection (7 rules)
${ruleExports.split('\n').slice(0, 7).join('\n')}

  // LLM05: Improper Output Handling (3 rules)
${ruleExports.split('\n').slice(7, 10).join('\n')}

  // LLM06: Excessive Agency (3 rules)
${ruleExports.split('\n').slice(10, 13).join('\n')}

  // LLM10: Unbounded Consumption (4 rules)
${ruleExports.split('\n').slice(13).join('\n')}
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint Plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-agentic-security',
    version: '1.0.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Preset configurations for agentic security rules
 */
const recommendedRules: Record<string, TSESLint.FlatConfig.RuleEntry> = {
${recommendedRules}
};

export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /**
   * Recommended agentic security configuration
   * 
   * Enables all agentic security rules with sensible severity levels
   */
  recommended: {
    plugins: {
      'agentic-security': plugin,
    },
    rules: recommendedRules,
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * Strict agentic security configuration
   * 
   * All agentic security rules set to 'error' for maximum protection
   */
  strict: {
    plugins: {
      'agentic-security': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map(ruleName => [\`agentic-security/\${ruleName}\`, 'error'])
    ),
  } satisfies TSESLint.FlatConfig.Config,

  /**
   * OWASP LLM Top 10 2025 focused configuration
   */
  'owasp-llm-2025': {
    plugins: {
      'agentic-security': plugin,
    },
    rules: recommendedRules,
  } satisfies TSESLint.FlatConfig.Config,
};

/**
 * Default export for ESLint plugin
 */
export default plugin;

// Re-export types (to be implemented)
export type {} from './types/index';
`;

  const indexPath = path.join(TARGET_PKG, 'src/index.ts');
  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ Updated agentic-security index.ts');
}

function updateSecureCodingIndex() {
  const indexPath = path.join(SOURCE_PKG, 'src/index.ts');
  let content = fs.readFileSync(indexPath, 'utf8');

  // Remove LLM imports (lines 91-114 approximately)
  const llmImportPattern = /\/\/ OWASP LLM Top 10 2025 - LLM Security Rules[\s\S]*?import { detectLlmInfiniteLoops }[^\n]*\n/;
  content = content.replace(llmImportPattern, '');

  // Remove LLM rule exports (lines 231-254 approximately)
  const llmExportPattern = /\s*\/\/ OWASP LLM Top 10 2025 rules \(17 rules\)[\s\S]*?'detect-llm-infinite-loops': detectLlmInfiniteLoops,\n/;
  content = content.replace(llmExportPattern, '\n');

  fs.writeFileSync(indexPath, content);
  console.log('✅ Updated secure-coding index.ts (removed LLM imports and exports)');
}

function removeRuleDirectories() {
  const allRules = getAllRules();
  
  for (const ruleName of allRules) {
    const rulePath = path.join(SOURCE_PKG, 'src/rules', ruleName);
    if (fs.existsSync(rulePath)) {
      fs.rmSync(rulePath, { recursive: true, force: true });
      console.log(`🗑️  Removed: ${ruleName}`);
    }
  }
}

function updateREADME() {
  const readmePath = path.join(SOURCE_PKG, 'README.md');
  let content = fs.readFileSync(readmePath, 'utf8');

  // Remove LLM section
  const llmSectionPattern = /### OWASP LLM Top 10 2025 \(5 rules\) 🆕[\s\S]*?\*\*Coverage\*\*:[^\n]*\n\n/;
  content = content.replace(llmSectionPattern, '');

  // Update rule counts
  content = content.replace(/53\+ rules/g, '78 rules');
  content = content.replace(/48\+ rules/g, '78 rules');
  content = content.replace(/45\+ rules/g, '78 rules');

  fs.writeFileSync(readmePath, content);
  console.log('✅ Updated README.md (removed LLM section, updated counts)');
}

// Main execution
console.log('🚀 Starting LLM Rule Migration\n');
console.log('Moving 17 rules from eslint-plugin-secure-coding to eslint-plugin-agentic-security\n');

const allRules = getAllRules();
console.log(`Rules to migrate: ${allRules.length}\n`);

// Step 1: Copy rule directories
console.log('📁 Step 1: Copying rule directories...');
for (const ruleName of allRules) {
  moveRuleDirectory(ruleName);
}
console.log('');

// Step 2: Update agentic-security index.ts
console.log('📝 Step 2: Updating agentic-security package...');
updateAgenticSecurityIndex();
console.log('');

// Step 3: Update secure-coding index.ts
console.log('📝 Step 3: Updating secure-coding package...');
updateSecureCodingIndex();
console.log('');

// Step 4: Remove rule directories from secure-coding
console.log('🗑️  Step 4: Removing rule directories from secure-coding...');
removeRuleDirectories();
console.log('');

// Step 5: Update README
console.log('📄 Step 5: Updating documentation...');
updateREADME();
console.log('');

console.log('✅ Migration complete!');
console.log('\nNext steps:');
console.log('1. Review changes in both packages');
console.log('2. Build both packages: npm run build');
console.log('3. Test both packages: npm test');
console.log('4. Update CHANGELOG.md in both packages');
console.log('5. Commit changes');
