# eslint-plugin-pg Rules Reference

Complete list of all 13 rules with configuration options.

## Rules by Category

### Security (6 rules)

| Rule                                                            | CWE     | Severity | Description                                     |
| --------------------------------------------------------------- | ------- | -------- | ----------------------------------------------- |
| [no-unsafe-query](./rules/no-unsafe-query.md)                   | CWE-89  | Critical | Prevents SQL injection via string interpolation |
| [no-insecure-ssl](./rules/no-insecure-ssl.md)                   | CWE-295 | High     | Prevents disabling SSL certificate validation   |
| [no-hardcoded-credentials](./rules/no-hardcoded-credentials.md) | CWE-798 | High     | Prevents hardcoded passwords in config          |
| [no-unsafe-search-path](./rules/no-unsafe-search-path.md)       | CWE-426 | High     | Prevents dynamic search_path hijacking          |
| [no-unsafe-copy-from](./rules/no-unsafe-copy-from.md)           | CWE-22  | Critical | Prevents COPY FROM file path exposure           |
| [no-transaction-on-pool](./rules/no-transaction-on-pool.md)     | CWE-362 | High     | Prevents transaction commands on pool           |

### Resource Management (3 rules)

| Rule                                                              | CWE     | Severity | Description                        |
| ----------------------------------------------------------------- | ------- | -------- | ---------------------------------- |
| [no-missing-client-release](./rules/no-missing-client-release.md) | CWE-772 | High     | Ensures pool clients are released  |
| [prevent-double-release](./rules/prevent-double-release.md)       | CWE-415 | Medium   | Prevents double client.release()   |
| [no-floating-query](./rules/no-floating-query.md)                 | CWE-252 | Medium   | Ensures query promises are handled |

### Quality & Performance (4 rules)

| Rule                                                    | Severity | Description                                    |
| ------------------------------------------------------- | -------- | ---------------------------------------------- |
| [check-query-params](./rules/check-query-params.md)     | Medium   | Validates parameter count matches placeholders |
| [no-select-all](./rules/no-select-all.md)               | Low      | Discourages SELECT \*                          |
| [prefer-pool-query](./rules/prefer-pool-query.md)       | Low      | Suggests pool.query() for simple queries       |
| [no-batch-insert-loop](./rules/no-batch-insert-loop.md) | Medium   | Prevents N+1 mutation queries                  |

## Configuration

### Recommended Preset

Enables all rules with sensible defaults:

```javascript
import pg from 'eslint-plugin-pg';

export default [pg.configs.recommended];
```

### Strict Preset

All rules as errors:

```javascript
import pg from 'eslint-plugin-pg';

export default [pg.configs.strict];
```

### Manual Configuration

```javascript
import pg from 'eslint-plugin-pg';

export default [
  {
    plugins: { pg },
    rules: {
      'pg/no-unsafe-query': 'error',
      'pg/no-insecure-ssl': 'error',
      'pg/check-query-params': 'warn',
      // ...
    },
  },
];
```
