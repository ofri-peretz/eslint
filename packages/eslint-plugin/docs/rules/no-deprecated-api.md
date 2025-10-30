# no-deprecated-api

Prevent usage of deprecated APIs with migration context and timeline.

**💡 Provides suggestions** | **🔧 Automatically fixable**

## Rule Details

Enforces migration from deprecated APIs with clear timelines, replacement suggestions, and migration guides.

## Configuration

| Option                   | Type               | Default | Description                                    |
| ------------------------ | ------------------ | ------- | ---------------------------------------------- |
| `apis`                   | `DeprecatedAPI[]`  | `[]`    | List of deprecated APIs                        |
| `warnDaysBeforeRemoval`  | `number`           | `90`    | Days before removal to start warning           |

### DeprecatedAPI Object

| Property          | Type     | Required | Description                                |
| ----------------- | -------- | -------- | ------------------------------------------ |
| `name`            | `string` | Yes      | Deprecated API name                        |
| `replacement`     | `string` | Yes      | Replacement API                            |
| `deprecatedSince` | `string` | Yes      | ISO date when deprecated                   |
| `removalDate`     | `string` | No       | ISO date when will be removed              |
| `reason`          | `string` | Yes      | Why it's deprecated                        |
| `migrationGuide`  | `string` | No       | URL to migration guide                     |

## Examples

### ❌ Incorrect

```typescript
// Using deprecated API
import { oldFunction } from 'my-library';

oldFunction({ data: 'test' });
```

### ✅ Correct

```typescript
// Using replacement API
import { newFunction } from 'my-library';

newFunction({ data: 'test' });
```

## Configuration Examples

### Library API Deprecation

```javascript
{
  rules: {
    '@forge-js/no-deprecated-api': ['error', {
      warnDaysBeforeRemoval: 90,
      apis: [
        {
          name: 'oldFetch',
          replacement: 'newFetch',
          deprecatedSince: '2024-01-01',
          removalDate: '2024-12-31',
          reason: 'Security improvements and better error handling',
          migrationGuide: 'https://docs.example.com/migration/fetch'
        },
        {
          name: 'legacyAuth',
          replacement: 'modernAuth',
          deprecatedSince: '2024-06-01',
          removalDate: '2025-06-01',
          reason: 'OAuth 2.0 compliance',
          migrationGuide: 'https://docs.example.com/migration/auth'
        }
      ]
    }]
  }
}
```

### Internal API Sunset

```javascript
{
  rules: {
    '@forge-js/no-deprecated-api': ['warn', {
      warnDaysBeforeRemoval: 30,
      apis: [
        {
          name: 'UserService',
          replacement: 'CustomerService',
          deprecatedSince: '2024-10-01',
          removalDate: '2024-12-31',
          reason: 'Renamed to match ubiquitous language',
          migrationGuide: 'https://wiki.internal.com/customer-service-migration'
        }
      ]
    }]
  }
}
```

## Why This Matters

| Issue                | Impact                                      | Solution                    |
| -------------------- | ------------------------------------------- | --------------------------- |
| ⏰ **Breaking Changes** | Unexpected runtime failures                 | Early warnings              |
| 📚 **Documentation**   | Developers unaware of deprecations          | Clear migration guides      |
| 🔄 **Tech Debt**       | Old code accumulates                        | Proactive migration         |
| 🛡️ **Security**        | Using insecure legacy APIs                  | Enforce modern alternatives |

## Related Rules

- [`enforce-naming`](./enforce-naming.md) - Domain term enforcement

