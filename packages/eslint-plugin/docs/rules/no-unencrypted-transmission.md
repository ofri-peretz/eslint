# no-unencrypted-transmission

> **Keywords:** unencrypted, CWE-319, security, ESLint rule, HTTP, HTTPS, encryption, TLS, SSL, data transmission, LLM-optimized, code security

Detects unencrypted data transmission (HTTP vs HTTPS, plain text protocols). This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) and provides LLM-optimized error messages that AI assistants can automatically fix.

💼 This rule is set to **error** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| **CWE Reference** | CWE-319 (Cleartext Transmission of Sensitive Information)                      |
| **Severity**      | HIGH (security vulnerability)                                                   |
| **Auto-Fix**      | ✅ Yes (replaces HTTP with HTTPS, WS with WSS, etc.)                           |
| **Category**      | Security                                                                         |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                          |
| **Best For**      | All applications making network requests, APIs, database connections          |

## Detection Flow

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#475569'
  }
}}%%
flowchart TD
    A[🔍 Analyze URL/String] --> B{Contains Protocol?}
    B -->|No| C[✅ Valid: No protocol]
    B -->|Yes| D{Is Insecure Protocol?}
    D -->|No| E[✅ Valid: HTTPS/WSS/etc.]
    D -->|Yes| F{Protocol Type}
    F --> G[HTTP]
    F --> H[WS]
    F --> I[MongoDB]
    F --> J[Redis]
    F --> K[MySQL]
    G --> L[❌ Report: Use HTTPS]
    H --> M[❌ Report: Use WSS]
    I --> N[❌ Report: Use MongoDB+srv]
    J --> O[❌ Report: Use Redis TLS]
    K --> P[❌ Report: Use MySQL SSL]
    
    style C fill:#d1fae5,stroke:#059669,stroke-width:2px
    style E fill:#d1fae5,stroke:#059669,stroke-width:2px
    style L fill:#fee2e2,stroke:#dc2626,stroke-width:2px
    style M fill:#fee2e2,stroke:#dc2626,stroke-width:2px
    style N fill:#fee2e2,stroke:#dc2626,stroke-width:2px
    style O fill:#fee2e2,stroke:#dc2626,stroke-width:2px
    style P fill:#fee2e2,stroke:#dc2626,stroke-width:2px
```

## Why This Matters

| Issue                 | Impact                              | Solution                   |
| --------------------- | ----------------------------------- | -------------------------- |
| 🔒 **Man-in-Middle**  | Data intercepted in transit         | Use HTTPS/TLS              |
| 🔐 **Data Breach**    | Sensitive data exposed              | Encrypt all transmissions  |
| 🍪 **Compliance**     | Violates security standards         | Enforce encrypted protocols|
| 📊 **Best Practice**  | All external connections need TLS   | Use secure protocols       |

## Detection Patterns

The rule detects:

- **HTTP URLs**: `http://`, `http://api.example.com`
- **WebSocket (WS)**: `ws://`, `ws://socket.example.com`
- **MongoDB**: `mongodb://` (should use `mongodb+srv://`)
- **Redis**: `redis://` (should use `rediss://` or TLS)
- **MySQL**: `mysql://` (should use SSL)

## Examples

### ❌ Incorrect

```typescript
// Unencrypted transmission
fetch("http://api.example.com/data"); // ❌ HTTP instead of HTTPS

const ws = new WebSocket("ws://socket.example.com"); // ❌ WS instead of WSS

const mongoUrl = "mongodb://localhost:27017/db"; // ❌ MongoDB without encryption

const redisUrl = "redis://localhost:6379"; // ❌ Redis without TLS

const mysqlUrl = "mysql://user:pass@localhost/db"; // ❌ MySQL without SSL
```

### ✅ Correct

```typescript
// Encrypted transmission
fetch("https://api.example.com/data"); // ✅ HTTPS

const ws = new WebSocket("wss://socket.example.com"); // ✅ WSS

const mongoUrl = "mongodb+srv://cluster.mongodb.net/db"; // ✅ MongoDB with encryption

const redisUrl = "rediss://localhost:6379"; // ✅ Redis with TLS

const mysqlUrl = "mysql://user:pass@localhost/db?ssl=true"; // ✅ MySQL with SSL

// localhost is allowed in test files
fetch("http://localhost:3000/api"); // ✅ localhost in tests
```

## Configuration

### Default Configuration

```json
{
  "@forge-js/llm-optimized/security/no-unencrypted-transmission": "error"
}
```

### Options

| Option              | Type       | Default                          | Description                        |
| ------------------- | ---------- | -------------------------------- | ----------------------------------- |
| `allowInTests`      | `boolean`  | `false`                          | Allow unencrypted in tests          |
| `insecureProtocols` | `string[]` | `['http', 'ws', ...]`           | Insecure protocol patterns         |
| `secureAlternatives`| `object`   | `{http: 'https', ws: 'wss'}`    | Mapping to secure alternatives      |
| `ignorePatterns`    | `string[]` | `[]`                             | Additional patterns to ignore       |

### Example Configuration

```json
{
  "@forge-js/llm-optimized/security/no-unencrypted-transmission": [
    "error",
    {
      "allowInTests": true,
      "insecureProtocols": ["http", "ws", "mongodb"],
      "secureAlternatives": {
        "http": "https",
        "ws": "wss",
        "mongodb": "mongodb+srv"
      },
      "ignorePatterns": ["localhost", "127.0.0.1"]
    }
  ]
}
```

## Auto-Fix Behavior

The rule provides automatic fixes that:

- ✅ Replace `http://` with `https://`
- ✅ Replace `ws://` with `wss://`
- ✅ Replace `mongodb://` with `mongodb+srv://`
- ✅ Replace `redis://` with `rediss://`
- ⚠️ Template literals require manual review (too risky for auto-fix)

### Auto-Fix Example

```typescript
// Before (triggers rule)
fetch("http://api.example.com/data");

// After (auto-fixed)
fetch("https://api.example.com/data");
```

## Best Practices

1. **Always use HTTPS**: For all external API calls
2. **Use WSS for WebSockets**: Encrypt WebSocket connections
3. **Database encryption**: Use TLS/SSL for database connections
4. **Environment variables**: Store URLs in environment variables
5. **Test exceptions**: Use `allowInTests: true` for localhost in tests

## Related Rules

- [`no-exposed-sensitive-data`](./no-exposed-sensitive-data.md) - Detects sensitive data exposure
- [`no-insecure-cookie-settings`](./no-insecure-cookie-settings.md) - Detects insecure cookies

## Resources

- [CWE-319: Cleartext Transmission of Sensitive Information](https://cwe.mitre.org/data/definitions/319.html)
- [OWASP: Transport Layer Protection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/)
- [MDN: HTTPS](https://developer.mozilla.org/en-US/docs/Glossary/HTTPS)

