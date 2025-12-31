# ✅ Article Quality Checklist: Mandatory Standards for Every Release

> **Purpose**: This document defines the **mandatory requirements** and **quality gates** every article must pass before publishing. It complements `DEV_TO_BEST_PRACTICES.md` with hard requirements that emerged from a comprehensive portfolio review (Dec 2025).

---

## 📋 Table of Contents

1. [Pre-Publish Quality Gates](#1-pre-publish-quality-gates)
2. [Cross-Linking Requirements](#2-cross-linking-requirements)
3. [Authority & Social Proof](#3-authority--social-proof)
4. [Tag Strategy Matrix](#4-tag-strategy-matrix)
5. [Content Enrichment Standards](#5-content-enrichment-standards)
6. [Distribution Checklist](#6-distribution-checklist)
7. [Quick Copy-Paste Templates](#7-quick-copy-paste-templates)

---

## 1. Pre-Publish Quality Gates

### 🔴 MUST HAVE (Blocking)

Every article **MUST** include all of the following before publishing:

| Requirement                      | Description                                                   | Example                                                                   |
| -------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Internal Cross-Links**         | At least 2 links to other published articles in the ecosystem | `[SQL Injection deep dive](https://dev.to/ofri-peretz/sql-injection-...)` |
| **Ecosystem CTA Block**          | Standard footer with ⭐ GitHub + 📦 npm links                 | See [Template](#71-footer-cta-template)                                   |
| **High-Traffic Tags**            | Use at least 1 from the priority list                         | `#security`, `#javascript`, `#owasp`, `#cybersecurity`                    |
| **Structured Authority Signals** | At least 1 stat, benchmark, or real-world claim               | "In 47 audits, the average codebase had 12 critical issues"               |
| **Visual/Table Element**         | At least 1 comparison table or visual heatmap                 | Priority matrix, detection comparison                                     |
| **Engagement Hook (Closing)**    | Question to drive comments                                    | "What's the worst security bug you've inherited?"                         |

### 🟡 SHOULD HAVE (Strongly Recommended)

| Requirement                          | Description                                  | Impact                                   |
| ------------------------------------ | -------------------------------------------- | ---------------------------------------- |
| **Anonymized Case Study**            | Real-world scenario without identifying info | Builds credibility & relatability        |
| **Alternative for Complex Commands** | Simpler fallback for intimidating CLI        | Reduces friction for beginners           |
| **Time-to-Value Markers**            | "(2 minutes)", "(5 minutes)" in headers      | Sets expectations, improves scannability |

---

## 2. Cross-Linking Requirements

### 2.1 Mandatory Internal Links

**Every article must link to at least 2 related articles from the ecosystem.**

Use this matrix to identify relevant cross-links:

| If Article Is About...                | Must Link To...                                                                                |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| SQL Injection / `pg` plugin           | → Hardcoded Secrets article<br>→ 30-Minute Audit workflow                                      |
| Hardcoded Secrets / Credentials       | → Interview Cheat Sheet<br>→ 30-Minute Audit workflow                                          |
| JWT / Authentication                  | → Interview Cheat Sheet<br>→ Cryptography articles                                             |
| Vercel AI SDK / LLM Security          | → OWASP LLM Top 10 article<br>→ Prompt Injection article                                       |
| Performance (import, cycle detection) | → 30-Minute Audit (for "quick wins")<br>→ Enterprise security positioning                      |
| Interview Prep / Career               | → Link to EACH specialized deep-dive for drill-down                                            |
| 30-Minute Audit (Workflow)            | → SQL Injection deep dive<br>→ Hardcoded Secrets deep dive<br>→ Cryptography/Weak Hash article |

### 2.2 Link Placement Strategy

```markdown
## [Section About Problem]

[Content explaining the issue...]

> 📚 **Deep Dive**: For a complete breakdown of this vulnerability,
> see [SQL Injection in node-postgres: The Pattern Everyone Gets Wrong](https://dev.to/ofri-peretz/sql-injection-...).
```

**Alternative (inline):**

```markdown
This is the same pattern that causes [80% of SQL injection vulnerabilities](https://dev.to/ofri-peretz/sql-injection-...).
```

### 2.3 Series Interconnection

If an article is part of a series, it **MUST** include:

```markdown
---
📖 **This article is part of the [Security Workflows](https://dev.to/ofri-peretz/series/security-workflows) series:**

1. [The 30-Minute Security Audit](https://dev.to/ofri-peretz/the-30-minute-security-audit-...)
2. [SQL Injection Deep Dive](https://dev.to/ofri-peretz/sql-injection-...) ← You are here
3. [Hardcoded Secrets](https://dev.to/ofri-peretz/hardcoded-secrets-...)
---
```

---

## 3. Authority & Social Proof

### 3.1 Statistical Authority Claims

**Every article must include at least one quantifiable authority signal:**

| Type                  | Template                                            | Example                                             |
| --------------------- | --------------------------------------------------- | --------------------------------------------------- |
| **Audit Experience**  | "In X audits, Y% of codebases had [issue]"          | "In 47 audits, 80% had hardcoded credentials"       |
| **Benchmark Results** | "[Tool A] took Xs, [Tool B] took Ys"                | "import took 45s, dependencies took 0.4s"           |
| **Coverage Claim**    | "X rules covering Y% of [framework]"                | "75 rules covering 100% of OWASP Top 10"            |
| **Detection Stats**   | "Catches X% more vulnerabilities than [competitor]" | "2.83x more detections than eslint-plugin-security" |
| **Remediation Speed** | "Fix in X minutes" or "Y fixes auto-applied"        | "Most issues fixed with single keystroke"           |

### 3.2 Case Study Framework

For complex articles (tutorials, workflows), include an anonymized case study:

```markdown
## Real-World Example

> **Case Study**: A Series B fintech startup inherited a codebase during acquisition.
> Using this 30-minute audit approach, they discovered:
>
> - 23 SQL injection vulnerabilities
> - 8 hardcoded API keys
> - 4 weak cryptographic implementations
>
> Total remediation time: 3 days. Alternative (full pentest + consultants): 6 weeks.
```

**Rules for case studies:**

- ✅ Remove company names, specific product details
- ✅ Use industry verticals: "fintech startup", "e-commerce platform"
- ✅ Include quantifiable outcomes
- ❌ Never fabricate—use real experience or disclaim as hypothetical

---

## 4. Tag Strategy Matrix

### 4.1 Priority Tags (Use Often)

These tags have the highest discoverability on Dev.to:

| Tag           | When to Use            | Traffic Level    |
| ------------- | ---------------------- | ---------------- |
| `#javascript` | Any JS/Node content    | 🔥🔥🔥 Very High |
| `#security`   | Any security topic     | 🔥🔥 High        |
| `#webdev`     | Browser/frontend focus | 🔥🔥🔥 Very High |
| `#typescript` | TS-specific content    | 🔥🔥 High        |
| `#node`       | Node.js backend        | 🔥🔥 High        |
| `#devops`     | CI/CD, automation      | 🔥🔥 High        |
| `#tutorial`   | Step-by-step guides    | 🔥🔥 High        |

### 4.2 Underused High-Value Tags

**These tags are currently underutilized in the portfolio:**

| Tag              | Current Use | Recommended Use             |
| ---------------- | ----------- | --------------------------- |
| `#owasp`         | 1 article   | ALL security articles       |
| `#cybersecurity` | 0 articles  | ALL security articles       |
| `#devsecops`     | 1 article   | Audit/workflow articles     |
| `#programming`   | 0 articles  | General best practices      |
| `#ai`            | 2 articles  | All Vercel AI + LLM content |

### 4.3 Tag Combinations by Article Type

```yaml
# Security Deep-Dive
tags: javascript, security, owasp, cybersecurity

# AI Security
tags: ai, security, typescript, vercel

# Performance/Tooling
tags: javascript, performance, eslint, typescript

# Career/Interview
tags: career, security, javascript, interview

# Workflow/Process
tags: tutorial, security, devsecops, devops
```

---

## 5. Content Enrichment Standards

### 5.1 Approachability Fallbacks

For any technical command that might intimidate readers, provide an alternative:

````markdown
### Parse the Results

**Option A: Using jq (recommended)**

```bash
cat security-audit.json | jq '.[] | .messages[] | .ruleId' | sort | uniq -c | sort -rn
```
````

**Option B: Simple approach (no extra tools)**

```bash
# Just open the JSON and search for "ruleId" - count occurrences manually
grep -o '"ruleId":[^,]*' security-audit.json | sort | uniq -c | sort -rn
```

**Option C: Use the built-in summary**

```bash
npx eslint . --format=stylish  # Human-readable output with counts
```

````

### 5.2 Visual Priority Matrix

For audit/workflow articles, include a visual priority guide:

```markdown
## Priority Matrix

| Issue Type | Count | Severity | Fix Time | Priority |
|------------|-------|----------|----------|----------|
| SQL Injection (`pg/no-unsafe-query`) | 15 | 🔴 Critical | 10 min each | **P0 - FIX NOW** |
| Hardcoded Credentials | 8 | 🔴 Critical | 5 min each | **P0 - FIX NOW** |
| Weak Cryptography | 3 | 🟡 Medium | 15 min each | P1 - This Sprint |
| Missing Error Handling | 12 | 🟢 Low | 2 min each | P2 - Tech Debt |
````

### 5.3 Time-to-Value Headers

Add time estimates to actionable sections:

```markdown
### Step 1: Install (2 minutes)

### Step 2: Configure (3 minutes)

### Step 3: Run the Audit (5 minutes)

### Step 4: Analyze Results (20 minutes)
```

---

## 6. Distribution Checklist

### 6.1 Post-Publish Actions (Within 24 Hours)

After publishing, complete these distribution steps:

- [ ] **Reddit**: Post to 2+ relevant subreddits
  - `r/javascript` (200k+ members)
  - `r/node` (200k+ members)
  - `r/programming` (5M+ members) - only for high-quality posts
  - `r/cybersecurity` (500k+ members) - security content only
  - `r/webdev` (1M+ members)
- [ ] **LinkedIn**: Share with personal commentary
  - Add 2-3 sentence personal take
  - Tag relevant companies/people
  - Use 3-5 hashtags

- [ ] **Twitter/X**: Thread format
  - Hook tweet with key insight
  - 3-5 supporting tweets
  - Final tweet with link

- [ ] **Hacker News**: Submit for broad reach (use sparingly)
  - Only for truly novel content
  - Avoid self-promotion vibe

### 6.2 Engagement Response (48-72 Hours)

- [ ] Respond to every comment within 24 hours
- [ ] Thank early supporters
- [ ] Answer questions with depth (drives algorithm)
- [ ] Cross-link to other articles in responses when relevant

---

## 7. Quick Copy-Paste Templates

### 7.1 Footer CTA Template

```markdown
---
## Quick Install

📦 [`eslint-plugin-secure-coding`](https://npmjs.com/package/eslint-plugin-secure-coding) — 75 security rules
📦 [`eslint-plugin-pg`](https://npmjs.com/package/eslint-plugin-pg) — PostgreSQL security
📦 [`eslint-plugin-crypto`](https://npmjs.com/package/eslint-plugin-crypto) — Cryptography security

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
---

🚀 **[Your closing question here]**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
```

### 7.2 Cross-Link Callout Template

```markdown
> 📚 **Related**: [Article Title Here](https://dev.to/ofri-peretz/article-slug)
```

### 7.3 Authority Stats Template

```markdown
> 💡 **Based on real audits**: In [X] security reviews of Node.js codebases,
> [Y]% contained at least one instance of this vulnerability.
```

### 7.4 Series Navigation Template

```markdown
---

📖 **Series: [Series Name]**
← Previous: [Article Title](link) | **Current** | Next: [Article Title](link) →

---
```

### 7.5 Case Study Template

```markdown
## Real-World Impact

> **Case Study**: A [industry] company [scenario].
>
> **Before**: [Problem state with metrics]
> **After**: [Improved state with metrics]
> **Time to resolution**: [Duration]
```

---

## 📊 Per-Article Scorecard

Before publishing, score your article:

| Criteria                                           | Points | Your Score  |
| -------------------------------------------------- | ------ | ----------- |
| **Cross-links**: 2+ internal links                 | 20     | \_\_\_ / 20 |
| **Tags**: Uses 1+ priority underused tag           | 15     | \_\_\_ / 15 |
| **Authority**: 1+ quantifiable stat                | 20     | \_\_\_ / 20 |
| **Visual**: Table or heatmap included              | 15     | \_\_\_ / 15 |
| **Approachability**: Fallback for complex commands | 10     | \_\_\_ / 10 |
| **Engagement**: Closing question                   | 10     | \_\_\_ / 10 |
| **CTA**: Standard footer template                  | 10     | \_\_\_ / 10 |

**Minimum score to publish: 80/100**

---

_Last updated: 2025-12-31_
_Companion to: `DEV_TO_BEST_PRACTICES.md`, `STRATEGY.md`_
