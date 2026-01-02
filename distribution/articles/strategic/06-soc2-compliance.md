---
title: 'SOC2 Compliance with ESLint: Automated Evidence Collection'
published: false
description: 'Pass your SOC2 audit with automated linting. Here is how ESLint generates compliance evidence.'
tags: security, compliance, soc2, eslint
cover_image:
series: Compliance
---

> "How do you ensure code security?"

Every SOC2 audit asks this question. Here's how to answer with **automated evidence**.

## The Compliance Gap

| Manual Approach          | Automated Approach                                   |
| ------------------------ | ---------------------------------------------------- |
| "We do code reviews"     | "Every commit is scanned for 89 CWE vulnerabilities" |
| "Developers are trained" | "Violations are blocked in CI"                       |
| "We follow OWASP"        | "Here's the report mapping to OWASP Top 10"          |

## SOC2 Trust Service Criteria Mapping

### CC6.1: Logical Access Controls

```javascript
// ESLint rules that provide evidence:
{
  'secure-coding/no-hardcoded-credentials': 'error',  // No embedded secrets
  'jwt/require-expiration': 'error',                  // Token lifetime limits
  'jwt/require-algorithm-whitelist': 'error',         // Algorithm controls
}
```

### CC6.6: Security Events

```javascript
{
  'lambda-security/no-error-swallowing': 'error',     // Errors logged
  'secure-coding/no-pii-in-logs': 'error',            // No PII in logs
}
```

### CC6.7: Data Protection

```javascript
{
  'crypto/no-weak-hash-algorithm': 'error',           // Strong encryption
  'crypto/require-authenticated-encryption': 'error', // Data integrity
  'browser-security/no-sensitive-localstorage': 'error', // Data at rest
}
```

### CC6.8: Vulnerability Management

```javascript
{
  'secure-coding/detect-eval-with-expression': 'error', // Injection prevention
  'pg/no-unsafe-query': 'error',                        // SQL injection
  'browser-security/no-innerhtml': 'error',             // XSS prevention
}
```

## Generating the Compliance Report

### Step 1: Run ESLint with JSON output

```bash
npx eslint . --format json > eslint-report.json
```

### Step 2: Parse for OWASP/CWE

```javascript
const report = require('./eslint-report.json');

const complianceData = {
  timestamp: new Date().toISOString(),
  totalFiles: report.length,
  findings: [],
};

for (const file of report) {
  for (const message of file.messages) {
    const cweMatch = message.message.match(/CWE-(\d+)/);
    const owaspMatch = message.message.match(/OWASP:([A-Z]\d+)/);

    if (cweMatch || owaspMatch) {
      complianceData.findings.push({
        file: file.filePath,
        line: message.line,
        cwe: cweMatch?.[0],
        owasp: owaspMatch?.[0],
        severity: message.severity === 2 ? 'error' : 'warning',
        rule: message.ruleId,
      });
    }
  }
}

console.log(JSON.stringify(complianceData, null, 2));
```

### Step 3: Generate Auditor Report

```javascript
// compliance-summary.js
const findings = complianceData.findings;

console.log('=== SOC2 Security Code Analysis Report ===');
console.log(`Date: ${complianceData.timestamp}`);
console.log(`Files Analyzed: ${complianceData.totalFiles}`);
console.log();

// Group by OWASP category
const byOwasp = findings.reduce((acc, f) => {
  const cat = f.owasp || 'Other';
  acc[cat] = acc[cat] || [];
  acc[cat].push(f);
  return acc;
}, {});

console.log('OWASP Top 10 Coverage:');
for (const [category, items] of Object.entries(byOwasp)) {
  console.log(`  ${category}: ${items.length} findings`);
}
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/security.yml
name: Security Compliance

on: [push, pull_request]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm ci

      - name: Run security linting
        run: npx eslint . --format json > eslint-report.json
        continue-on-error: true

      - name: Generate compliance report
        run: node scripts/compliance-summary.js

      - name: Upload compliance artifact
        uses: actions/upload-artifact@v3
        with:
          name: soc2-evidence-${{ github.sha }}
          path: eslint-report.json
```

## The Evidence Portfolio

For your SOC2 auditor, provide:

| Evidence Type        | File                     | Description                  |
| -------------------- | ------------------------ | ---------------------------- |
| Control Inventory    | `eslint.config.js`       | All enabled security rules   |
| Scan Results         | `eslint-report.json`     | Raw findings per commit      |
| Summary Report       | `compliance-summary.pdf` | Executive overview           |
| CI Logs              | GitHub Actions           | Proof of continuous scanning |
| Remediation Timeline | Git history              | Time-to-fix for findings     |

## Quick Configuration

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';
import pg from 'eslint-plugin-pg';
import jwt from 'eslint-plugin-jwt';
import crypto from 'eslint-plugin-crypto';

export default [
  // SOC2-focused configuration
  secureCoding.configs.strict,
  pg.configs.recommended,
  jwt.configs.recommended,
  crypto.configs.recommended,
];
```

## Quick Install


```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.strict];
```

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Compliance Templates](https://github.com/ofri-peretz/eslint/tree/main/templates/compliance)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Is your SOC2 evidence automated? Share your approach!**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
