# Distribution & Copywriting Standard

> **Purpose**: This agent-facing standard consolidates the distribution strategy, copywriting templates, and strict tagging requirements for the Interlace ESLint Ecosystem. It is the single source of truth for generating high-impact content.

---

## 1. 🏷️ The "Absolute Relevance" Tagging Standard

**CRITICAL RULE**: Every article MUST be tagged with **both** `eslint` AND the specific **technology** associated with the plugin.

- **Formula**: `['eslint']` + `[plugin-technology]` + `[2 other relevant tags]`
- **Why**: This ensures we capture traffic from both the tool ecosystem (ESLint) and the problem domain (e.g., JWT, PostgreSQL).

### Examples

| Plugin                             | Required Tags        | Example Full Tag List                       |
| :--------------------------------- | :------------------- | :------------------------------------------ |
| `eslint-plugin-jwt`                | `eslint`, `jwt`      | `eslint`, `jwt`, `security`, `node`         |
| `eslint-plugin-pg`                 | `eslint`, `postgres` | `eslint`, `postgres`, `database`, `sql`     |
| `eslint-plugin-secure-coding`      | `eslint`, `security` | `eslint`, `security`, `javascript`, `owasp` |
| `eslint-plugin-vercel-ai-security` | `eslint`, `ai`       | `eslint`, `ai`, `vercel`, `llm`             |

---

## 2. ✍️ Copywriting & Templates

Use these pre-approved templates to ensure consistency and conversion.

### 2.1 Frontmatter Template (SEO Optimized)

```yaml
---
title: 'Your Title Here (50-60 chars, include keyword)'
published: false
description: 'Compelling hook + Solution preview (120-160 chars)'
tags: eslint, [technology], [topic1], [topic2]
cover_image: https://example.com/image.png
series: [Series Name if applicable]
---
```

### 2.2 The "Interlace Ecosystem" Footer CTA

Every article MUST end with this standardized CTA block to drive ecosystem cross-pollination.

```markdown
---
## Quick Install

📦 [`eslint-plugin-secure-coding`](https://npmjs.com/package/eslint-plugin-secure-coding) — 75 security rules
📦 [`eslint-plugin-pg`](https://npmjs.com/package/eslint-plugin-pg) — PostgreSQL security
📦 [`eslint-plugin-node-security`](https://npmjs.com/package/eslint-plugin-node-security) — Node.js core modules incl. cryptography

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
---

🚀 **[Closing Question to drive engagement?]**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
```

### 2.3 Cross-Linking Callout (Internal Linking)

Link to at least 2 other ecosystem articles to boost domain authority.

```markdown
> 📚 **Related Deep Dive**: For a complete breakdown of this vulnerability,
> see [Article Title Here](https://dev.to/ofri-peretz/article-slug).
```

### 2.4 "Authority Signal" Block

Include real-world data to build trust (AEO optimization).

```markdown
> 💡 **Based on Real Audits**: In 47 security reviews of Node.js codebases,
> 80% contained at least one instance of this vulnerability.
```

---

## 3. 🧠 Strategic Insights & Lessons

These insights are distilled from `distribution/DEV_TO_BEST_PRACTICES.md` and `distribution/STRATEGY.md`.

### 3.1 The "Hook-Problem-Solution" Framework

- **Hook**: Start with a startling statistic or a relatable pain point (e.g., "This bug crashes production").
- **Problem**: Explain the "Why" (Root cause).
- **Solution**: Show the "How" (Code fix) and "Automate" (ESLint rule).
- **Visuals**: Use a visual break (code, table, image) every 200-300 words.

### 3.2 AEO (Answer Engine Optimization)

To rank in ChatGPT/Perplexity:

- Use **Definition Boxes** (`> **Term:** Definition`).
- Use **Comparison Tables** (Vulnerable vs Secure).
- Use **Before/After** Code Blocks (`❌ Vulnerable` / `✅ Safe`).
- Include a **"Key Takeaway"** at the end of sections.

### 3.3 The "Agentic-First" Positioning

Our content isn't just for humans; it's for AI Agents.

- Highlight **Structured Error Messages** (Rules that fix themselves).
- Mention **AGENTS.md** standards.
- Position plugins as the "Standard Library for Agentic Engineering".

---

## 4. 📂 Single Source of Truth

This file connects to the deep-dive documentation found in `eslint/distribution`. **Always** cross-reference these files for complex tasks:

- **`distribution/DEV_TO_BEST_PRACTICES.md`**: Full SEO/AEO guide, liquid tag reference, and formatting rules.
- **`distribution/ARTICLE_CHECKLIST.md`**: Mandatory pre-publish quality gates and distribution checklist.
- **`distribution/STRATEGY.md`**: High-level product positioning and "Unicorn Killer" strategy.
- **`distribution/CONTENT.md`**: Publishing queue and performance tracker.
