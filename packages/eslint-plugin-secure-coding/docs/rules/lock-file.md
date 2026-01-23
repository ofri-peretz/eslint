# lock-file

> Ensure package lock file (package-lock.json, yarn.lock, or pnpm-lock.yaml) exists

**Severity:** 🟠 HIGH  
**CWE:** [CWE-829](https://cwe.mitre.org/data/definitions/829.html)  
**OWASP Mobile:** [OWASP Mobile Top 10 M2](https://owasp.org/www-project-mobile-top-10/)

## Rule Details

This rule ensures that a package lock file exists for the configured package manager. Lock files are critical for supply chain security as they ensure deterministic builds and prevent "dependency confusion" or unexpected updates.

## ❌ Incorrect

```typescript
// Any file in a project without a lock file:
// - Missing package-lock.json (when using npm)
// - Missing yarn.lock (when using yarn)
// - Missing pnpm-lock.yaml (when using pnpm)
```

## ✅ Correct

```typescript
// Project root contains:
// - package-lock.json
```

## ⚙️ Configuration

This rule supports the following configuration:

```json
{
  "secure-coding/lock-file": [
    "error",
    {
      "packageManager": "npm"
    }
  ]
}
```

### Options

- `packageManager`: The package manager you are using. One of: `"npm"`, `"yarn"`, `"pnpm"`. (Default: `"npm"`)

## Known False Negatives

### Nested Projects

**Why**: The rule searches up to 10 levels for a lock file. If the project is deeper than that or in a complex monorepo structure without a root lock file, it might not be detected correctly.

**Mitigation**: Ensure the rule is configured at the appropriate level in your monorepo.

## References

- [CWE-829: Inclusion of Functionality from Untrusted Control Sphere](https://cwe.mitre.org/data/definitions/829.html)
- [OWASP Mobile Top 10 M2: Inadequate Supply Chain Security](https://owasp.org/www-project-mobile-top-10/)
- [npm-lockfile-security](https://docs.npmjs.com/configuring-npm/package-lock-json.html)
