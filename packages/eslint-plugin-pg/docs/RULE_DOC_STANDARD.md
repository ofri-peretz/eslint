# Rule Documentation Standard

This document defines the standard format for ESLint rule documentation files. Following this standard ensures:

- Consistent rule documentation across all Interlace plugins
- Automated extraction of rule metadata for the docs website
- SEO/AEO optimization with proper meta tags
- Compatibility with dev.to article format for cross-posting

## Frontmatter Schema

Following dev.to conventions with ESLint-specific extensions:

```yaml
---
# === Core Metadata (dev.to compatible) ===
title: no-unsafe-query # Rule name
description: Prevents SQL injection # Short summary (50-150 chars) for tables/SEO
cover_image: ./assets/no-unsafe-query.png # Optional: OG image for social sharing
tags: ['security', 'sql', 'postgres'] # Keywords for search/filtering
published: true # Whether the doc is ready

# === ESLint Rule Metadata ===
category: security # security | quality | governance
severity: critical # critical | high | medium | low
autofix: false # Whether rule provides auto-fix
has_suggestions: true # Whether rule provides suggestions

# === Security Metadata (for security rules) ===
cwe: CWE-89 # CWE reference
owasp: A03:2021 # OWASP reference
cvss: 9.8 # CVSS score (optional)

# === Related Content ===
related_rules: # Links to related rules
  - no-hardcoded-credentials
  - check-query-params
canonical_url: https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-unsafe-query
---
```

## Field Reference

### Core Metadata (Required)

| Field         | Type     | Required | Description                                     |
| ------------- | -------- | -------- | ----------------------------------------------- |
| `title`       | string   | ✅       | Rule name (kebab-case, e.g., `no-unsafe-query`) |
| `description` | string   | ✅       | **Short summary (50-150 chars)** for tables/SEO |
| `tags`        | string[] | ✅       | Keywords for search (3-5 recommended)           |
| `category`    | string   | ✅       | `security`, `quality`, or `governance`          |
| `severity`    | string   | ✅       | `critical`, `high`, `medium`, or `low`          |

### Optional Metadata

| Field             | Type     | Description                           |
| ----------------- | -------- | ------------------------------------- |
| `cover_image`     | string   | Path to OG image (relative or URL)    |
| `published`       | boolean  | Whether doc is ready (default: true)  |
| `autofix`         | boolean  | Whether rule provides auto-fix        |
| `has_suggestions` | boolean  | Whether rule provides IDE suggestions |
| `cwe`             | string   | CWE reference (e.g., `CWE-89`)        |
| `owasp`           | string   | OWASP reference (e.g., `A03:2021`)    |
| `cvss`            | number   | CVSS score (0-10)                     |
| `related_rules`   | string[] | List of related rule names            |
| `canonical_url`   | string   | Canonical URL for SEO                 |

## Content Anchors

Use HTML comment anchors to mark extractable content sections:

```markdown
<!-- @rule-summary -->

One paragraph description that expands on the frontmatter description.
This appears in rule detail pages and can be slightly longer.

<!-- @/rule-summary -->

<!-- @rule-rationale -->

Explains WHY this rule matters - security implications, attack vectors.

<!-- @/rule-rationale -->

<!-- @rule-examples -->

Code examples section for AI/LLM extraction

<!-- @/rule-examples -->
```

### Available Anchors

| Anchor             | Required | Description                       |
| ------------------ | -------- | --------------------------------- |
| `@rule-summary`    | ✅       | One paragraph description         |
| `@rule-rationale`  | ❌       | Why this rule matters             |
| `@rule-examples`   | ❌       | Code examples (for AI extraction) |
| `@rule-options`    | ❌       | Configuration options             |
| `@rule-exceptions` | ❌       | When not to use this rule         |

## Complete Example

```markdown
---
title: no-unsafe-query
description: Prevents SQL injection by detecting unsafe query construction
cover_image: https://eslint.interlace.tools/og/rules/no-unsafe-query.png
tags: ['security', 'sql-injection', 'postgres', 'node']
published: true
category: security
severity: critical
autofix: false
has_suggestions: true
cwe: CWE-89
owasp: A03:2021
cvss: 9.8
related_rules:
  - check-query-params
  - no-hardcoded-credentials
---

<!-- @rule-summary -->

Prevents SQL injection by detecting string concatenation or template literals
with variables in `client.query()` calls. Use parameterized queries instead.

<!-- @/rule-summary -->

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Errors in `recommended`**

<!-- @rule-rationale -->

SQL injection is one of the most critical security vulnerabilities (OWASP #3).
Attackers can exploit unsafe query construction to:

- Extract sensitive data
- Modify or delete database records
- Execute administrative operations
- In some cases, gain shell access
<!-- @/rule-rationale -->

## Quick Summary

| Aspect            | Details                                                  |
| ----------------- | -------------------------------------------------------- |
| **CWE Reference** | [CWE-89](https://cwe.mitre.org/data/definitions/89.html) |
| **Severity**      | Critical (CVSS: 9.8)                                     |
| **Auto-Fix**      | ❌ No auto-fix available                                 |
| **ESLint MCP**    | ✅ Optimized for AI assistant integration                |

## Rule Details

<!-- @rule-examples -->

### ❌ Incorrect

\`\`\`javascript
// String concatenation - VULNERABLE
const query = "SELECT \* FROM users WHERE id = " + userId;
client.query(query);

// Template literal - VULNERABLE  
client.query(\`SELECT \* FROM users WHERE id = \${userId}\`);
\`\`\`

### ✅ Correct

\`\`\`javascript
// Parameterized query - SAFE
client.query('SELECT \* FROM users WHERE id = $1', [userId]);

// Using query builder - SAFE
const result = await db.select().from(users).where(eq(users.id, userId));
\`\`\`

<!-- @/rule-examples -->

<!-- @rule-options -->

## Options

This rule has no configurable options.

<!-- @/rule-options -->

<!-- @rule-exceptions -->

## When Not To Use It

You may disable this rule if:

- You're using a query builder that handles parameterization (Knex, Drizzle, etc.)
- The query uses only static strings with no external input
<!-- @/rule-exceptions -->

## Related Rules

- [check-query-params](./check-query-params.md) - Validates query parameter count
- [no-hardcoded-credentials](./no-hardcoded-credentials.md) - Prevents credential exposure
```

## Validation Tests

Rule docs are validated by unit tests that check:

1. **Required frontmatter fields** exist
2. **`description`** is 50-150 characters
3. **`@rule-summary`** anchor exists exactly once
4. **`tags`** array has 3-5 items
5. **`category`** is one of: `security`, `quality`, `governance`
6. **`severity`** is one of: `critical`, `high`, `medium`, `low`

## Migration Guide

To update existing rule docs:

1. Add `description` field to frontmatter (copy from blockquote)
2. Wrap existing summary paragraph with `<!-- @rule-summary -->` anchors
3. Add `category`, `severity`, and `tags` fields
4. Run validation tests: `npm run test:rule-docs`
