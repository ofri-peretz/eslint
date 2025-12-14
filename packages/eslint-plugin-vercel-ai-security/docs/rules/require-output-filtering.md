# `require-output-filtering`

> Requires filtering of sensitive data returned by AI tools.

## 📊 Rule Details

| Property           | Value                                                                            |
| ------------------ | -------------------------------------------------------------------------------- |
| **Type**           | suggestion                                                                       |
| **Severity**       | 🟡 HIGH                                                                          |
| **OWASP Agentic**  | [ASI04: Data Exfiltration](https://owasp.org)                                    |
| **CWE**            | [CWE-200: Information Exposure](https://cwe.mitre.org/data/definitions/200.html) |
| **CVSS**           | 6.5                                                                              |
| **Config Default** | `warn` (recommended), `error` (strict)                                           |

## 🔍 What This Rule Detects

This rule identifies tool execute functions that return raw data from data sources (databases, APIs, file systems) without filtering potentially sensitive information.

## ❌ Incorrect Code

```typescript
// Direct database query return
const tools = {
  search: {
    execute: async ({ sql }) => db.query(sql),
  },
};

// Direct find operation
const tools = {
  getUser: {
    execute: async ({ id }) => users.findById(id),
  },
};

// Raw fetch result
const tools = {
  loadData: {
    execute: async ({ url }) => fetchData(url),
  },
};
```

## ✅ Correct Code

```typescript
// Filtered database results
const tools = {
  search: {
    execute: async ({ sql }) => filterSensitive(db.query(sql)),
  },
};

// Sanitized user data
const tools = {
  getUser: {
    execute: async ({ id }) => sanitizeUserData(users.findById(id)),
  },
};

// Filtered fetch result
const tools = {
  loadData: {
    execute: async ({ url }) => {
      const data = await fetchData(url);
      return removePII(data);
    },
  },
};
```

## ⚙️ Options

| Option               | Type       | Default                                                       | Description                       |
| -------------------- | ---------- | ------------------------------------------------------------- | --------------------------------- |
| `dataSourcePatterns` | `string[]` | `['query', 'find', 'select', 'fetch', 'get', 'read', 'load']` | Patterns suggesting data sources  |
| `filterFunctions`    | `string[]` | `['filter', 'sanitize', 'redact', 'mask', 'clean']`           | Functions considered safe filters |

## 🛡️ Why This Matters

Unfiltered tool output can expose:

- **PII** - Names, emails, addresses, SSNs
- **Credentials** - Passwords, tokens, API keys
- **Internal data** - Database IDs, internal URLs
- **Business data** - Financial records, contracts

## 🔗 Related Rules

- [`no-sensitive-in-prompt`](./no-sensitive-in-prompt.md) - Prevent sensitive input
- [`require-tool-schema`](./require-tool-schema.md) - Validate tool inputs

## 📚 References

- [OWASP ASI04: Data Exfiltration](https://owasp.org)
- [CWE-200: Information Exposure](https://cwe.mitre.org/data/definitions/200.html)
