#!/usr/bin/env node

/**
 * Comprehensive cleanup of all transformed rules
 * 
 * Fixes all common issues:
 * - Wrong imports (@typescript-eslint/utils → @interlace/eslint-devkit)
 * - Duplicate logic in visitors
 * - Empty visitor methods
 * - Incorrect type checks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SECURE_CODING_PKG = path.join(__dirname, '../packages/eslint-plugin-secure-coding');

// Get list of rules that were transformed
const rulesFile = path.join(__dirname, '../rules-needing-format-fix.json');
const rulesToFix = JSON.parse(fs.readFileSync(rulesFile, 'utf8')).all;

console.log('🔧 Comprehensive Rule Cleanup\n');

let fixed = 0;

for (const ruleName of rulesToFix) {
  const rulePath = path.join(SECURE_CODING_PKG, 'src/rules', ruleName, 'index.ts');
  
  if (!fs.existsSync(rulePath)) {
    console.warn(`  ⚠️  Rule not found: ${ruleName}`);
    continue;
  }
  
  let content = fs.readFileSync(rulePath, 'utf8');
  let modified = false;
  
  // Fix 1: Wrong import statement
  if (content.includes("from '@typescript-eslint/utils'")) {
    console.log(`  🔧 Fixing imports: ${ruleName}`);
    content = content.replace(
      /import type { TSESTree } from '@typescript-eslint\/utils';/g,
      "import type { TSESTree } from '@interlace/eslint-devkit';"
    );
    modified = true;
  }
  
  // Fix 2: Remove duplicate/wrong imports
  if (content.includes('import { TSESTree,') || content.includes('AST_NODE_TYPES')) {
    console.log(`  🔧 Cleaning imports: ${ruleName}`);
    content = content.replace(
      /import { TSESTree, createRule, formatLLMMessage, MessageIcons, AST_NODE_TYPES } from '@interlace\/eslint-devkit';/g,
      "import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';\nimport type { TSESTree } from '@interlace/eslint-devkit';"
    );
    content = content.replace(
      /import { TSESTree, ([^}]+) } from '@interlace\/eslint-devkit';/g,
      "import { $1 } from '@interlace/eslint-devkit';\nimport type { TSESTree } from '@interlace/eslint-devkit';"
    );
    modified = true;
  }
  
  // Fix 3: Remove references to AST_NODE_TYPES (use string literals instead)
  if (content.includes('AST_NODE_TYPES')) {
    console.log(`  🔧 Removing AST_NODE_TYPES: ${ruleName}`);
    content = content.replace(/node\.type === AST_NODE_TYPES\.(\w+)/g, "node.type === '$1'");
    modified = true;
  }
  
  // Fix 4: Remove empty visitor methods
  const emptyVisitors = [
    'CallExpression', 'Property', 'IfStatement', 'AssignmentExpression',
    'MemberExpression', 'NewExpression', 'BinaryExpression'
  ];
  
  for (const visitor of emptyVisitors) {
    const emptyPattern = new RegExp(`\\s+${visitor}\\(node: TSESTree\\.\\w+\\) \\{\\s+// No .+ logic\\s+\\},?\\s*`, 'g');
    if (emptyPattern.test(content)) {
      console.log(`  🔧 Removing empty ${visitor} visitor: ${ruleName}`);
      content = content.replace(emptyPattern, '\n');
      modified = true;
    }
  }
  
  // Fix 5: Clean up duplicate blank lines
  content = content.replace(/\n\n\n+/g, '\n\n');
  
  // Fix 6: Ensure proper indentation in return block
  content = content.replace(/return \{\n(\w+)\(/g, 'return {\n      $1(');
  
  if (modified) {
    fs.writeFileSync(rulePath, content);
    fixed++;
    console.log(`  ✅ Fixed: ${ruleName}`);
  }
}

console.log(`\n✅ Cleanup complete! Fixed ${fixed}/${rulesToFix.length} files\n`);
console.log('Next steps:');
console.log('1. Review changes: git diff packages/eslint-plugin-secure-coding/src/rules');
console.log('2. Spot-check a few rules for correctness');
console.log('3. Build: npm run build');
