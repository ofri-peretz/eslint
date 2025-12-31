---
title: 'The CTO Security Checklist: 15 Questions to Ask Your Engineering Team'
published: false
description: 'Not sure if your engineering team is building securely? Here are 15 questions that reveal the truth—and what the answers should be.'
tags: security, leadership, cto, startup
cover_image:
series: Engineering Leadership
---

# The CTO Security Checklist: 15 Questions to Ask Your Engineering Team

You're a CTO. You're responsible for security. But you're not writing code every day.

How do you know if your team is building securely?

Here are 15 questions that reveal the truth.

## The Fundamentals

### 1. "Where do we store secrets?"

**🚩 Red flag**: "In the codebase / in .env files we commit"

**✅ Good answer**: "AWS Secrets Manager / Vault / environment variables injected at runtime"

### 2. "How do we handle database queries?"

**🚩 Red flag**: "String concatenation" / blank stare

**✅ Good answer**: "Parameterized queries everywhere, enforced by linting"

### 3. "What happens when someone pushes a vulnerability?"

**🚩 Red flag**: "We catch it in code review... usually"

**✅ Good answer**: "CI blocks the merge. Here's the security gate."

## The Process

### 4. "When was our last security audit?"

**🚩 Red flag**: "Never" / "Before I joined"

**✅ Good answer**: "We run automated scans daily. Last pen test was [date]."

### 5. "How do we handle security vulnerabilities in dependencies?"

**🚩 Red flag**: "We run npm audit sometimes"

**✅ Good answer**: "Dependabot/Renovate auto-PRs. Critical vulns block merges."

### 6. "What's our incident response plan?"

**🚩 Red flag**: "We'd figure it out"

**✅ Good answer**: "Documented runbook. Last drill was [date]."

## The Technical

### 7. "How do we authenticate users?"

Listen for: MFA, JWT best practices, session management, rate limiting

### 8. "Where is PII stored and who can access it?"

Listen for: Encryption at rest, audit logs, access controls

### 9. "How do we handle file uploads?"

Listen for: File type validation, size limits, sandboxed storage

### 10. "What's in our Content Security Policy?"

**🚩 Red flag**: "Our what?"

**✅ Good answer**: "`default-src 'self'`. Here's the full policy."

## The Culture

### 11. "How do developers learn about security?"

Listen for: Training, lunch & learns, security champions

### 12. "When did a developer last report a security concern?"

**🚩 Red flag**: "Never" (either no concerns or no reporting culture)

**✅ Good answer**: "Last week. Here's how we handle them."

### 13. "Who owns security on the team?"

**🚩 Red flag**: "Everyone" (means no one)

**✅ Good answer**: "[Name] is our security champion. They review all auth changes."

## The Compliance

### 14. "What compliance frameworks apply to us?"

Know your obligations: SOC2, HIPAA, PCI-DSS, GDPR

### 15. "How do we generate audit evidence?"

**🚩 Red flag**: "We scramble before audits"

**✅ Good answer**: "Automated. Every commit generates compliance artifacts."

## The Scorecard

| Score         | Assessment                                       |
| ------------- | ------------------------------------------------ |
| 0-5 correct   | 🔴 Critical gaps. Prioritize immediately.        |
| 6-10 correct  | 🟡 Foundational issues. 90-day improvement plan. |
| 11-14 correct | 🟢 Solid baseline. Focus on maturity.            |
| 15 correct    | ⭐ Security-mature. Maintain and evolve.         |

## Quick Wins to Implement

If you scored below 10, start here:

```bash
# 1. Install security linting (30 minutes)
npm install --save-dev eslint-plugin-secure-coding

# 2. Add to CI (1 hour)
# Block PRs with security violations

# 3. Enable secret scanning (15 minutes)
# GitHub Settings → Security → Secret scanning

# 4. Run dependency audit (15 minutes)
npm audit --audit-level=high
```

---

{% cta https://npmjs.com/package/eslint-plugin-secure-coding %}
📦 Start with Automated Security Linting
{% endcta %}

---

🚀 **What questions do you ask your team about security?**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
