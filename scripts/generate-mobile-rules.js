#!/usr/bin/env node
/**
 * Script to generate the 40 mobile security rules for eslint-plugin-secure-coding
 */

const fs = require('fs');
const path = require('path');

const RULES = [
  // M1: Credential Security (3 rules)
  {
    name: 'no-credentials-in-storage-api',
    category: 'M1',
    description: 'Disallow storing credentials in browser/mobile storage APIs',
    cwe: ['CWE-522'],
  },
  {
    name: 'no-credentials-in-query-params',
    category: 'M1',
    description: 'Disallow credentials in URL query parameters',
    cwe: ['CWE-598'],
  },
  {
    name: 'require-secure-credential-storage',
    category: 'M1',
    description: 'Require secure storage patterns for credentials',
    cwe: ['CWE-522'],
  },
  
  // M2: Supply Chain (4 rules)
  {
    name: 'require-dependency-integrity',
    category: 'M2',
    description: 'Require integrity hashes for external resources',
    cwe: ['CWE-494'],
  },
  {
    name: 'detect-suspicious-dependencies',
    category: 'M2',
    description: 'Detect potential typosquatting in dependencies',
    cwe: ['CWE-506'],
  },
  {
    name: 'no-dynamic-dependency-loading',
    category: 'M2',
    description: 'Prevent dynamic dependency injection',
    cwe: ['CWE-494'],
  },
  {
    name: 'require-package-lock',
    category: 'M2',
    description: 'Ensure package lock file exists',
    cwe: ['CWE-829'],
  },
  
  // M3: Authentication (5 rules)
  {
    name: 'no-client-side-auth-logic',
    category: 'M3',
    description: 'Prevent authentication logic in client code',
    cwe: ['CWE-602'],
  },
  {
    name: 'require-backend-authorization',
    category: 'M3',
    description: 'Require server-side authorization checks',
    cwe: ['CWE-602'],
  },
  {
    name: 'no-hardcoded-session-tokens',
    category: 'M3',
    description: 'Detect hardcoded session/JWT tokens',
    cwe: ['CWE-798'],
  },
  {
    name: 'detect-weak-password-validation',
    category: 'M3',
    description: 'Identify weak password requirements',
    cwe: ['CWE-521'],
  },
  {
    name: 'no-password-in-url',
    category: 'M3',
    description: 'Prevent passwords in URLs',
    cwe: ['CWE-598'],
  },
  
  // M4: Input/Output (6 rules)
  {
    name: 'no-unvalidated-deeplinks',
    category: 'M4',
    description: 'Require validation of deep link URLs',
    cwe: ['CWE-20'],
  },
  {
    name: 'require-url-validation',
    category: 'M4',
    description: 'Enforce URL validation before navigation',
    cwe: ['CWE-601'],
  },
  {
    name: 'no-arbitrary-file-access',
    category: 'M4',
    description: 'Prevent file access from user input',
    cwe: ['CWE-22'],
  },
  {
    name: 'require-mime-type-validation',
    category: 'M4',
    description: 'Require MIME type validation for uploads',
    cwe: ['CWE-434'],
  },
  {
    name: 'no-postmessage-origin-wildcard',
    category: 'M4',
    description: 'Prevent wildcard origins in postMessage',
    cwe: ['CWE-942'],
  },
  {
    name: 'require-csp-headers',
    category: 'M4',
    description: 'Require Content Security Policy',
    cwe: ['CWE-693'],
  },
  
  // M5: Communication (7 rules)
  {
    name: 'no-http-urls',
    category: 'M5',
    description: 'Disallow hardcoded HTTP URLs',
    cwe: ['CWE-319'],
  },
  {
    name: 'no-disabled-certificate-validation',
    category: 'M5',
    description: 'Prevent disabled SSL/TLS certificate validation',
    cwe: ['CWE-295'],
  },
  {
    name: 'require-https-only',
    category: 'M5',
    description: 'Enforce HTTPS for external requests',
    cwe: ['CWE-319'],
  },
  {
    name: 'no-insecure-websocket',
    category: 'M5',
    description: 'Require secure WebSocket connections',
    cwe: ['CWE-319'],
  },
  {
    name: 'detect-mixed-content',
    category: 'M5',
    description: 'Detect HTTP resources in HTTPS pages',
    cwe: ['CWE-311'],
  },
  {
    name: 'no-allow-arbitrary-loads',
    category: 'M5',
    description: 'Prevent configuration allowing insecure loads',
    cwe: ['CWE-749'],
  },
  {
    name: 'require-network-timeout',
    category: 'M5',
    description: 'Require timeout limits for network requests',
    cwe: ['CWE-770'],
  },
  
  // M6: Privacy (4 rules)
  {
    name: 'no-pii-in-logs',
    category: 'M6',
    description: 'Prevent PII in console logs',
    cwe: ['CWE-532'],
  },
  {
    name: 'no-tracking-without-consent',
    category: 'M6',
    description: 'Require consent before tracking',
    cwe: ['CWE-359'],
  },
  {
    name: 'require-data-minimization',
    category: 'M6',
    description: 'Identify excessive data collection',
    cwe: ['CWE-213'],
  },
  {
    name: 'no-sensitive-data-in-analytics',
    category: 'M6',
    description: 'Prevent PII sent to analytics',
    cwe: ['CWE-359'],
  },
  
  // M7: Code Protection (2 rules)
  {
    name: 'no-debug-code-in-production',
    category: 'M7',
    description: 'Detect debug code in production',
    cwe: ['CWE-489'],
  },
  {
    name: 'require-code-minification',
    category: 'M7',
    description: 'Require minification configuration',
    cwe: ['CWE-656'],
  },
  
  // M8: Configuration (4 rules)
  {
    name: 'no-verbose-error-messages',
    category: 'M8',
    description: 'Prevent exposing stack traces to users',
    cwe: ['CWE-209'],
  },
  {
    name: 'no-exposed-debug-endpoints',
    category: 'M8',
    description: 'Detect debug endpoints without auth',
    cwe: ['CWE-489'],
  },
  {
    name: 'require-secure-defaults',
    category: 'M8',
    description: 'Ensure secure default configurations',
    cwe: ['CWE-453'],
  },
  {
    name: 'no-permissive-cors',
    category: 'M8',
    description: 'Prevent overly permissive CORS',
    cwe: ['CWE-942'],
  },
  
  // M9: Data Storage (5 rules)
  {
    name: 'no-unencrypted-local-storage',
    category: 'M9',
    description: 'Prevent sensitive data in unencrypted storage',
    cwe: ['CWE-311'],
  },
  {
    name: 'no-sensitive-data-in-cache',
    category: 'M9',
    description: 'Prevent caching sensitive data without encryption',
    cwe: ['CWE-524'],
  },
  {
    name: 'require-storage-encryption',
    category: 'M9',
    description: 'Require encryption for persistent storage',
    cwe: ['CWE-311'],
  },
  {
    name: 'no-data-in-temp-storage',
    category: 'M9',
    description: 'Prevent sensitive data in temp directories',
    cwe: ['CWE-524'],
  },
  {
    name: 'require-secure-deletion',
    category: 'M9',
    description: 'Require secure data deletion patterns',
    cwe: ['CWE-459'],
  },
];

const rulesDir = path.join(__dirname, '..', 'packages', 'eslint-plugin-secure-coding', 'src', 'rules', 'security');
const testsDir = path.join(__dirname, '..', 'packages', 'eslint-plugin-secure-coding', 'src', 'tests', 'security');

console.log(`\n📝 Generating ${RULES.length} mobile security rules...\n`);

let created = 0;
let skipped = 0;

RULES.forEach((rule, index) => {
  const ruleFile = path.join(rulesDir, `${rule.name}.ts`);
  const testFile = path.join(testsDir, `${rule.name}.test.ts`);
  
  // Check if files already exist
  if (fs.existsSync(ruleFile)) {
    console.log(`⚠️  Skipping ${rule.name} (already exists)`);
    skipped++;
    return;
  }
  
  // Create rule implementation
  const ruleContent = `/**
 * @fileoverview ${rule.description}
 * @see https://owasp.org/www-project-mobile-top-10/
 * @see https://cwe.mitre.org/data/definitions/${rule.cwe[0].replace('CWE-', '')}.html
 */

import { createRule } from '@interlace/eslint-devkit';

export const ${toCamelCase(rule.name)} = createRule({
  name: '${rule.name}',
  meta: {
    type: 'problem',
    docs: {
      description: '${rule.description}',
      category: 'Security',
      recommended: true,
      owaspMobile: ['${rule.category}'],
      cweIds: ${JSON.stringify(rule.cwe)},
    },
    messages: {
      ${getMessageId(rule.name)}: '${getErrorMessage(rule)}',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      // TODO: Implement AST visitors for ${rule.name}
      // This is a placeholder that needs proper implementation
    };
  },
});
`;

  // Create test file
  const testContent = `/**
 * @fileoverview Tests for ${rule.name}
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { ${toCamelCase(rule.name)} } from '../../rules/security/${rule.name}';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('${rule.name}', ${toCamelCase(rule.name)}, {
  valid: [
    // TODO: Add valid test cases
    {
      code: \`
        // Add valid code example here
      \`,
    },
  ],

  invalid: [
    // TODO: Add invalid test cases
    {
      code: \`
        // Add invalid code example here
      \`,
      errors: [
        {
          messageId: '${getMessageId(rule.name)}',
        },
      ],
    },
  ],
});
`;

  fs.writeFileSync(ruleFile, ruleContent);
  fs.writeFileSync(testFile, testContent);
  
  console.log(`✅ Created ${index + 1}/${RULES.length}: ${rule.name}`);
  created++;
});

console.log(`\n📊 Summary:`);
console.log(`   ✅ Created: ${created} rules`);
console.log(`   ⚠️  Skipped: ${skipped} rules (already existed)`);
console.log(`\n✨ Next steps:`);
console.log(`   1. Implement AST visitors for each rule`);
console.log(`   2. Add valid/invalid test cases`);
console.log(`   3. Update src/index.ts to export all rules`);
console.log(`   4. Run tests: npx nx test eslint-plugin-secure-coding`);
console.log();

// Helper functions
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

function getMessageId(ruleName) {
  const parts = ruleName.split('-');
  if (parts[0] === 'no') {
    return parts.slice(1).join('') + 'Detected';
  } else if (parts[0] === 'require') {
    return parts.slice(1).join('') + 'Required';
  } else if (parts[0] === 'detect') {
    return parts.slice(1).join('') + 'Detected';
  }
  return ruleName.replace(/-/g, '');
}

function getErrorMessage(rule) {
  if (rule.name.startsWith('no-')) {
    return `${rule.description.replace('Disallow ', '').replace('Prevent ', '').replace('Detect ', '')} detected`;
  } else if (rule.name.startsWith('require-')) {
    return `${rule.description.replace('Require ', '').replace('Enforce ', '')} is required`;
  } else if (rule.name.startsWith('detect-')) {
    return `${rule.description.replace('Detect ', '').replace('Identify ', '')} detected`;
  }
  return rule.description;
}
