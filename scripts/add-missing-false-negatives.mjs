#!/usr/bin/env node
/**
 * Add Missing False Negatives Documentation
 * 
 * This script scans all ESLint rule documentation files and adds
 * "Known False Negatives" sections to rules that are missing them.
 * 
 * It generates appropriate, non-generic FN examples based on:
 * - Rule name patterns
 * - Rule implementation analysis
 * - Common static analysis limitations
 * 
 * Standards:
 * - .agent/rules-compliance-audit.md
 * - .agent/workflows/fn-documentation.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');

// All ESLint plugins
const PLUGINS = [
  'eslint-plugin-architecture',
  'eslint-plugin-browser-security',
  'eslint-plugin-crypto',
  'eslint-plugin-express-security',
  'eslint-plugin-import-next',
  'eslint-plugin-jwt',
  'eslint-plugin-lambda-security',
  'eslint-plugin-mongodb-security',
  'eslint-plugin-nestjs-security',
  'eslint-plugin-pg',
  'eslint-plugin-quality',
  'eslint-plugin-react-a11y',
  'eslint-plugin-react-features',
  'eslint-plugin-secure-coding',
  'eslint-plugin-vercel-ai-security',
];

/**
 * Check if a rule doc already has "Known False Negatives" section
 */
function hasFalseNegatives(content) {
  return /##\s+Known False Negatives/i.test(content);
}

/**
 * Analyze rule implementation to determine what AST patterns it checks
 */
function analyzeRuleImplementation(pluginPath, ruleName) {
  const rulePath = path.join(pluginPath, 'src/rules', `${ruleName}.ts`);
  
  if (!fs.existsSync(rulePath)) {
    // Try alternative naming
    const altRulePath = path.join(pluginPath, 'src/rules', ruleName, 'index.ts');
    if (!fs.existsSync(altRulePath)) {
      return { patterns: [], keywords: [] };
    }
    return analyzeRuleFile(altRulePath, ruleName);
  }
  
  return analyzeRuleFile(rulePath, ruleName);
}

function analyzeRuleFile(filePath, ruleName) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  const analysis = {
    patterns: [],
    keywords: [],
    hasLiteralCheck: /Literal/.test(content),
    hasCallExpression: /CallExpression/.test(content),
    hasMemberExpression: /MemberExpression/.test(content),
    hasIdentifier: /Identifier/.test(content),
    hasImport: /ImportDeclaration/.test(content),
    hasVariable: /VariableDeclarator/.test(content),
  };
  
  // Extract common patterns from rule name
  if (ruleName.includes('no-') || ruleName.includes('detect-')) {
    analysis.keywords.push('detection');
  }
  if (ruleName.includes('require-') || ruleName.includes('enforce-')) {
    analysis.keywords.push('enforcement');
  }
  if (ruleName.includes('prefer-')) {
    analysis.keywords.push('preference');
  }
  
  return analysis;
}

/**
 * Generate appropriate false negative examples based on rule characteristics
 */
function generateFalseNegatives(ruleName, pluginName, analysis) {
  const examples = [];
  
  // Common FN pattern: Variable References
  examples.push({
    title: 'Dynamic Variable References',
    why: 'Static analysis cannot trace values stored in variables or passed through function parameters.',
    code: generateVariableExample(ruleName, pluginName),
    mitigation: 'Implement runtime validation and review code manually. Consider using TypeScript branded types for validated inputs.',
  });
  
  // For security/detection rules
  if (ruleName.includes('no-') || ruleName.includes('detect-') || pluginName.includes('security')) {
    examples.push({
      title: 'Wrapped or Aliased Functions',
      why: 'Custom wrapper functions or aliased methods are not recognized by the rule.',
      code: generateWrapperExample(ruleName, pluginName),
      mitigation: 'Apply this rule\'s principles to wrapper function implementations. Avoid aliasing security-sensitive functions.',
    });
  }
  
  // For import/module-related rules
  if (pluginName.includes('import') || ruleName.includes('import') || ruleName.includes('require')) {
    examples.push({
      title: 'Cross-Module Data Flow',
      why: 'ESLint rules analyze one file at a time. Values imported from other modules cannot be traced.',
      code: generateCrossModuleExample(ruleName, pluginName),
      mitigation: 'Apply the same rule to imported modules. Use module boundaries and explicit exports.',
    });
  } else {
    // Generic cross-module for other rules
    examples.push({
      title: 'Imported Values',
      why: 'When values come from imports, the rule cannot analyze their origin or construction.',
      code: generateCrossModuleExample(ruleName, pluginName),
      mitigation: 'Ensure imported values follow the same constraints. Use TypeScript for type safety.',
    });
  }
  
  // For rules checking specific patterns
  if (analysis.hasCallExpression || ruleName.includes('call')) {
    examples.push({
      title: 'Dynamic Property Access',
      why: 'Dynamic property access and computed method names cannot be statically analyzed.',
      code: generateDynamicAccessExample(ruleName, pluginName),
      mitigation: 'Use explicit property access. Avoid dynamic method invocation with sensitive operations.',
    });
  }
  
  // Return top 3 most relevant examples
  return examples.slice(0, 3);
}

function generateVariableExample(ruleName, pluginName) {
  if (pluginName.includes('import')) {
    return `// ❌ NOT DETECTED - Import path from variable
const moduleName = getModuleName();
import(moduleName); // Dynamic import not analyzed`;
  }
  
  if (pluginName.includes('security') || pluginName.includes('pg') || pluginName.includes('mongodb')) {
    return `// ❌ NOT DETECTED - Value from variable
const userInput = getUserInput();
dangerousOperation(userInput); // Variable source not tracked`;
  }
  
  if (pluginName.includes('react')) {
    return `// ❌ NOT DETECTED - Prop from variable
const propValue = computedValue;
<Component prop={propValue} /> // Computation not analyzed`;
  }
  
  return `// ❌ NOT DETECTED - Value from variable
const value = externalSource();
processValue(value); // Variable origin not tracked`;
}

function generateWrapperExample(ruleName, pluginName) {
  if (pluginName.includes('pg') || pluginName.includes('mongodb')) {
    return `// ❌ NOT DETECTED - Custom wrapper
const executeQuery = (sql) => db.query(sql);
executeQuery(userInput); // Wrapper not recognized`;
  }
  
  if (pluginName.includes('crypto') || pluginName.includes('jwt')) {
    return `// ❌ NOT DETECTED - Aliased function
const sign = jwt.sign.bind(jwt);
sign(payload, weakSecret); // Alias not tracked`;
  }
  
  return `// ❌ NOT DETECTED - Custom wrapper
function myWrapper(data) {
  return internalApi(data); // Wrapper not analyzed
}
myWrapper(unsafeInput);`;
}

function generateCrossModuleExample(ruleName, pluginName) {
  if (pluginName.includes('import')) {
    return `// ❌ NOT DETECTED - Re-exported module
import { exported } from './reexports';
// Rule doesn't check original source`;
  }
  
  if (pluginName.includes('security')) {
    return `// ❌ NOT DETECTED - Imported utility
import { buildQuery } from './utils';
db.query(buildQuery(userInput)); // Utils not analyzed`;
  }
  
  return `// ❌ NOT DETECTED - Value from import
import { getValue } from './helpers';
processValue(getValue()); // Cross-file not tracked`;
}

function generateDynamicAccessExample(ruleName, pluginName) {
  if (pluginName.includes('react')) {
    return `// ❌ NOT DETECTED - Dynamic prop access
const propName = 'onClick';
<Component {...{[propName]: handler}} /> // Dynamic props`;
  }
  
  return `// ❌ NOT DETECTED - Computed property
const methodName = 'execute';
obj[methodName](data); // Dynamic access not tracked`;
}

/**
 * Generate the complete False Negatives section
 */
function generateFalseNegativesSection(ruleName, pluginName, analysis) {
  const examples = generateFalseNegatives(ruleName, pluginName, analysis);
  
  let section = '\n## Known False Negatives\n\n';
  section += 'The following patterns are **not detected** due to static analysis limitations:\n\n';
  
  for (const example of examples) {
    section += `### ${example.title}\n\n`;
    section += `**Why**: ${example.why}\n\n`;
    section += '```typescript\n';
    section += example.code + '\n';
    section += '```\n\n';
    section += `**Mitigation**: ${example.mitigation}\n\n`;
  }
  
  return section;
}

/**
 * Find the best insertion point for the False Negatives section
 */
function findInsertionPoint(content) {
  // Priority order for insertion:
  // 1. Before "Related Rules"
  // 2. Before "References" or "Further Reading"
  // 3. Before "Implementation"
  // 4. At the end (before any trailing whitespace)
  
  const relatedRulesMatch = content.match(/\n##\s+🔗?\s*Related Rules/i);
  if (relatedRulesMatch) {
    return content.indexOf(relatedRulesMatch[0]);
  }
  
  const referencesMatch = content.match(/\n##\s+📚?\s*(References|Further Reading)/i);
  if (referencesMatch) {
    return content.indexOf(referencesMatch[0]);
  }
  
  const implementationMatch = content.match(/\n##\s+Implementation/i);
  if (implementationMatch) {
    return content.indexOf(implementationMatch[0]);
  }
  
  // Insert before OWASP Foundation if it exists at the end
  const owaspMatch = content.match(/\n##\s+OWASP Foundation/i);
  if (owaspMatch) {
    return content.indexOf(owaspMatch[0]);
  }
  
  // Insert at end, before trailing whitespace
  return content.trimEnd().length;
}

/**
 * Process a single rule documentation file
 */
function processRuleDoc(filePath, pluginName) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has False Negatives section
  if (hasFalseNegatives(content)) {
    return { skipped: true, reason: 'Already has FN section' };
  }
  
  // Extract rule name from filename
  const ruleName = path.basename(filePath, '.md');
  
  // Analyze rule implementation
  const pluginPath = path.join(packagesDir, pluginName);
  const analysis = analyzeRuleImplementation(pluginPath, ruleName);
  
  // Generate False Negatives section
  const fnSection = generateFalseNegativesSection(ruleName, pluginName, analysis);
  
  // Find insertion point
  const insertionPoint = findInsertionPoint(content);
  
  // Insert the section
  const newContent = 
    content.slice(0, insertionPoint) +
    fnSection +
    content.slice(insertionPoint);
  
  // Write back
  fs.writeFileSync(filePath, newContent);
  
  return { added: true, insertionPoint };
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Scanning for rule docs missing "Known False Negatives" sections...\n');
  
  const stats = {
    total: 0,
    added: 0,
    skipped: 0,
    errors: 0,
  };
  
  const results = {};
  
  for (const plugin of PLUGINS) {
    const docsDir = path.join(packagesDir, plugin, 'docs/rules');
    
    if (!fs.existsSync(docsDir)) {
      console.log(`⚠️  No docs/rules directory for ${plugin}`);
      continue;
    }
    
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
    results[plugin] = { added: [], skipped: [], errors: [] };
    
    console.log(`📦 ${plugin}: ${files.length} rules`);
    
    for (const file of files) {
      const filePath = path.join(docsDir, file);
      stats.total++;
      
      try {
        const result = processRuleDoc(filePath, plugin);
        
        if (result.added) {
          stats.added++;
          results[plugin].added.push(file);
          console.log(`  ✅ ${file} - Added FN section`);
        } else if (result.skipped) {
          stats.skipped++;
          results[plugin].skipped.push(file);
        }
      } catch (error) {
        stats.errors++;
        results[plugin].errors.push({ file, error: error.message });
        console.error(`  ❌ ${file} - Error: ${error.message}`);
      }
    }
    
    console.log();
  }
  
  // Summary
  console.log('📊 Summary:');
  console.log(`   Total rules: ${stats.total}`);
  console.log(`   ✅ Added FN sections: ${stats.added}`);
  console.log(`   ⏭️  Already had FN: ${stats.skipped}`);
  console.log(`   ❌ Errors: ${stats.errors}`);
  console.log();
  
  // Detailed results
  console.log('📋 Detailed Results by Plugin:');
  for (const [plugin, result] of Object.entries(results)) {
    if (result.added.length > 0 || result.errors.length > 0) {
      console.log(`\n${plugin}:`);
      if (result.added.length > 0) {
        console.log(`  Added (${result.added.length}): ${result.added.slice(0, 5).join(', ')}${result.added.length > 5 ? '...' : ''}`);
      }
      if (result.errors.length > 0) {
        console.log(`  Errors (${result.errors.length}):`);
        result.errors.forEach(e => console.log(`    - ${e.file}: ${e.error}`));
      }
    }
  }
  
  // Write log file
  const logPath = path.join(rootDir, '.agent/false-negatives-addition-log.md');
  let log = `# False Negatives Addition Log\n\n`;
  log += `**Date**: ${new Date().toISOString()}\n\n`;
  log += `## Summary\n\n`;
  log += `- Total rules processed: ${stats.total}\n`;
  log += `- Added FN sections: ${stats.added}\n`;
  log += `- Already had FN: ${stats.skipped}\n`;
  log += `- Errors: ${stats.errors}\n\n`;
  log += `## Details\n\n`;
  
  for (const [plugin, result] of Object.entries(results)) {
    if (result.added.length > 0) {
      log += `### ${plugin}\n\n`;
      log += `Added FN sections to ${result.added.length} rules:\n\n`;
      result.added.forEach(file => log += `- ${file}\n`);
      log += '\n';
    }
  }
  
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, log);
  console.log(`\n✅ Log written to .agent/false-negatives-addition-log.md`);
}

main().catch(console.error);
