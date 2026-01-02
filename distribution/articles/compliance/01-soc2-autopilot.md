---
title: 'SOC2 Compliance on Autopilot: How ESLint Generates Your Audit Evidence'
published: false
description: 'Stop scrambling before audits. Here is how to generate continuous compliance evidence from your existing ESLint configuration.'
tags: security, compliance, soc2, devops
cover_image:
series: Compliance Automation
---

Every quarter, the same panic: "The auditors are coming. Where's our evidence?"

You scramble to screenshot dashboards, export logs, and pray you haven't missed anything.

**There's a better way.**

## The Problem: Compliance is a Point-in-Time Lie

Traditional compliance workflows:

1. Before audit: Sprint to collect evidence
2. During audit: Answer questions you can't answer
3. After audit: Forget everything until next quarter

This creates **compliance theater**—evidence that proves nothing about your actual security posture.

## The Solution: Continuous Evidence Generation

What if every code commit automatically generated audit evidence?

```bash
npx eslint . --format json | jq '[.[] | .messages[] | select(.ruleId | startswith("secure-coding/"))]' > compliance/$(date +%Y-%m-%d)-scan.json
```

Now you have timestamped, machine-readable evidence of:

- What was scanned
- What was found
- What was fixed

## Mapping Rules to SOC2 Controls

Modern security linting includes compliance tagging:

```bash
src/auth/login.ts
  18:5  error  🔒 CWE-798 CVSS:7.5 | Hardcoded credential [SOC2-CC6.1]
               Fix: Move to environment variable
```

| Control   | Requirement             | ESLint Rules                                     |
| --------- | ----------------------- | ------------------------------------------------ |
| **CC6.1** | Logical access controls | `no-hardcoded-credentials`, `require-auth-check` |
| **CC6.6** | Encryption in transit   | `require-https`, `no-http-urls`                  |
| **CC6.7** | Encryption at rest      | `require-storage-encryption`                     |
| **CC7.1** | Vulnerability detection | All security rules                               |

## CI/CD Integration

```yaml
# .github/workflows/compliance.yml
- name: Security Scan
  run: npx eslint . --format json > scan-results.json

- name: Archive Evidence
  uses: actions/upload-artifact@v4
  with:
    name: soc2-evidence-${{ github.sha }}
    path: scan-results.json
    retention-days: 365
```

Every merge to main generates cryptographically-timestamped evidence.

## The Auditor Conversation

**Before**: "Can you prove you scan for vulnerabilities?"

**After**: "Here's 365 daily scans linked to specific commits. Each finding is tagged to SOC2 controls. Here's our remediation velocity chart."

## Quick Setup

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  secureCoding.configs.recommended,
  {
    settings: {
      'secure-coding': {
        // Enable compliance tags in output
        complianceMode: true,
        frameworks: ['soc2', 'pci-dss'],
      },
    },
  },
];
```

---


---

🚀 **How do you handle compliance evidence? Share your workflow!**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
