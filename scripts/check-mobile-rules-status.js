#!/usr/bin/env node
/**
 * Implementation Status Check for Mobile Security Rules
 */

const fs = require('fs');
const path = require('path');

const MOBILE_RULES = [
  // M1: Credential Security
  'no-credentials-in-storage-api',
  'no-credentials-in-query-params', 
  'require-secure-credential-storage',
  
  // M2: Supply Chain
  'require-dependency-integrity',
  'detect-suspicious-dependencies',
  'no-dynamic-dependency-loading',
  'require-package-lock',
  
  // M3: Authentication
  'no-client-side-auth-logic',
  'require-backend-authorization',
  'no-hardcoded-session-tokens',
  'detect-weak-password-validation',
  'no-password-in-url',
  
  // M4: Input/Output
  'no-unvalidated-deeplinks',
  'require-url-validation',
  'no-arbitrary-file-access',
  'require-mime-type-validation',
  'no-postmessage-origin-wildcard',
  'require-csp-headers',
  
  // M5: Communication
  'no-http-urls',
  'no-disabled-certificate-validation',
  'require-https-only',
  'no-insecure-websocket',
  'detect-mixed-content',
  'no-allow-arbitrary-loads',
  'require-network-timeout',
  
  // M6: Privacy
  'no-pii-in-logs',
  'no-tracking-without-consent',
  'require-data-minimization',
  'no-sensitive-data-in-analytics',
  
  // M7: Code Protection
  'no-debug-code-in-production',
  'require-code-minification',
  
  // M8: Configuration
  'no-verbose-error-messages',
  'no-exposed-debug-endpoints',
  'require-secure-defaults',
  'no-permissive-cors',
  
  // M9: Data Storage
  'no-unencrypted-local-storage',
  'no-sensitive-data-in-cache',
  'require-storage-encryption',
  'no-data-in-temp-storage',
  'require-secure-deletion',
];

const rulesDir = path.join(__dirname, '..', 'packages', 'eslint-plugin-secure-coding', 'src', 'rules');

console.log('\n📊 Checking implementation status of 40 mobile security rules...\n');

let hasImplementation = 0;
let needsImplementation = 0;

MOBILE_RULES.forEach((ruleName, index) => {
  const ruleFile = path.join(rulesDir, ruleName, 'index.ts');
  
  if (!fs.existsSync(ruleFile)) {
    console.log(`❌ ${index + 1}/${MOBILE_RULES.length}: ${ruleName} - FILE MISSING`);
    needsImplementation++;
    return;
  }
  
  const content = fs.readFileSync(ruleFile, 'utf8');
  
  // Check if it has TODO or placeholder implementation
  if (content.includes('// TODO:') || content.includes('// Add implementation here')) {
    console.log(`⚠️  ${index + 1}/${MOBILE_RULES.length}: ${ruleName} - NEEDS IMPLEMENTATION`);
    needsImplementation++;
  } else {
    console.log(`✅ ${index + 1}/${MOBILE_RULES.length}: ${ruleName} - IMPLEMENTED`);
    hasImplementation++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   ✅ Implemented: ${hasImplementation} rules`);
console.log(`   ⚠️  Need work: ${needsImplementation} rules`);
console.log(`\n📝 Total: ${MOBILE_RULES.length} mobile security rules\n`);

process.exit(needsImplementation > 0 ? 1 : 0);
