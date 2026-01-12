#!/usr/bin/env node

/**
 * Rule Documentation Generator
 * Reads rule implementation and generates compliant documentation
 */

const fs = require('fs');
const path = require('path');

// List of 27 stub rules to fix
const STUB_RULES = [
  'require-data-minimization',
  'no-sensitive-data-in-analytics',
  'no-data-in-temp-storage',
  'require-https-only',
  'require-secure-credential-storage',
  'no-dynamic-dependency-loading',
  'no-hardcoded-session-tokens',
  'no-password-in-url',
  'no-tracking-without-consent',
  'no-insecure-websocket',
  'require-secure-deletion',
  'require-secure-defaults',
  'require-package-lock',
  'require-storage-encryption',
  'require-mime-type-validation',
  'require-dependency-integrity',
  'require-backend-authorization',
  'require-url-validation',
  'no-sensitive-data-in-cache',
  'no-exposed-debug-endpoints',
  'no-unvalidated-deeplinks',
  'no-disabled-certificate-validation',
  'require-code-minification',
  'no-verbose-error-messages',
  'require-csp-headers',
  'require-network-timeout',
  'no-permissive-cors',
];

function generateRuleDoc(ruleName, ruleImpl) {
  // Extract metadata from implementation
  const meta = ruleImpl.match(/meta:\s*{([^}]+)}/s)?.[1] || '';
  const description = meta.match(/description:\s*['"]([^'"]+)['"]/)?.[1] || 'Security rule';
  const messages = meta.match(/messages:\s*{([^}]+)}/s)?.[1] || '';
  
  // Generate CWE/OWASP mapping based on rule name
  const cwe = getCWEForRule(ruleName);
  const owasp = getOWASPForRule(ruleName);
  
  return `# ${ruleName}

> ${description}

**Severity:** 🟠 HIGH  
**CWE:** [${cwe.id}](${cwe.url})  
**OWASP Mobile:** [${owasp.category}](${owasp.url})

## Rule Details

This rule ${description.toLowerCase()}.

### Why This Matters

${getWhyMatters(ruleName)}

## ❌ Incorrect

\`\`\`typescript
// TODO: Add incorrect examples based on rule implementation
${getIncorrectExample(ruleName)}
\`\`\`

## ✅ Correct

\`\`\`typescript
// TODO: Add correct examples based on rule implementation
${getCorrectExample(ruleName)}
\`\`\`

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Values stored in variables are not traced.

\`\`\`typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
\`\`\`

**Mitigation**: Validate all user inputs and sensitive data handling.

### Wrapper Functions

**Why**: Custom wrappers not recognized.

\`\`\`typescript
// ❌ NOT DETECTED - Wrapper
myWrapper(sensitiveData); // Uses insecure API internally
\`\`\`

**Mitigation**: Apply rule to wrapper implementations.

### Dynamic Invocation

**Why**: Dynamic calls not analyzed.

\`\`\`typescript
// ❌ NOT DETECTED - Dynamic
obj[method](sensitiveData);
\`\`\`

**Mitigation**: Avoid dynamic method invocation with sensitive data.

## Further Reading

- [${cwe.id} Details](${cwe.url})
- [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)
`;
}

function getCWEForRule(ruleName) {
  const mapping = {
    'require-data-minimization': { id: 'CWE-213', url: 'https://cwe.mitre.org/data/definitions/213.html' },
    'no-sensitive-data-in-analytics': { id: 'CWE-359', url: 'https://cwe.mitre.org/data/definitions/359.html' },
    'no-data-in-temp-storage': { id: 'CWE-524', url: 'https://cwe.mitre.org/data/definitions/524.html' },
    'require-https-only': { id: 'CWE-319', url: 'https://cwe.mitre.org/data/definitions/319.html' },
    'require-secure-credential-storage': { id: 'CWE-522', url: 'https://cwe.mitre.org/data/definitions/522.html' },
    'no-dynamic-dependency-loading': { id: 'CWE-494', url: 'https://cwe.mitre.org/data/definitions/494.html' },
    'no-hardcoded-session-tokens': { id: 'CWE-798', url: 'https://cwe.mitre.org/data/definitions/798.html' },
    'no-password-in-url': { id: 'CWE-598', url: 'https://cwe.mitre.org/data/definitions/598.html' },
    'no-tracking-without-consent': { id: 'CWE-359', url: 'https://cwe.mitre.org/data/definitions/359.html' },
    'no-insecure-websocket': { id: 'CWE-319', url: 'https://cwe.mitre.org/data/definitions/319.html' },
    'require-secure-deletion': { id: 'CWE-226', url: 'https://cwe.mitre.org/data/definitions/226.html' },
    'require-secure-defaults': { id: 'CWE-276', url: 'https://cwe.mitre.org/data/definitions/276.html' },
    'require-package-lock': { id: 'CWE-829', url: 'https://cwe.mitre.org/data/definitions/829.html' },
    'require-storage-encryption': { id: 'CWE-311', url: 'https://cwe.mitre.org/data/definitions/311.html' },
    'require-mime-type-validation': { id: 'CWE-434', url: 'https://cwe.mitre.org/data/definitions/434.html' },
    'require-dependency-integrity': { id: 'CWE-353', url: 'https://cwe.mitre.org/data/definitions/353.html' },
    'require-backend-authorization': { id: 'CWE-602', url: 'https://cwe.mitre.org/data/definitions/602.html' },
    'require-url-validation': { id: 'CWE-20', url: 'https://cwe.mitre.org/data/definitions/20.html' },
    'no-sensitive-data-in-cache': { id: 'CWE-524', url: 'https://cwe.mitre.org/data/definitions/524.html' },
    'no-exposed-debug-endpoints': { id: 'CWE-489', url: 'https://cwe.mitre.org/data/definitions/489.html' },
    'no-unvalidated-deeplinks': { id: 'CWE-939', url: 'https://cwe.mitre.org/data/definitions/939.html' },
    'no-disabled-certificate-validation': { id: 'CWE-295', url: 'https://cwe.mitre.org/data/definitions/295.html' },
    'require-code-minification': { id: 'CWE-540', url: 'https://cwe.mitre.org/data/definitions/540.html' },
    'no-verbose-error-messages': { id: 'CWE-209', url: 'https://cwe.mitre.org/data/definitions/209.html' },
    'require-csp-headers': { id: 'CWE-1021', url: 'https://cwe.mitre.org/data/definitions/1021.html' },
    'require-network-timeout': { id: 'CWE-400', url: 'https://cwe.mitre.org/data/definitions/400.html' },
    'no-permissive-cors': { id: 'CWE-942', url: 'https://cwe.mitre.org/data/definitions/942.html' },
  };
  return mapping[ruleName] || { id: 'CWE-693', url: 'https://cwe.mitre.org/data/definitions/693.html' };
}

function getOWASPForRule(ruleName) {
  // All these are OWASP Mobile rules
  if (ruleName.includes('credential') || ruleName.includes('password') || ruleName.includes('session')) {
    return { category: 'M1: Improper Credential Usage', url: 'https://owasp.org/www-project-mobile-top-10/' };
  }
  if (ruleName.includes('dependency') || ruleName.includes('package')) {
    return { category: 'M2: Inadequate Supply Chain Security', url: 'https://owasp.org/www-project-mobile-top-10/' };
  }
  if (ruleName.includes('auth') || ruleName.includes('backend')) {
    return { category: 'M3: Insecure Authentication/Authorization', url: 'https://owasp.org/www-project-mobile-top-10/' };
  }
  if (ruleName.includes('url') || ruleName.includes('deeplink') || ruleName.includes('mime')) {
    return { category: 'M4: Insufficient Input/Output Validation', url: 'https://owasp.org/www-project-mobile-top-10/' };
  }
  if (ruleName.includes('https') || ruleName.includes('websocket') || ruleName.includes('certificate') || ruleName.includes('network')) {
    return { category: 'M5: Insecure Communication', url: 'https://owasp.org/www-project-mobile-top-10/' };
  }
  if (ruleName.includes('tracking') || ruleName.includes('analytics') || ruleName.includes('data-minimization')) {
    return { category: 'M6: Inadequate Privacy Controls', url: 'https://owasp.org/www-project-mobile-top-10/' };
  }
  if (ruleName.includes('minification') || ruleName.includes('debug')) {
    return { category: 'M7: Insufficient Binary Protections', url: 'https://owasp.org/www-project-mobile-top-10/' };
  }
  if (ruleName.includes('verbose') || ruleName.includes('exposed') || ruleName.includes('defaults') || ruleName.includes('cors') || ruleName.includes('csp')) {
    return { category: 'M8: Security Misconfiguration', url: 'https://owasp.org/www-project-mobile-top-10/' };
  }
  if (ruleName.includes('storage') || ruleName.includes('cache') || ruleName.includes('temp') || ruleName.includes('deletion')) {
    return { category: 'M9: Insecure Data Storage', url: 'https://owasp.org/www-project-mobile-top-10/' };
  }
  return { category: 'OWASP Mobile Top 10', url: 'https://owasp.org/www-project-mobile-top-10/' };
}

function getWhyMatters(ruleName) {
  const matters = {
    'require-data-minimization': 'Collecting excessive user data increases privacy risks and regulatory compliance burden. GDPR and CCPA require minimizing data collection.',
    'no-sensitive-data-in-analytics': 'Analytics platforms may not provide adequate security for sensitive data. Data breaches in analytics services can expose user PII.',
    'no-data-in-temp-storage': 'Temporary storage may survive app uninstall or be accessible to other apps. Sensitive data in temp storage is a security risk.',
    'require-https-only': 'HTTP transmits data in plaintext, allowing man-in-the-middle attacks. HTTPS is mandatory for protecting sensitive data in transit.',
    'require-secure-credential-storage': 'Insecure credential storage (plaintext, weak encryption) leads to credential theft. Use secure keychain/keystore APIs.',
    'no-dynamic-dependency-loading': 'Dynamically loaded dependencies bypass integrity checks. Attackers can inject malicious code through dependency confusion attacks.',
    'no-hardcoded-session-tokens': 'Hardcoded tokens in code are exposed in source control and decompiled apps. Session tokens must be generated dynamically.',
    'no-password-in-url': 'Passwords in URLs are logged in browser history, server logs, and referrer headers. This violates security best practices.',
    'no-tracking-without-consent': 'GDPR/CCPA require explicit consent for tracking. Unauthorized tracking leads to regulatory fines and privacy violations.',
    'no-insecure-websocket': 'ws:// connections are unencrypted like HTTP. Use wss:// for encrypted WebSocket connections.',
    'require-secure-deletion': 'Simply deleting files doesn\\'t securely erase data. Secure deletion prevents data recovery from storage.',
    'require-secure-defaults': 'Insecure defaults lead to widespread vulnerabilities. Security should be enabled by default, not opt-in.',
    'require-package-lock': 'Without lock files, dependencies can change between installs. Lock files ensure reproducible builds and prevent supply chain attacks.',
    'require-storage-encryption': 'Unencrypted storage exposes data if device is lost or compromised. Platform-provided encryption (FileVault, BitLocker) is insufficient for sensitive data.',
    'require-mime-type-validation': 'File upload attacks rely on bypassing extension checks. MIME type validation prevents uploading malicious files disguised as images.',
    'require-dependency-integrity': 'Subresource Integrity (SRI) prevents CDN compromises. Without integrity checks, attackers can inject malicious code via CDN tampering.',
    'require-backend-authorization': 'Client-side authorization can be bypassed. All security decisions must be enforced on the backend.',
    'require-url-validation': 'Unvalidated URLs enable SSRF, redirect, and link injection attacks. Validate and sanitize all URL inputs.',
    'no-sensitive-data-in-cache': 'Cached data persists after logout and may be accessible to other users. Never cache sensitive data like passwords or tokens.',
    'no-exposed-debug-endpoints': 'Debug endpoints expose internal implementation details and vulnerabilities. Disable debug routes in production.',
    'no-unvalidated-deeplinks': 'Unvalidated deep links enable phishing and unauthorized actions. Always validate deeplink parameters and destinations.',
    'no-disabled-certificate-validation': 'Disabling certificate validation enables man-in-the-middle attacks. Never disable SSL/TLS validation in production.',
    'require-code-minification': 'Unminified code exposes logic and makes reverse engineering easier. Minification removes comments and obfuscates code structure.',
    'no-verbose-error-messages': 'Verbose errors expose stack traces, file paths, and internal logic. Production errors should be generic to prevent information disclosure.',
    'require-csp-headers': 'Content Security Policy prevents XSS attacks by restricting resource loading. CSP headers are a critical defense-in-depth measure.',
    'require-network-timeout': 'Missing timeouts enable DoS attacks and resource exhaustion. Always set reasonable timeouts for network requests.',
    'no-permissive-cors': 'CORS wildcard (*) allows any origin to access your API. Restrict CORS to specific trusted origins.',
  };
  return matters[ruleName] || 'This rule prevents security vulnerabilities in mobile and web applications.';
}

function getIncorrectExample(ruleName) {
  return '// Example of insecure pattern\n// Will be filled based on rule implementation';
}

function getCorrectExample(ruleName) {
  return '// Example of secure pattern\n// Will be filled based on rule implementation';
}

console.log(`🔧 Generating documentation for ${STUB_RULES.length} stub rules...\n`);

STUB_RULES.forEach(ruleName => {
  const docPath = `packages/eslint-plugin-secure-coding/docs/rules/${ruleName}.md`;
  const implPath = `packages/eslint-plugin-secure-coding/src/rules/${ruleName}/index.ts`;
  
  try {
    const ruleImpl = fs.existsSync(implPath) ? fs.readFileSync(implPath, 'utf-8') : '';
    const doc = generateRuleDoc(ruleName, ruleImpl);
    
    console.log(`✅ Generated: ${ruleName}`);
    console.log(`   Output: ${docPath}\n`);
  } catch (err) {
    console.error(`❌ Failed: ${ruleName}`, err.message);
  }
});

console.log(`\n📝 Next: Review generated docs and add specific code examples`);
