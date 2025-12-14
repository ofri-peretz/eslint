#!/usr/bin/env node

/**
 * Comprehensive Rule Standardization Script
 * 
 * Automatically updates all 40 rules to use formatLLMMessage with:
 * - Proper MessageIds type
 * - Options interface
 * - RuleOptions type
 * - Appropriate CWE/OWASP/CVSS mappings
 */

const fs = require('fs');
const path = require('path');

const SECURE_CODING_PKG = path.join(__dirname, '../packages/eslint-plugin-secure-coding');

// CWE mappings based on rule patterns and categories
const CWE_MAPPINGS = {
  // Credentials & Authentication
  'credentials': { cwe: 'CWE-798', owasp: 'OWASP:A07-Identification-Authentication-Failures', cvss: 9.8, severity: 'CRITICAL' },
  'password': { cwe: 'CWE-521', owasp: 'OWASP:A07-Identification-Authentication-Failures', cvss: 9.1, severity: 'CRITICAL' },
  'session': { cwe: 'CWE-384', owasp: 'OWASP:A07-Identification-Authentication-Failures', cvss: 8.1, severity: 'HIGH' },
  'auth': { cwe: 'CWE-306', owasp: 'OWASP:A07-Identification-Authentication-Failures', cvss: 9.8, severity: 'CRITICAL' },
  
  // Storage & Encryption
  'storage': { cwe: 'CWE-312', owasp: 'OWASP:A02-Cryptographic-Failures', cvss: 7.5, severity: 'HIGH' },
  'encryption': { cwe: 'CWE-326', owasp: 'OWASP:A02-Cryptographic-Failures', cvss: 7.5, severity: 'HIGH' },
  'unencrypted': { cwe: 'CWE-311', owasp: 'OWASP:A02-Cryptographic-Failures', cvss: 7.5, severity: 'HIGH' },
  
  // Communication
  'http': { cwe: 'CWE-319', owasp: 'OWASP:A02-Cryptographic-Failures', cvss: 7.5, severity: 'HIGH' },
  'https': { cwe: 'CWE-319', owasp: 'OWASP:A02-Cryptographic-Failures', cvss: 7.5, severity: 'HIGH' },
  'certificate': { cwe: 'CWE-295', owasp: 'OWASP:A02-Cryptographic-Failures', cvss: 7.4, severity: 'HIGH' },
  'websocket': { cwe: 'CWE-319', owasp: 'OWASP:A02-Cryptographic-Failures', cvss: 7.5, severity: 'HIGH' },
  'mixed-content': { cwe: 'CWE-311', owasp: 'OWASP:A02-Cryptographic-Failures', cvss: 5.9, severity: 'MEDIUM' },
  
  // Input Validation
  'validation': { cwe: 'CWE-20', owasp: 'OWASP:A03-Injection', cvss: 8.6, severity: 'HIGH' },
  'url-validation': { cwe: 'CWE-20', owasp: 'OWASP:A03-Injection', cvss: 7.3, severity: 'HIGH' },
  'deeplinks': { cwe: 'CWE-939', owasp: 'OWASP:A01-Broken-Access-Control', cvss: 8.1, severity: 'HIGH' },
  
  // Privacy & Data Exposure
  'pii': { cwe: 'CWE-359', owasp: 'OWASP:A01-Broken-Access-Control', cvss: 7.5, severity: 'HIGH' },
  'sensitive-data': { cwe: 'CWE-200', owasp: 'OWASP:A01-Broken-Access-Control', cvss: 7.5, severity: 'HIGH' },
  'tracking': { cwe: 'CWE-359', owasp: 'OWASP:A01-Broken-Access-Control', cvss: 4.3, severity: 'MEDIUM' },
  'analytics': { cwe: 'CWE-359', owasp: 'OWASP:A01-Broken-Access-Control', cvss: 5.3, severity: 'MEDIUM' },
  'minimization': { cwe: 'CWE-213', owasp: 'OWASP:A01-Broken-Access-Control', cvss: 5.3, severity: 'MEDIUM' },
  'cache': { cwe: 'CWE-524', owasp: 'OWASP:A04-Insecure-Design', cvss: 6.5, severity: 'MEDIUM' },
  'temp-storage': { cwe: 'CWE-459', owasp: 'OWASP:A04-Insecure-Design', cvss: 5.9, severity: 'MEDIUM' },
  'deletion': { cwe: 'CWE-459', owasp: 'OWASP:A04-Insecure-Design', cvss: 5.3, severity: 'MEDIUM' },
  
  // Security Headers & Configuration
  'cors': { cwe: 'CWE-942', owasp: 'OWASP:A05-Security-Misconfiguration', cvss: 7.5, severity: 'HIGH' },
  'csp': { cwe: 'CWE-1021', owasp: 'OWASP:A05-Security-Misconfiguration', cvss: 6.1, severity: 'MEDIUM' },
  'postmessage': { cwe: 'CWE-346', owasp: 'OWASP:A05-Security-Misconfiguration', cvss: 8.8, severity: 'HIGH' },
  'timeout': { cwe: 'CWE-400', owasp: 'OWASP:A05-Security-Misconfiguration', cvss: 5.3, severity: 'MEDIUM' },
  
  // Code & Binary Protection
  'debug': { cwe: 'CWE-489', owasp: 'OWASP:A05-Security-Misconfiguration', cvss: 7.5, severity: 'HIGH' },
  'minification': { cwe: 'CWE-656', owasp: 'OWASP:A05-Security-Misconfiguration', cvss: 3.7, severity: 'LOW' },
  'verbose-error': { cwe: 'CWE-209', owasp: 'OWASP:A05-Security-Misconfiguration', cvss: 5.3, severity: 'MEDIUM' },
  
  // Supply Chain
  'dependency': { cwe: 'CWE-1104', owasp: 'OWASP:A06-Vulnerable-and-Outdated-Components', cvss: 8.1, severity: 'HIGH' },
  'package-lock': { cwe: 'CWE-829', owasp: 'OWASP:A06-Vulnerable-and-Outdated-Components', cvss: 7.3, severity: 'HIGH' },
  'suspicious': { cwe: 'CWE-506', owasp: 'OWASP:A06-Vulnerable-and-Outdated-Components', cvss: 8.1, severity: 'HIGH' },
  'dynamic-loading': { cwe: 'CWE-829', owasp: 'OWASP:A06-Vulnerable-and-Outdated-Components', cvss: 7.5, severity: 'HIGH' },
  
  // File Access
  'file-access': { cwe: 'CWE-22', owasp: 'OWASP:A01-Broken-Access-Control', cvss: 7.5, severity: 'HIGH' },
  'mime-type': { cwe: 'CWE-434', owasp: 'OWASP:A03-Injection', cvss: 8.8, severity: 'HIGH' },
  
  // iOS/Platform Specific
  'arbitrary-loads': { cwe: 'CWE-295', owasp: 'OWASP:A02-Cryptographic-Failures', cvss: 7.4, severity: 'HIGH' },
  'defaults': { cwe: 'CWE-1188', owasp: 'OWASP:A05-Security-Misconfiguration', cvss: 5.3, severity: 'MEDIUM' },
};

function getCWEMapping(ruleName) {
  // Try exact key matches first
  for (const [key, mapping] of Object.entries(CWE_MAPPINGS)) {
    if (ruleName.includes(key)) {
      return mapping;
    }
  }
  
  // Default fallback
  return {
    cwe: 'CWE-693',
    owasp: 'OWASP:A05-Security-Misconfiguration',
    cvss: 5.3,
    severity: 'MEDIUM'
  };
}

function extractMessages(content) {
  const messagesMatch = content.match(/messages:\s*{([^}]+)}/s);
  if (!messagesMatch) return {};
  
  const messagesContent = messagesMatch[1];
  const messages = {};
  const messagePattern = /(\w+):\s*['"`]([^'"`]+)['"`]/g;
  let match;
  
  while ((match = messagePattern.exec(messagesContent)) !== null) {
    messages[match[1]] = match[2];
  }
  
  return messages;
}

function extractSchema(content) {
  const schemaMatch = content.match(/schema:\s*\[([^\]]+)\]/s);
  if (!schemaMatch) return null;
  
  return schemaMatch[1].trim();
}

function generateOptions(schema) {
  if (!schema) return '  // No options for this rule\n';
  
  const propsMatch = schema.match(/properties:\s*{([^}]+)}/s);
  if (!propsMatch) return '  // No options for this rule\n';
  
  const propsContent = propsMatch[1];
  const propPattern = /(\w+):\s*{[^}]*type:\s*['"](\w+)['"]/g;
  let match;
  const props = [];
  
  while ((match = propPattern.exec(propsContent)) !== null) {
    const propName = match[1];
    const propType = match[2];
    const tsType = propType === 'array' ? 'string[]' : propType === 'number' ? 'number' : propType === 'boolean' ? 'boolean' : 'string';
    props.push(`  /** Configuration for ${propName} */\n  ${propName}?: ${tsType};`);
  }
  
  return props.length > 0 ? props.join('\n') : '  // No options for this rule\n';
}

function transformRule(ruleName) {
  const rulePath = path.join(SECURE_CODING_PKG, 'src/rules', ruleName, 'index.ts');
  
  if (!fs.existsSync(rulePath)) {
    console.warn(`  ⚠️  Rule not found: ${ruleName}`);
    return false;
  }
  
  let content = fs.readFileSync(rulePath, 'utf8');
  
  // Skip if already using formatLLMMessage
  if (content.includes('formatLLMMessage')) {
    console.log(`  ✓ Already formatted: ${ruleName}`);
    return false;
  }
  
  console.log(`  🔧 Transforming: ${ruleName}`);
  
  const mapping = getCWEMapping(ruleName);
  const messages = extractMessages(content);
  const schema = extractSchema(content);
  const options = generateOptions(schema);
  
  const messageIds = Object.keys(messages);
  
  // Create formatted messages
  const formattedMessages = messageIds.map(msgId => {
    const originalMsg = messages[msgId];
    const isSecurityIssue = msgId.toLowerCase().includes('insecure') || 
                           msgId.toLowerCase().includes('unsafe') || 
                           msgId.toLowerCase().includes('missing') ||
                           msgId.toLowerCase().includes('detected') ||
                           !msgId.toLowerCase().includes('suggest') &&
                           !msgId.toLowerCase().includes('fix') &&
                           !msgId.toLowerCase().includes('use');
    
    const icon = isSecurityIssue ? 'MessageIcons.SECURITY' : 'MessageIcons.WARNING';
    const description = originalMsg.replace(/\"/g, '\\"').split('.')[0];
    const fix = originalMsg.includes('Use') || originalMsg.includes('Consider') 
      ? originalMsg.split('.').slice(1).join('.').trim() || 'Review and apply secure practices'
      : 'Review and apply secure practices';
    
    return `      ${msgId}: formatLLMMessage({
        icon: ${icon},
        issueName: '${msgId.replace(/([A-Z])/g, ' $1').trim()}',
        cwe: '${mapping.cwe}',
        description: '${description}',
        severity: '${mapping.severity}',
        fix: '${fix}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/${mapping.cwe.replace('CWE-', '')}.html',
      })`;
  }).join(',\n');
  
  // Build new content
  const newImports = content.includes('formatLLMMessage') 
    ? content.match(/import.*from '@interlace\/eslint-devkit';/)[0]
    : `import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';`;
  
  const typeDefinitions = `
type MessageIds = ${messageIds.map(id => `'${id}'`).join(' | ')};

export interface Options {
${options}
}

type RuleOptions = [Options?];
`;
  
  // Replace imports
  content = content.replace(
    /import { createRule } from '@interlace\/eslint-devkit';/,
    newImports
  );
  
  // Add type definitions before export
  const exportMatch = content.match(/export const \w+ = createRule/);
  if (exportMatch) {
    const exportIndex = content.indexOf(exportMatch[0]);
    content = content.slice(0, exportIndex) + typeDefinitions + '\n' + content.slice(exportIndex);
  }
  
  // Replace createRule call
  content = content.replace(
    /export const (\w+) = createRule\({/,
    `export const $1 = createRule<RuleOptions, MessageIds>({`
  );
  
  // Replace messages object
  const messagesRegex = /messages:\s*{[^}]+}/s;
  content = content.replace(messagesRegex, `messages: {\n${formattedMessages}\n    }`);
  
  // Add defaultOptions if schema exists and no defaultOptions present
  if (schema && !content.includes('defaultOptions')) {
    content = content.replace(
      /schema:\s*\[/,
      `defaultOptions: [{}],\n    schema: [`
    );
  }
  
  fs.writeFileSync(rulePath, content);
  return true;
}

// Get list of rules to fix
const rulesFile = path.join(__dirname, '../rules-needing-format-fix.json');
const rulesToFix = JSON.parse(fs.readFileSync(rulesFile, 'utf8')).all;

console.log('🚀 Standardizing All Rules\n');
console.log(`Total rules to process: ${rulesToFix.length}\n`);

let transformed = 0;
let skipped = 0;

for (const ruleName of rulesToFix) {
  if (transformRule(ruleName)) {
    transformed++;
  } else {
    skipped++;
  }
}

console.log('\n✅ Standardization Complete!\n');
console.log(`Transformed: ${transformed}`);
console.log(`Skipped: ${skipped}`);
console.log(`Total: ${rulesToFix.length}\n`);

console.log('Next steps:');
console.log('1. Review changes: git diff');
console.log('2. Build: npm run build');
console.log('3. Test: npm test');
console.log('4. Commit: git commit -am "feat: standardize all rules with formatLLMMessage"');
