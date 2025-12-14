#!/usr/bin/env node

/**
 * Fix Common Issues from Standardization
 * 
 * Fixes:
 * - Duplicate MessageIds declarations
 * - Wrong generic types ([], RuleOptions)
 * - Malformatted type definitions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SECURE_CODING_PKG = path.join(__dirname, '../packages/eslint-plugin-secure-coding');

// Get all rule index files
const ruleFiles = execSync(
  'find src/rules -name "index.ts"',
  { cwd: SECURE_CODING_PKG, encoding: 'utf8' }
)
  .trim()
  .split('\n')
  .filter(Boolean);

console.log('🔧 Fixing Common Issues\n');

let fixed = 0;

for (const relPath of ruleFiles) {
  const filePath = path.join(SECURE_CODING_PKG, relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix duplicate MessageIds
  const messageIdsCount = (content.match(/type MessageIds =/g) || []).length;
  if (messageIdsCount > 1) {
    console.log(`  🔧 Fixing duplicate MessageIds in ${relPath}`);
    // Keep only the first occurrence
    let first = true;
    content = content.replace(/type MessageIds = [^;]+;/g, (match) => {
      if (first) {
        first = false;
        return match;
      }
      return '';
    });
    modified = true;
  }
  
  // Fix wrong generic type ([], RuleOptions) -> (RuleOptions, MessageIds)
  if (content.includes('createRule<[], MessageIds>')) {
    console.log(`  🔧 Fixing generic type in ${relPath}`);
    content = content.replace(/createRule<\[\], MessageIds>/g, 'createRule<RuleOptions, MessageIds>');
    modified = true;
  }
  
  // Fix empty Options interface
  if (content.includes('export interface Options {\n  // No options for this rule\n\n}')) {
    content = content.replace(
      /export interface Options {\n  \/\/ No options for this rule\n\n}/g,
      'export interface Options {\n  // No options for this rule\n}'
    );
    modified = true;
  }
  
  // Remove extra blank lines in type definitions
  content = content.replace(/\n\n\ntype MessageIds/g, '\n\ntype MessageIds');
  content = content.replace(/\n\n\nexport interface/g, '\n\nexport interface');
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    fixed++;
  }
}

console.log(`\n✅ Fixed ${fixed} files\n`);
