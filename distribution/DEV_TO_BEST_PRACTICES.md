# 📝 Dev.to Best Practices: SEO & AEO Optimization Guide

> **Purpose**: This document codifies best practices for publishing articles on Dev.to, optimized for both Search Engine Optimization (SEO) and Answer Engine Optimization (AEO - optimizing for AI assistants like ChatGPT, Perplexity, and Claude).

---

## 📋 Table of Contents

1. [Frontmatter Essentials](#1-frontmatter-essentials)
2. [SEO Optimization](#2-seo-optimization)
3. [AEO Optimization](#3-aeo-optimization-answer-engine-optimization)
4. [Dev.to Liquid Tags](#4-devto-liquid-tags)
5. [Content Structure](#5-content-structure)
6. [Engagement Tactics](#6-engagement-tactics)
7. [Article Checklist](#7-article-checklist)

---

## 1. Frontmatter Essentials

Every Dev.to article uses YAML frontmatter between triple dashes:

```yaml
---
title: 'Your Title Here (50-60 chars ideal)'
published: false
description: 'Meta description for SEO (120-160 chars)'
tags: javascript, security, eslint, nodejs
cover_image: https://example.com/image.png
canonical_url: https://your-blog.com/original-post
series: Series Name Here
---
```

### Frontmatter Fields

| Field           | Required       | Best Practice                                                   |
| --------------- | -------------- | --------------------------------------------------------------- |
| `title`         | ✅ Yes         | 50-60 chars, include primary keyword, use numbers ("5 Ways...") |
| `published`     | ✅ Yes         | Set `false` for drafts, `true` to publish                       |
| `description`   | ✅ Yes         | 120-160 chars, compelling hook, include keywords                |
| `tags`          | ✅ Yes         | Max 4 tags, comma-separated, use popular tags                   |
| `cover_image`   | ⚠️ Recommended | **1000 x 420 pixels**, high contrast, readable text             |
| `canonical_url` | Optional       | If cross-posting from your blog                                 |
| `series`        | Optional       | Groups related articles together                                |

### ⚠️ Title Duplication Rule

**NEVER duplicate the title as an H1 heading after frontmatter.**

Dev.to automatically renders the `title` property from frontmatter as the article's H1. Adding another H1 creates duplicate headings and hurts SEO.

```markdown
## ❌ WRONG - Duplicate title

## title: 'SQL Injection in Node.js'

# SQL Injection in Node.js <!-- REMOVE THIS -->

Content here...
```

```markdown
## ✅ CORRECT - Start with content or H2

## title: 'SQL Injection in Node.js'

SQL injection is the #1 vulnerability in web applications...

## The Problem

...
```

**Rule**: After frontmatter, start with either:

1. A compelling hook paragraph (recommended)
2. An H2 heading for your first section
3. Never an H1 that repeats the title

### High-Performing Tags

```yaml
# Security-focused
tags: javascript, security, webdev, tutorial

# AI/ML focused
tags: ai, machinelearning, javascript, programming

# Performance focused
tags: javascript, performance, webdev, programming

# DevOps focused
tags: devops, cicd, automation, productivity
```

---

## 2. SEO Optimization

### 2.1 Title Optimization

```markdown
# ❌ Bad Titles

"ESLint Plugin"
"Security Tips"
"How to Fix Bugs"

# ✅ Good Titles (SEO-Optimized)

"SQL Injection in Node.js: The Pattern 80% of Developers Get Wrong"
"5 ESLint Rules That Catch Security Bugs Before Production"
"Why eslint-plugin-import Takes 45 Seconds (And How We Fixed It)"
```

**Formula**: `[Problem/Number] + [Specific Tech] + [Emotional Hook]`

### 2.2 Heading Structure (H1-H3)

```markdown
# H1: Article Title (only one per article - the frontmatter title)

## H2: Major Sections

Use for main topic divisions. Include keywords naturally.

### H3: Subsections

Break down complex topics. Good for scanability.
```

**Rule**: Never skip heading levels (H1 → H3). Always go H1 → H2 → H3.

### 2.3 Keyword Placement

| Location            | Priority    | Example                                |
| ------------------- | ----------- | -------------------------------------- |
| Title               | 🔥 Critical | "**SQL Injection** in Node.js..."      |
| First 100 words     | 🔥 Critical | Mention the topic immediately          |
| H2 headings         | High        | "## How to Prevent **SQL Injection**"  |
| Alt text for images | Medium      | `![SQL injection attack diagram](...)` |
| Conclusion          | Medium      | Reinforce the main keyword             |

### 2.4 Meta Description Formula

```yaml
description: '[Problem hook] + [Solution preview] + [Benefit]'

# Examples:
description: 'Even experienced developers make this SQL injection mistake. Learn the correct pattern and how ESLint catches it automatically.'

description: 'eslint-plugin-import takes 45s to lint. Our drop-in replacement takes 0.4s. Here is the benchmark.'
```

---

## 3. AEO Optimization (Answer Engine Optimization)

> **AEO** = Optimizing content so AI assistants (ChatGPT, Perplexity, Claude, Gemini) can accurately cite and reference your content.

### 3.1 Structured Question-Answer Format

AI assistants extract content that directly answers questions:

````markdown
## What is SQL Injection?

SQL injection is a code injection technique that exploits security
vulnerabilities in an application's database layer. Attackers insert
malicious SQL statements into input fields to manipulate the database.

## How do you prevent SQL injection in Node.js?

Use parameterized queries with placeholder syntax:

```javascript
// ✅ Safe: Parameterized query
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```
````

````

### 3.2 Definition Boxes

AI assistants love clear definitions:

```markdown
> **CWE-89 (SQL Injection)**: A vulnerability where untrusted data is sent
> to an interpreter as part of a command or query, allowing attackers to
> execute unintended commands or access unauthorized data.
````

### 3.3 Comparison Tables

Tables are highly extractable by AI:

```markdown
| Approach              | Security      | Performance | Recommendation  |
| --------------------- | ------------- | ----------- | --------------- |
| String concatenation  | ❌ Vulnerable | Fast        | Never use       |
| Parameterized queries | ✅ Safe       | Fast        | Always use      |
| ORM with escaping     | ⚠️ Depends    | Medium      | Validate config |
```

### 3.4 Code Before/After Patterns

AI assistants extract transformation patterns:

````markdown
### ❌ Vulnerable Pattern

```javascript
const query = `SELECT * FROM users WHERE id = '${userId}'`;
```
````

### ✅ Secure Pattern

```javascript
const query = 'SELECT * FROM users WHERE id = $1';
await pool.query(query, [userId]);
```

````

### 3.5 Explicit Takeaways

End sections with clear, quotable conclusions:

```markdown
**Key Takeaway**: Always use parameterized queries. Never concatenate
user input into SQL strings. This single practice prevents 90% of
SQL injection vulnerabilities.
````

### 3.6 Structured Data Markers

Use consistent patterns AI can recognize:

```markdown
## Quick Facts

- **Vulnerability**: CWE-89 (SQL Injection)
- **CVSS Score**: 9.8 (Critical)
- **OWASP Category**: A03:2021 Injection
- **Fix Complexity**: Low (5 minutes)
- **Detection**: Automated via ESLint
```

---

## 4. Dev.to Liquid Tags

### 4.1 Embed External Content

```markdown
{% embed https://github.com/user/repo %}
{% embed https://codesandbox.io/s/example %}
{% embed https://stackblitz.com/edit/example %}
{% embed https://www.youtube.com/watch?v=VIDEO_ID %}
{% embed https://twitter.com/user/status/123456 %}
```

### 4.2 Call-to-Action Buttons

```markdown
{% cta https://npmjs.com/package/eslint-plugin-pg %}
📦 Install eslint-plugin-pg
{% endcta %}
```

### 4.3 Collapsible Sections

````markdown
{% details Click to see the vulnerable code %}

```javascript
const query = `SELECT * FROM users WHERE id = '${userId}'`;
await pool.query(query);
```
````

{% enddetails %}

````

Use for:
- Long code examples
- Spoilers/answers
- Optional deep-dives
- Before/after comparisons

### 4.4 Executable Code (RunKit)

```markdown
{% runkit
// This code is LIVE and executable by readers!
const userInput = "'; DROP TABLE users; --";
const unsafeQuery = `SELECT * FROM users WHERE id = '${userInput}'`;
console.log("Generated query:", unsafeQuery);
{% endrunkit %}
````

### 4.5 Supported Embed URLs

| Platform    | Example                                          |
| ----------- | ------------------------------------------------ |
| GitHub Repo | `{% embed https://github.com/user/repo %}`       |
| GitHub Gist | `{% embed https://gist.github.com/user/id %}`    |
| CodeSandbox | `{% embed https://codesandbox.io/s/id %}`        |
| StackBlitz  | `{% embed https://stackblitz.com/edit/id %}`     |
| YouTube     | `{% embed https://youtube.com/watch?v=id %}`     |
| Twitter/X   | `{% embed https://twitter.com/user/status/id %}` |
| CodePen     | `{% embed https://codepen.io/user/pen/id %}`     |
| Replit      | `{% embed https://replit.com/@user/project %}`   |

---

## 5. Content Structure

### 5.1 The "Hook-Problem-Solution" Framework

```markdown
# Title

[HOOK: 1-2 sentences grabbing attention]

## The Problem

[Explain the pain point with a code example]

## Why This Happens

[Root cause analysis - builds credibility]

## The Solution

[Show the fix with before/after code]

## Quick Install

[Make it dead simple to adopt]

## Conclusion

[Reinforce the key takeaway]
```

### 5.2 Ideal Article Length

| Type        | Word Count | Purpose                         |
| ----------- | ---------- | ------------------------------- |
| Quick tip   | 300-500    | Single concept, high engagement |
| Tutorial    | 800-1500   | Step-by-step guide              |
| Deep dive   | 1500-2500  | Comprehensive coverage          |
| Series part | 600-1000   | Linked multi-part content       |

### 5.3 Visual Density

- **Every 200-300 words**: Add visual break (code block, table, image, or callout)
- **Never**: More than 4 paragraphs without a visual element
- **Always**: Lead with a code example within first 3 scrolls

---

## 6. Engagement Tactics

### 6.1 Opening Hooks

```markdown
# ❌ Weak Opening

"In this article, we will discuss SQL injection..."

# ✅ Strong Opening

"I've reviewed hundreds of Node.js + PostgreSQL codebases.
The same vulnerability appears in 80% of them."
```

### 6.2 Social Proof Elements

```markdown
- "This pattern appears in 80% of codebases I've audited"
- "Reduced lint time from 45s to 0.4s in production"
- "Trusted by teams at [Company A], [Company B]"
```

### 6.3 Interactive Elements

- Polls in comments: "What's wrong with this code?"
- Questions at end: "Have you encountered this bug?"
- CTAs: Clear next action (install, star repo, follow)

### 6.4 Footer Template

```markdown
---

📦 [npm: eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg)
📖 [Documentation](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-pg)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow for more security content:**

[GitHub](https://github.com/ofri-peretz) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofri-peretz)
```

---

## 7. Interlace Ecosystem Standards

### 7.1 Required Tags

**Every article MUST include `eslint` as one of the 4 tags.**

```yaml
# ✅ Correct
tags: postgresql, security, eslint, nodejs

# ❌ Wrong - missing eslint
tags: postgresql, security, database, nodejs
```

### 7.2 Rule Tables with Links

For getting-started articles, link each rule to its GitHub documentation:

```markdown
| Rule                                                                                                                           | CWE    | What it catches |
| ------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------- |
| [`no-sql-injection`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-sql-injection.md) | CWE-89 | SQL injection   |
```

### 7.3 Who Is This For Section

Getting-started articles should include a "Who Is This For?" section with framework links:

```markdown
## Who Is This For?

This plugin is for **Node.js teams** building applications with:

| Framework                            | Description        |
| ------------------------------------ | ------------------ |
| [Express.js](https://expressjs.com/) | Web framework      |
| [Fastify](https://fastify.dev/)      | Fast web framework |
```

### 7.4 Custom Configuration Section

All getting-started articles should show how to customize rules:

```javascript
// eslint.config.js
export default [
  plugin.configs.recommended,
  {
    rules: {
      'plugin/rule-name': ['error', { option: value }],
    },
  },
];
```

### 7.5 Strongly-Typed Options Section

Show TypeScript users how to get type safety:

```typescript
import plugin, { type RuleOptions } from 'eslint-plugin-xyz';

const options: RuleOptions['rule-name'] = { ... };
```

### 7.6 Real-World Scenario (Recommended)

For deep-dive articles, add a tangible scenario:

```markdown
## Real-World Scenario

A SaaS app with 100 tenants uses dynamic schema switching.
An attacker discovers they can set `?tenant=evil_schema` and
redirect queries to their malicious tables...
```

---

## 8. Article Checklist

### Pre-Publish Checklist

```markdown
## Frontmatter

- [ ] Title is 50-60 characters with primary keyword
- [ ] Description is 120-160 characters with hook
- [ ] 4 relevant tags selected (MUST include `eslint`)
- [ ] Cover image is 1000x420 pixels
- [ ] Series name set (if applicable)

## SEO

- [ ] Primary keyword in title
- [ ] Primary keyword in first 100 words
- [ ] H2/H3 structure is logical (no skipped levels)
- [ ] Alt text on all images

## AEO

- [ ] At least one definition box (blockquote)
- [ ] At least one comparison table
- [ ] Before/after code examples with ❌/✅ markers
- [ ] Key takeaways are explicit and quotable
- [ ] Structured data (CWE, CVSS, OWASP) included

## Dev.to Features

- [ ] At least one {% embed %} for GitHub repo
- [ ] {% cta %} for main call-to-action
- [ ] {% details %} for long code blocks
- [ ] {% runkit %} for interactive demos (when applicable)

## Interlace Standards

- [ ] `eslint` tag included
- [ ] Rule table has GitHub doc links (getting-started)
- [ ] Custom configuration section included
- [ ] Strongly-typed options section included (TypeScript)
- [ ] Real-world scenario (deep-dive articles)

## Engagement

- [ ] Strong opening hook (not "In this article...")
- [ ] Visual break every 200-300 words
- [ ] Footer with X, GitHub, LinkedIn, Dev.to links
- [ ] Closing question for comments
```

---

## 📊 Quick Reference Card

| Element          | Target                | Purpose             |
| ---------------- | --------------------- | ------------------- |
| Title            | 50-60 chars           | SEO + Click-through |
| Description      | 120-160 chars         | SERP snippet        |
| Cover image      | 1000x420px            | Feed visibility     |
| Tags             | 4 max (incl. eslint)  | Discoverability     |
| First code block | Within 3 scrolls      | Engagement          |
| Tables           | 1+ per article        | AEO extraction      |
| {% cta %}        | 1 per article         | Conversion          |
| {% embed %}      | GitHub repo           | Social proof        |
| Footer links     | GitHub, X, LI, Dev.to | Follow growth       |
| Closing question | Last paragraph        | Comments            |

---

## 🔗 References

- [Dev.to Editor Guide](https://dev.to/p/editor_guide)
- [Liquid Tags Documentation](https://shopify.github.io/liquid)
- [Dev.to Tag Guidelines](https://dev.to/tags)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)

---

_Last updated: 2026-01-02_
