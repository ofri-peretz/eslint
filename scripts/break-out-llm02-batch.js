#!/usr/bin/env node

/**
 * Script to break out LLM02 batch rules into individual directories
 * and move them to eslint-plugin-agentic-security
 */

const fs = require('fs');
const path = require('path');

const AGENTIC_PKG = path.join(__dirname, '../packages/eslint-plugin-agentic-security');

// LLM02 rules to extract
const LLM02_RULES = [
  {
    name: 'no-pii-in-llm-training-data',
    exportName: 'noPiiInLlmTrainingData',
    description: 'Detect PII in LLM training data',
    category: 'LLM02: Sensitive Information Disclosure',
  },
  {
    name: 'require-llm-output-redaction',
    exportName: 'requireLlmOutputRedaction',
    description: 'Require redaction of LLM outputs',
    category: 'LLM02: Sensitive Information Disclosure',
  },
  {
    name: 'no-credentials-in-llm-context',
    exportName: 'noCredentialsInLlmContext',
    description: 'Prevent credentials in LLM context',
    category: 'LLM02: Sensitive Information Disclosure',
  },
  {
    name: 'detect-overly-permissive-llm-data-access',
    exportName: 'detectOverlyPermissiveLlmDataAccess',
    description: 'Detect excessive data access for LLM tools',
    category: 'LLM02: Sensitive Information Disclosure',
  },
];

// Source batch file content
const BATCH_FILE = path.join(__dirname, '../packages/eslint-plugin-secure-coding/src/rules/llm02-batch/index.ts');
const batchContent = fs.readFileSync(BATCH_FILE, 'utf8');

// Extract each rule's implementation
const ruleImplementations = {
  'noPiiInLlmTrainingData': batchContent.substring(
    batchContent.indexOf('type MessageIds = '),
    batchContent.indexOf('/**\n * Rule 2:')
  ).trim(),
  
  'requireLlmOutputRedaction': batchContent.substring(
    batchContent.indexOf('type MessageIds2 = '),
    batchContent.indexOf('/**\n * Rule 3:')
  ).trim(),
  
  'noCredentialsInLlmContext': batchContent.substring(
    batchContent.indexOf('type MessageIds3 = '),
    batchContent.indexOf('/**\n * Rule  4:')
  ).trim(),
  
  'detectOverlyPermissiveLlmDataAccess': batchContent.substring(
    batchContent.indexOf('type MessageIds4 = ')
  ).trim(),
};

function createRuleFile(rule) {
  const ruleDir = path.join(AGENTIC_PKG, 'src/rules', rule.name);
  const indexPath = path.join(ruleDir, 'index.ts');

  // Create directory
  if (!fs.existsSync(ruleDir)) {
    fs.mkdirSync(ruleDir, { recursive: true });
  }

  // Get implementation
  const implementation = ruleImplementations[rule.exportName];

  // Create index.ts
  const indexContent = `/**
 * ESLint Rule: ${rule.name}
 * ${rule.description}
 * Part of OWASP LLM Top 10 2025 - ${rule.category}
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons, type SecurityRuleOptions } from '@interlace/eslint-devkit';

${implementation}
`;

  fs.writeFileSync(indexPath, indexContent);
  console.log(`✅ Created: ${rule.name}`);

  // Create basic test file
  createTestFile(rule);
}

function createTestFile(rule) {
  const testPath = path.join(AGENTIC_PKG, 'src/rules', rule.name, `${rule.name}.test.ts`);
  
  const testContent = `/**
 * Tests for ${rule.name}
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { ${rule.exportName} } from './index';

const ruleTester = new RuleTester();

ruleTester.run('${rule.name}', ${rule.exportName}, {
  valid: [
    {
      name: 'valid case - to be implemented',
      code: \`const x = 1;\`,
    },
  ],
  invalid: [
    {
      name: 'invalid case - to be implemented',
      code: \`const x = 1;\`,
      errors: [{ messageId: 'TODO' }],
    },
  ],
});
`;

  fs.writeFileSync(testPath, testContent);
  console.log(`✅ Created test: ${rule.name}.test.ts`);
}

function updateAgenticSecurityIndex() {
  const indexPath = path.join(AGENTIC_PKG, 'src/index.ts');
  let content = fs.readFileSync(indexPath, 'utf8');

  // Find the LLM10 section (last one)
  const llm10Index = content.indexOf('// LLM10: Unbounded Consumption (4 rules)');
  
  // Add LLM02 imports after LLM10
  const llm02Imports = LLM02_RULES.map(rule => 
    `import { ${rule.exportName} } from './rules/${rule.name}';`
  ).join('\n');

  const llm02ImportsSection = `\n\n// LLM02: Sensitive Information Disclosure (4 rules)\n${llm02Imports}\n`;
  
  // Insert after the last LLM10 import
  const lastLlm10Import = content.lastIndexOf('import { detectLlmInfiniteLoops }');
  const afterLlm10Import = content.indexOf('\n', lastLlm10Import) + 1;
  
  content = content.slice(0, afterLlm10Import) + llm02ImportsSection + content.slice(afterLlm10Import);

  // Add LLM02 rule exports
  const llm02Exports = LLM02_RULES.map(rule =>
    `  '${rule.name}': ${rule.exportName},`
  ).join('\n');

  const llm02ExportsSection = `\n  // LLM02: Sensitive Information Disclosure (4 rules)\n${llm02Exports}\n`;
  
  // Find where to insert exports (after LLM10 exports)
  const llm10ExportEnd = content.indexOf("'detect-llm-infinite-loops': detectLlmInfiniteLoops,");
  const afterLlm10Export = content.indexOf('\n', llm10ExportEnd) + 1;
  
  content = content.slice(0, afterLlm10Export) + llm02ExportsSection + content.slice(afterLlm10Export);

  // Add to recommended config
  const llm02RecommendedRules = LLM02_RULES.map(rule =>
    `  'agentic-security/${rule.name}': 'error',`
  ).join('\n');

  const recommendedInsertPoint = content.indexOf("'agentic-security/detect-llm-infinite-loops': 'error',");
  const afterRecommended = content.indexOf('\n', recommendedInsertPoint) + 1;
  
  content = content.slice(0, afterRecommended) + llm02RecommendedRules + '\n' + content.slice(afterRecommended);

  fs.writeFileSync(indexPath, content);
  console.log('✅ Updated agentic-security index.ts');
}

function removeSourceBatchFile() {
  const sourcePath = path.join(__dirname, '../packages/eslint-plugin-secure-coding/src/rules/llm02-batch');
  if (fs.existsSync(sourcePath)) {
    fs.rmSync(sourcePath, { recursive: true, force: true });
    console.log('🗑️  Removed llm02-batch directory from secure-coding');
  }
}

// Main execution
console.log('🚀 Breaking out LLM02 batch rules\n');

console.log('📁 Creating individual rule directories...');
for (const rule of LLM02_RULES) {
  createRuleFile(rule);
}
console.log('');

console.log('📝 Updating agentic-security index.ts...');
updateAgenticSecurityIndex();
console.log('');

console.log('🗑️  Removing source batch file...');
removeSourceBatchFile();
console.log('');

console.log('✅ LLM02 batch breakdown complete!');
console.log('\nAdded 4 new LLM02 rules to eslint-plugin-agentic-security:');
LLM02_RULES.forEach(rule => console.log(`  - ${rule.name}`));
console.log('\nTotal agentic-security rules: 21 (17 + 4)');
