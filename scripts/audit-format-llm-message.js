#!/usr/bin/env node

/**
 * Audit Script: Find all rules not using formatLLMMessage
 * 
 * This ensures all rules in eslint-plugin-secure-coding use
 * the AI-parseable message format for consistency
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SECURE_CODING_PKG = path.join(__dirname, '../packages/eslint-plugin-secure-coding');

// Find all rules not using formatLLMMessage
const rulesNotUsingFormat = execSync(
  'find src/rules -name "index.ts" -exec grep -L "formatLLMMessage" {} \\;',
  { cwd: SECURE_CODING_PKG, encoding: 'utf8' }
)
  .trim()
  .split('\n')
  .filter(Boolean)
  .map(file => file.replace('src/rules/', '').replace('/index.ts', ''));

console.log('🔍 Audit Report: formatLLMMessage Usage\n');
console.log(`Total rules NOT using formatLLMMessage: ${rulesNotUsingFormat.length}\n`);

if (rulesNotUsingFormat.length === 0) {
  console.log('✅ All rules are using formatLLMMessage!');
  process.exit(0);
}

// Categorize rules by type
const mobileRules = [];
const coreRules = [];

for (const ruleName of rulesNotUsingFormat) {
  const rulePath = path.join(SECURE_CODING_PKG, 'src/rules', ruleName, 'index.ts');
  const content = fs.readFileSync(rulePath, 'utf8');
  
  // Check if it's a mobile rule by looking for OWASP Mobile references
  if (content.includes('OWASP Mobile') || content.includes('M1:') || content.includes('M2:') || 
      content.includes('M3:') || content.includes('M4:') || content.includes('M5:') ||
      content.includes('M6:') || content.includes('M7:') || content.includes('M8:') || content.includes('M9:')) {
    mobileRules.push(ruleName);
  } else {
    coreRules.push(ruleName);
  }
}

console.log(`📱 Mobile/Platform Rules (${mobileRules.length}):`);
mobileRules.forEach(rule => console.log(`  - ${rule}`));

console.log(`\n🔒 Core Security Rules (${coreRules.length}):`);
coreRules.forEach(rule => console.log(`  - ${rule}`));

console.log('\n📋 Summary:\n');
console.log(`Mobile rules need formatLLMMessage: ${mobileRules.length}`);
console.log(`Core rules need formatLLMMessage: ${coreRules.length}`);
console.log(`Total: ${rulesNotUsingFormat.length}\n`);

console.log('⚠️  These rules are NOT providing AI-parseable messages!');
console.log('💡 Run fix-format-llm-message.js to update them automatically.\n');

// Write list to file for processing
const outputPath = path.join(__dirname, '../rules-needing-format-fix.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify({ mobile: mobileRules, core: coreRules, all: rulesNotUsingFormat }, null, 2)
);

console.log(`📄 Full list saved to: rules-needing-format-fix.json`);

process.exit(1); // Exit with error code to indicate issues found
