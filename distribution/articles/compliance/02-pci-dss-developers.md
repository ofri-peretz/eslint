---
title: 'PCI-DSS for Developers: The 7 Controls That Actually Affect Your Code'
published: false
description: 'PCI-DSS has 300+ requirements. Here are the 7 that directly impact how you write code—and how to automate compliance.'
tags: security, compliance, pcidss, fintech
cover_image:
series: Compliance Automation
---

PCI-DSS v4.0 has 300+ requirements. Most developers glaze over when compliance comes up.

But **only 7 directly affect your code**. Master these, and you're 90% compliant.

## The 7 Developer-Facing Controls

### 1. Requirement 6.2.4: Secure Coding Training

You need evidence of secure coding practices. An ESLint security configuration IS that evidence.

```javascript
// Evidence of training: Developers can't ship vulnerable patterns
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.strict];
```

### 2. Requirement 6.3.1: Identify Vulnerabilities

```bash
# Daily vulnerability scanning
npx eslint . --format json > pci-scan-$(date +%Y-%m-%d).json
```

### 3. Requirement 6.4.1: Protect Against Known Attacks

| Attack        | PCI Control | ESLint Rule          |
| ------------- | ----------- | -------------------- |
| SQL Injection | 6.4.1       | `no-sql-injection`   |
| XSS           | 6.4.1       | `no-innerhtml-xss`   |
| CSRF          | 6.4.1       | `require-csrf-token` |

### 4. Requirement 6.5.1: Injection Flaws

```javascript
// ❌ Flagged
db.query(`SELECT * FROM cards WHERE id = ${cardId}`);

// ✅ Compliant
db.query('SELECT * FROM cards WHERE id = $1', [cardId]);
```

### 5. Requirement 6.5.3: Insecure Cryptography

```javascript
// ❌ Flagged: MD5 is not PCI compliant
crypto.createHash('md5').update(cardNumber);

// ✅ Compliant
crypto.createHash('sha256').update(cardNumber);
```

### 6. Requirement 6.5.4: Insecure Communications

```javascript
// ❌ Flagged
fetch('http://api.payment.com/charge');

// ✅ Compliant
fetch('https://api.payment.com/charge');
```

### 7. Requirement 8.3.1: Strong Authentication

```javascript
// ❌ Flagged: Weak password policy
if (password.length >= 6) {
}

// ✅ Compliant: Strong policy
if (password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
}
```

## The PCI Evidence Package

Every scan generates tagged output:

```bash
src/payment/charge.ts
  42:10  error  🔒 CWE-89 [PCI-DSS-6.5.1] | SQL Injection
  67:3   error  🔒 CWE-327 [PCI-DSS-6.5.3] | Weak cryptography
```

## QSA-Ready Reports

```bash
# Generate QSA-ready report
npx eslint . --format json | jq '
  [.[] | .messages[] |
   select(.message | contains("PCI"))] |
  group_by(.ruleId)
' > qsa-evidence.json
```

---


---

🚀 **Are you PCI compliant? What's your biggest compliance pain point?**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
