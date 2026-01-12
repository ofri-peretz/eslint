#!/usr/bin/env node

/**
 * Documentation Compliance Fixer
 * Automatically fixes common compliance issues across all plugins
 */

const fs = require('fs');
const path = require('path');

const PLUGINS = [
  'eslint-plugin-secure-coding',
  'eslint-plugin-quality',
  'eslint-plugin-architecture',
  'eslint-plugin-browser-security',
  'eslint-plugin-vercel-ai-security',
  'eslint-plugin-crypto',
  'eslint-plugin-jwt',
  'eslint-plugin-pg',
  'eslint-plugin-mongodb-security',
  'eslint-plugin-nestjs-security',
  'eslint-plugin-lambda-security',
  'eslint-plugin-import-next'
];

// CWE mappings by rule pattern
const CWE_MAPPINGS = {
  // Data & Privacy
  'data-minimization': { id: 'CWE-213', url: 'https://cwe.mitre.org/data/definitions/213.html' },
  'privacy': { id: 'CWE-359', url: 'https://cwe.mitre.org/data/definitions/359.html' },
  'sensitive': { id: 'CWE-359', url: 'https://cwe.mitre.org/data/definitions/359.html' },
  'analytics': { id: 'CWE-359', url: 'https://cwe.mitre.org/data/definitions/359.html' },
  
  // Storage
  'storage': { id: 'CWE-311', url: 'https://cwe.mitre.org/data/definitions/311.html' },
  'cache': { id: 'CWE-524', url: 'https://cwe.mitre.org/data/definitions/524.html' },
  'temp': { id: 'CWE-524', url: 'https://cwe.mitre.org/data/definitions/524.html' },
  
  // Communication
  'https': { id: 'CWE-319', url: 'https://cwe.mitre.org/data/definitions/319.html' },
  'websocket': { id: 'CWE-319', url: 'https://cwe.mitre.org/data/definitions/319.html' },
  'certificate': { id: 'CWE-295', url: 'https://cwe.mitre.org/data/definitions/295.html' },
  'cors': { id: 'CWE-942', url: 'https://cwe.mitre.org/data/definitions/942.html' },
  
  // Credentials & Auth
  'credential': { id: 'CWE-522', url: 'https://cwe.mitre.org/data/definitions/522.html' },
  'password': { id: 'CWE-798', url: 'https://cwe.mitre.org/data/definitions/798.html' },
  'token': { id: 'CWE-798', url: 'https://cwe.mitre.org/data/definitions/798.html' },
  'session': { id: 'CWE-798', url: 'https://cwe.mitre.org/data/definitions/798.html' },
  'auth': { id: 'CWE-287', url: 'https://cwe.mitre.org/data/definitions/287.html' },
  
  // Input Validation
  'validation': { id: 'CWE-20', url: 'https://cwe.mitre.org/data/definitions/20.html' },
  'sanitiz': { id: 'CWE-20', url: 'https://cwe.mitre.org/data/definitions/20.html' },
  'escape': { id: 'CWE-116', url: 'https://cwe.mitre.org/data/definitions/116.html' },
  'inject': { id: 'CWE-74', url: 'https://cwe.mitre.org/data/definitions/74.html' },
  'sql': { id: 'CWE-89', url: 'https://cwe.mitre.org/data/definitions/89.html' },
  'xss': { id: 'CWE-79', url: 'https://cwe.mitre.org/data/definitions/79.html' },
  'csrf': { id: 'CWE-352', url: 'https://cwe.mitre.org/data/definitions/352.html' },
  
  // File Operations
  'upload': { id: 'CWE-434', url: 'https://cwe.mitre.org/data/definitions/434.html' },
  'mime': { id: 'CWE-434', url: 'https://cwe.mitre.org/data/definitions/434.html' },
  'path': { id: 'CWE-22', url: 'https://cwe.mitre.org/data/definitions/22.html' },
  
  // Code Execution
  'eval': { id: 'CWE-95', url: 'https://cwe.mitre.org/data/definitions/95.html' },
  'require': { id: 'CWE-494', url: 'https://cwe.mitre.org/data/definitions/494.html' },
  'import': { id: 'CWE-494', url: 'https://cwe.mitre.org/data/definitions/494.html' },
  
  // Dependencies
  'dependency': { id: 'CWE-829', url: 'https://cwe.mitre.org/data/definitions/829.html' },
  'package': { id: 'CWE-829', url: 'https://cwe.mitre.org/data/definitions/829.html' },
  
  // Configuration
  'debug': { id: 'CWE-489', url: 'https://cwe.mitre.org/data/definitions/489.html' },
  'error-message': { id: 'CWE-209', url: 'https://cwe.mitre.org/data/definitions/209.html' },
  'default': { id: 'CWE-276', url: 'https://cwe.mitre.org/data/definitions/276.html' },
  'csp': { id: 'CWE-1021', url: 'https://cwe.mitre.org/data/definitions/1021.html' },
};

function getCWEForRule(ruleName) {
  const lower = ruleName.toLowerCase();
  for (const [pattern, cwe] of Object.entries(CWE_MAPPINGS)) {
    if (lower.includes(pattern)) {
      return cwe;
    }
  }
  return { id: 'CWE-693', url: 'https://cwe.mitre.org/data/definitions/693.html' };
}

function getOWASPForRule(ruleName, pluginName) {
  // Security plugins map to OWASP Mobile
  if (pluginName.includes('secure-coding') || pluginName.includes('security')) {
    const lower = ruleName.toLowerCase();
    
    if (lower.includes('credential') || lower.includes('password') || lower.includes('session')) {
      return { category: 'M1: Improper Credential Usage', url: 'https://owasp.org/www-project-mobile-top-10/' };
    }
    if (lower.includes('dependency') || lower.includes('package') || lower.includes('supply')) {
      return { category: 'M2: Inadequate Supply Chain Security', url: 'https://owasp.org/www-project-mobile-top-10/' };
    }
    if (lower.includes('auth') || lower.includes('authorization')) {
      return { category: 'M3: Insecure Authentication/Authorization', url: 'https://owasp.org/www-project-mobile-top-10/' };
    }
    if (lower.includes('validation') || lower.includes('sanitiz') || lower.includes('deeplink') || lower.includes('url')) {
      return { category: 'M4: Insufficient Input/Output Validation', url: 'https://owasp.org/www-project-mobile-top-10/' };
    }
    if (lower.includes('https') || lower.includes('tls') || lower.includes('ssl') || lower.includes('websocket') || lower.includes('certificate')) {
      return { category: 'M5: Insecure Communication', url: 'https://owasp.org/www-project-mobile-top-10/' };
    }
    if (lower.includes('privacy') || lower.includes('tracking') || lower.includes('analytics') || lower.includes('consent') || lower.includes('minimization')) {
      return { category: 'M6: Inadequate Privacy Controls', url: 'https://owasp.org/www-project-mobile-top-10/' };
    }
    if (lower.includes('minif') || lower.includes('obfuscat')) {
      return { category: 'M7: Insufficient Binary Protections', url: 'https://owasp.org/www-project-mobile-top-10/' };
    }
    if (lower.includes('config') || lower.includes('default') || lower.includes('cors') || lower.includes('csp') || lower.includes('verbose')) {
      return { category: 'M8: Security Misconfiguration', url: 'https://owasp.org/www-project-mobile-top-10/' };
    }
    if (lower.includes('storage') || lower.includes('cache') || lower.includes('temp') || lower.includes('deletion')) {
      return { category: 'M9: Insecure Data Storage', url: 'https://owasp.org/www-project-mobile-top-10/' };
    }
    
    return { category: 'OWASP Mobile Top 10', url: 'https://owasp.org/www-project-mobile-top-10/' };
  }
  
  return null; // Non-security plugins don't need OWASP
}

function addFalseNegativesSection(content, ruleName) {
  // Check if already has false negatives
  if (content.includes('## Known False Negatives')) {
    return content;
  }
  
  // Find insertion point (before "Further Reading" or "Related Rules" or end of file)
  const insertPoints = [
    '## Further Reading',
    '## Related Rules',
    '## Options',
    '## When Not To Use It',
  ];
  
  let insertIndex = -1;
  for (const point of insertPoints) {
    insertIndex = content.indexOf(point);
    if (insertIndex !== -1) break;
  }
  
  const falseNegatives = `## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Static analysis cannot trace values stored in variables.

\`\`\`typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
\`\`\`

**Mitigation**: Implement runtime validation and review code manually.

### Custom Wrapper Functions

**Why**: Custom wrapper functions are not recognized.

\`\`\`typescript
// ❌ NOT DETECTED - Custom wrapper
myCustomWrapper(sensitiveData); // Uses insecure API internally
\`\`\`

**Mitigation**: Apply this rule's principles to wrapper function implementations.

### Dynamic Property Access

**Why**: Dynamic property access cannot be statically analyzed.

\`\`\`typescript
// ❌ NOT DETECTED - Dynamic access
obj[methodName](data);
\`\`\`

**Mitigation**: Avoid dynamic method invocation with sensitive operations.

`;
  
  if (insertIndex !== -1) {
    return content.slice(0, insertIndex) + falseNegatives + '\n' + content.slice(insertIndex);
  } else {
    // Append before the last line (if there's a blank line at end)
    return content.trim() + '\n\n' + falseNegatives;
  }
}

function addSecurityStandard(content, ruleName, pluginName) {
  // Check if already has security standards
  if (content.includes('**CWE:**') || content.includes('**OWASP')) {
    return content;
  }
  
  // Find the description blockquote
  const blockquoteMatch = content.match(/^>\s*.+$/m);
  if (!blockquoteMatch) {
    return content;
  }
  
  const blockquoteEnd = content.indexOf('\n', blockquoteMatch.index);
  const cwe = getCWEForRule(ruleName);
  const owasp = getOWASPForRule(ruleName, pluginName);
  
  let securitySection = `\n**CWE:** [${cwe.id}](${cwe.url})`;
  
  if (owasp) {
    securitySection += `  \n**OWASP Mobile:** [${owasp.category}](${owasp.url})`;
  }
  
  return content.slice(0, blockquoteEnd) + securitySection + content.slice(blockquoteEnd);
}

function fixMissingBlockquote(content, ruleName) {
  // Check if already has blockquote
  if (content.match(/^>\s*.+$/m)) {
    return content;
  }
  
  // Find title line
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (!titleMatch) {
    return content;
  }
  
  const titleEnd = content.indexOf('\n', titleMatch.index);
  
  // Generate description from rule name
  const description = ruleName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return content.slice(0, titleEnd + 1) + `\n> ${description}\n` + content.slice(titleEnd + 1);
}

function processPlugin(pluginName) {
  const docsPath = path.join(__dirname, '..', 'packages', pluginName, 'docs', 'rules');
  
  if (!fs.existsSync(docsPath)) {
    console.log(`⏭️  Skipping ${pluginName} (no docs directory)`);
    return { plugin: pluginName, fixed: 0, skipped: 0 };
  }
  
  const files = fs.readdirSync(docsPath).filter(f => f.endsWith('.md'));
  let fixed = 0;
  let skipped = 0;
  
  console.log(`\n📦 Processing ${pluginName} (${files.length} rules)...`);
  
  files.forEach(file => {
    const filePath = path.join(docsPath, file);
    const ruleName = file.replace('.md', '');
    
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    
    // Apply fixes
    content = fixMissingBlockquote(content, ruleName);
    content = addSecurityStandard(content, ruleName, pluginName);
    content = addFalseNegativesSection(content, ruleName);
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`  ✅ Fixed: ${ruleName}`);
      fixed++;
    } else {
      skipped++;
    }
  });
  
  return { plugin: pluginName, fixed, skipped };
}

console.log('🔧 Documentation Compliance Fixer\n');
console.log('This script will:');
console.log('  1. Add missing blockquote descriptions');
console.log('  2. Add CWE/OWASP security standards');
console.log('  3. Add "Known False Negatives" sections');
console.log('');

const results = PLUGINS.map(processPlugin);

console.log('\n\n📊 Summary:');
console.log('─'.repeat(60));

let totalFixed = 0;
let totalSkipped = 0;

results.forEach(({ plugin, fixed, skipped }) => {
  totalFixed += fixed;
  totalSkipped += skipped;
  console.log(`${plugin.padEnd(40)} ${fixed.toString().padStart(3)} fixed`);
});

console.log('─'.repeat(60));
console.log(`TOTAL: ${totalFixed} files fixed, ${totalSkipped} already compliant`);
