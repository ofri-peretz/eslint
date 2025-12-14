#!/usr/bin/env node

/**
 * Clean up logic issues from automated transformation
 * 
 * Fixes:
 * - Duplicate logic in visitor methods
 * - Wrong type checks (Literal checks in TemplateLiteral visitors)
 * - Empty visitor methods with "No ... logic" comments
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

console.log('🧹 Cleaning up rule logic issues\n');

let fixed = 0;

for (const relPath of ruleFiles) {
  const filePath = path.join(SECURE_CODING_PKG, relPath);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Remove empty visitor methods with "No ... logic" comments
  const emptyVisitorPattern = /\s+\w+\(node: TSESTree\.\w+\) {\s+\/\/ No .+ logic\s+},?\s*/g;
  if (emptyVisitorPattern.test(content)) {
    console.log(`  🧹 Removing empty visitors in ${relPath}`);
    content = content.replace(emptyVisitorPattern, '\n');
    modified = true;
  }
  
  // Fix TemplateLiteral visitor with wrong type checks
  if (content.includes('TemplateLiteral(node: TSESTree.TemplateLiteral)')) {
    const templateLiteralSection = content.match(/TemplateLiteral\(node: TSESTree\.TemplateLiteral\) \{[\s\S]*?\n\s+\},?\s*$/m);
    if (templateLiteralSection && templateLiteralSection[0].includes('node.type === AST_NODE_TYPES.TemplateLiteral')) {
      console.log(`  🧹 Fixing TemplateLiteral logic in ${relPath}`);
      
      // Extract the correct logic for template literals
      const correctLogic = `      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        const text = context.sourceCode.getText(node).toLowerCase();
        const sensitiveParams = ['password=', 'token=', 'apikey=', 'secret=', 'auth='];
        
        if (sensitiveParams.some(param => text.includes(param))) {
          report(node);
        }
      },`;
      
      // Replace the entire TemplateLiteral visitor
      content = content.replace(
        /TemplateLiteral\(node: TSESTree\.TemplateLiteral\) \{[\s\S]*?\n\s+\},/,
        correctLogic
      );
      modified = true;
    }
  }
  
  // Fix Literal visitor to properly handle both strings and template elements
  if (content.includes('Literal(node: TSESTree.Literal)')) {
    const literalSection = content.match(/Literal\(node: TSESTree\.Literal\) \{[\s\S]*?\n\s+\},/);
    if (literalSection && literalSection[0].includes('node.type === \'TemplateLiteral\'')) {
      console.log(`  🧹 Fixing Literal visitor in ${relPath}`);
      
      // This should only check Literal nodes, not TemplateLiteral
      const correctLogic = `      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string') {
          const url = node.value;
          const sensitiveParams = ['password=', 'token=', 'apikey=', 'secret=', 'auth='];
          
          if (sensitiveParams.some(param => url.toLowerCase().includes('?' + param) || 
                                            url.toLowerCase().includes('&' + param))) {
            report(node);
          }
        }
      },`;
      
      content = content.replace(
        /Literal\(node: TSESTree\.Literal\) \{[\s\S]*?\n\s+\},/,
        correctLogic
      );
      modified = true;
    }
  }
  
  // Clean up duplicate blank lines
  content = content.replace(/\n\n\n+/g, '\n\n');
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    fixed++;
  }
}

console.log(`\n✅ Cleaned ${fixed} files\n`);
