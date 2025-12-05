# 🔄 Migration Guide

## Migrating from Other Plugins

### From eslint-plugin-security

| Their Rule                       | Our Rule                         | Improvement                                |
| -------------------------------- | -------------------------------- | ------------------------------------------ |
| `detect-eval-with-expression`    | `detect-eval-with-expression`    | ✅ + CWE-95, fix instructions              |
| `detect-non-literal-require`     | `no-unsafe-dynamic-require`      | ✅ + CWE-95, fix instructions              |
| `detect-object-injection`        | `detect-object-injection`        | ✅ + Type-aware, 70% fewer false positives |
| `detect-child-process`           | `detect-child-process`           | ✅ + CWE-78, fix instructions              |
| `detect-non-literal-fs-filename` | `detect-non-literal-fs-filename` | ✅ + CWE-22, fix instructions              |
| `detect-non-literal-regexp`      | `detect-non-literal-regexp`      | ✅ + CWE-400, fix instructions             |
| ❌ N/A                           | `no-sql-injection`               | **NEW** - 3 SQL injection rules            |
| ❌ N/A                           | `no-hardcoded-credentials`       | **NEW** - Credential detection             |
| ❌ N/A                           | 17 more security rules           | **NEW** - XSS, CORS, CSRF, auth            |

### From eslint-plugin-import

| Their Rule                   | Our Rule                     | Improvement                                 |
| ---------------------------- | ---------------------------- | ------------------------------------------- |
| `no-cycle`                   | `no-circular-dependencies`   | ✅ **100% detection** (Tarjan's SCC vs DFS) |
| `no-unresolved`              | `no-unresolved`              | ✅ + LLM fix instructions                   |
| `no-self-import`             | `no-self-import`             | ✅ Compatible                               |
| `no-extraneous-dependencies` | `no-extraneous-dependencies` | ✅ Compatible                               |
| `no-mutable-exports`         | `no-mutable-exports`         | ✅ Compatible                               |

### Migration Steps

```bash
# 1. Install (can coexist during migration)
npm install --save-dev @forge-js/eslint-plugin-llm-optimized

# 2. Add to config alongside existing plugins
# 3. Run and compare results
npx eslint . --format json > results.json

# 4. Remove old plugins when satisfied
npm uninstall eslint-plugin-security eslint-plugin-import
```

