---
title: 'From Developer to Security Champion: A 12-Week Roadmap'
published: false
description: 'Want to become your team is security expert? Here is the 12-week plan I used to transition from full-stack to security-focused engineering.'
tags: career, security, learning, beginners
cover_image:
series: Career Growth
---

# From Developer to Security Champion: A 12-Week Roadmap

Every team needs a Security Champion—someone who bridges the gap between development velocity and security requirements.

Here's the 12-week roadmap I used to become that person.

## Week 1-2: The Foundations

### Read

- OWASP Top 10 (Web) - 2 hours
- OWASP Top 10 (API) - 2 hours
- CWE Top 25 Most Dangerous Weaknesses - 1 hour

### Do

```bash
# Install a security linter on your project
npm install --save-dev eslint-plugin-secure-coding

# Run your first scan
npx eslint . 2>&1 | head -50
```

**Goal**: Understand the vulnerability landscape.

## Week 3-4: Injection Attacks

### Study

- SQL Injection (CWE-89)
- Command Injection (CWE-78)
- XSS (CWE-79)

### Practice

Find all injection vulnerabilities in your codebase:

```bash
npx eslint . --rule 'pg/no-unsafe-query: error' --rule 'secure-coding/no-command-injection: error'
```

**Goal**: Fix 5 real injection vulnerabilities.

## Week 5-6: Authentication & Sessions

### Study

- JWT security risks
- Session management
- Password storage

### Project

Audit your app's authentication flow:

- [ ] Passwords hashed with bcrypt/argon2?
- [ ] JWTs have reasonable expiration?
- [ ] Refresh token rotation?
- [ ] Rate limiting on login?

**Goal**: Create an auth security checklist for your team.

## Week 7-8: Cryptography

### Study

- When to use symmetric vs asymmetric
- Why MD5/SHA1 are broken
- Timing attacks

### Practice

```bash
# Find weak crypto in your codebase
npx eslint . --rule 'crypto/no-weak-hash: error'
```

**Goal**: Replace all MD5/SHA1 with SHA256+.

## Week 9-10: Secure Architecture

### Study

- Threat modeling (STRIDE)
- Defense in depth
- Least privilege principle

### Project

Create a threat model for one feature in your app:

1. Identify assets (what are you protecting?)
2. Identify threats (who wants access?)
3. Identify controls (how do you stop them?)

**Goal**: Present a threat model to your team.

## Week 11-12: Automation & Leadership

### Study

- CI/CD security gates
- Security metrics
- Incident response basics

### Project

Implement security automation:

```yaml
# .github/workflows/security.yml
- name: Security Scan
  run: npx eslint . --max-warnings 0

- name: Dependency Audit
  run: npm audit --audit-level=high
```

**Goal**: Zero security regressions on new PRs.

## The Ongoing Practice

After 12 weeks, maintain momentum:

| Cadence   | Activity                         |
| --------- | -------------------------------- |
| Daily     | Review security lint errors      |
| Weekly    | Read 1 CVE disclosure            |
| Monthly   | Present a security topic to team |
| Quarterly | Update threat models             |

## Recommended Resources

### Books

- "The Web Application Hacker's Handbook"
- "Secure by Design"

### Courses

- PortSwigger Web Security Academy (free)
- OWASP WebGoat (free)

### Certifications (optional)

- CompTIA Security+
- OSCP (if you want to go deep)

## The Career Impact

Security Champions are rare and valuable:

| Metric             | Average Dev | Security Champion |
| ------------------ | ----------- | ----------------- |
| Market Rate        | $120K       | $150K+            |
| Interview Success  | 30%         | 60%+              |
| Promotion Timeline | 3 years     | 2 years           |

---

{% cta https://npmjs.com/package/eslint-plugin-secure-coding %}
📦 Start Your Security Journey
{% endcta %}

---

🚀 **Are you on the path to Security Champion? Share your journey!**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
