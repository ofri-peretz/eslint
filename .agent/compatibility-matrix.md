# Interlace ESLint Ecosystem - Compatibility Matrix

This document defines the supported versions of key dependencies and runtime environments for all Interlace ESLint plugins.

## Quick Reference

| Dependency                   | Supported Versions   | Notes                                |
| :--------------------------- | :------------------- | :----------------------------------- |
| **Node.js**                  | `>=18.0.0`           | LTS versions recommended             |
| **ESLint**                   | `^8.0.0 \|\| ^9.0.0` | Both legacy and flat config          |
| **TypeScript**               | `^4.7.0 \|\| ^5.0.0` | **Optional** - JS projects supported |
| **@typescript-eslint/utils** | `^7.0.0 \|\| ^8.0.0` | Core AST utilities                   |
| **tslib**                    | `^2.3.0`             | Runtime helper library               |

---

## Detailed Compatibility

### Node.js

```
Minimum: Node.js 18.0.0
Recommended: Node.js 20.x LTS or 22.x LTS
```

All plugins use ES2020 features and require Node.js 18+ for:

- Native ESM support
- Built-in fetch API
- Modern crypto APIs

### ESLint Versions

| Version | Config Format                    | Status       |
| :------ | :------------------------------- | :----------- |
| 8.x     | Legacy (`.eslintrc.*`)           | ✅ Supported |
| 9.x     | Flat Config (`eslint.config.js`) | ✅ Supported |

**Important**: ESLint 9.x uses flat config by default. All plugins export both legacy and flat config presets.

### TypeScript Versions

TypeScript is **optional** for all plugins. Rules work on both JavaScript and TypeScript files.

| Version       | Status       | Notes                                 |
| :------------ | :----------- | :------------------------------------ |
| 4.7.x - 4.9.x | ✅ Supported | Via `@typescript-eslint/utils ^7.0.0` |
| 5.0.x - 5.9.x | ✅ Supported | Via `@typescript-eslint/utils ^8.0.0` |

### ECMAScript Compatibility

| ES Version   | Status | Common Features                       |
| :----------- | :----- | :------------------------------------ |
| ES2015 (ES6) | ✅     | Classes, arrow functions, modules     |
| ES2016       | ✅     | Array.includes, `**` operator         |
| ES2017       | ✅     | async/await                           |
| ES2018       | ✅     | Rest/spread, async iteration          |
| ES2019       | ✅     | flat(), flatMap()                     |
| ES2020       | ✅     | Optional chaining, nullish coalescing |
| ES2021       | ✅     | String.replaceAll, Promise.any        |
| ES2022       | ✅     | Top-level await, class fields         |
| ES2023+      | ⚠️     | Depends on parser support             |

---

## Package Dependencies

### Core Package: `@interlace/eslint-devkit`

The devkit is the foundation for all plugins:

```json
{
  "peerDependencies": {
    "tslib": "^2.3.0"
  },
  "peerDependenciesMeta": {
    "typescript": { "optional": true }
  },
  "dependencies": {
    "@typescript-eslint/utils": "^7.0.0 || ^8.0.0"
  }
}
```

### Plugin Dependencies

All plugins follow this pattern:

```json
{
  "dependencies": {
    "tslib": "^2.3.0",
    "@interlace/eslint-devkit": "^1.2.1"
  },
  "peerDependencies": {},
  "peerDependenciesMeta": {
    "typescript": { "optional": true }
  }
}
```

---

## Transitive Dependencies

Understanding the dependency tree helps with troubleshooting:

```
Consumer Project
└─► eslint-plugin-* (any Interlace plugin)
    ├─► tslib@^2.3.0 (runtime)
    └─► @interlace/eslint-devkit@^1.2.1
        ├─► @typescript-eslint/utils@^7.0.0||^8.0.0
        │   ├─► @typescript-eslint/types
        │   ├─► @typescript-eslint/typescript-estree
        │   └─► eslint (peer dependency)
        │       └─► [consumer must provide]
        └─► tslib (peer dependency)
            └─► [consumer must provide - usually auto-installed]
```

---

## JavaScript-Only Projects

For projects not using TypeScript:

1. **No TypeScript installation required** - `typescript` is marked as optional
2. **Rules still work** - AST analysis works on JavaScript files
3. **Type-aware rules disabled** - Rules requiring type information gracefully degrade

Example JavaScript project setup:

```javascript
// eslint.config.js (ESLint 9.x flat config)
import nodeSecurityPlugin from 'eslint-plugin-node-security';

export default [
  nodeSecurityPlugin.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
];
```

---

## Legacy TypeScript Projects (4.x)

For projects still on TypeScript 4.x:

```bash
# Ensure compatible parser version
npm install @typescript-eslint/parser@^7.0.0 @typescript-eslint/eslint-plugin@^7.0.0
```

The plugins will use `@typescript-eslint/utils@^7.0.0` which supports TypeScript 4.7+.

---

## Modern TypeScript Projects (5.x)

For projects on TypeScript 5.x:

```bash
# Use latest parser
npm install @typescript-eslint/parser@^8.0.0 @typescript-eslint/eslint-plugin@^8.0.0
```

---

## Plugin Security Tier Compatibility

All plugins in both tiers share the same compatibility:

### Security Suite (10 plugins)

- `eslint-plugin-node-security`
- `eslint-plugin-browser-security`
- `eslint-plugin-secure-coding`
- `eslint-plugin-express-security`
- `eslint-plugin-nestjs-security`
- `eslint-plugin-lambda-security`
- `eslint-plugin-mongodb-security`
- `eslint-plugin-pg`
- `eslint-plugin-jwt`
- `eslint-plugin-vercel-ai-security`

### Quality & Governance Suite (9 plugins)

- `eslint-plugin-import-next`
- `eslint-plugin-react-features`
- `eslint-plugin-react-a11y`
- `eslint-plugin-maintainability`
- `eslint-plugin-reliability`
- `eslint-plugin-operability`
- `eslint-plugin-modularity`
- `eslint-plugin-modernization`
- `eslint-plugin-conventions`

---

## Troubleshooting Compatibility Issues

### "Cannot find module 'typescript'"

If you see this error in a JavaScript project:

```bash
# This is a warning, not an error - rules still work
# To suppress, explicitly install typescript as devDependency
npm install --save-dev typescript
```

### "Peer dependency not satisfied: eslint"

ESLint is a peer dependency of `@typescript-eslint/utils`. Ensure ESLint is installed:

```bash
npm install --save-dev eslint@^9.0.0
```

### TypeScript version mismatch

If you see parser errors with TypeScript:

```bash
# Check versions
npm ls typescript @typescript-eslint/parser

# For TS 4.x projects, use older parser
npm install @typescript-eslint/parser@^7.0.0

# For TS 5.x projects, use newer parser
npm install @typescript-eslint/parser@^8.0.0
```

---

## Version Update Policy

| Dependency         | Update Frequency   | Breaking Changes            |
| :----------------- | :----------------- | :-------------------------- |
| Node.js            | When LTS drops     | Major version bump          |
| ESLint             | When new major     | Major version bump          |
| TypeScript         | Quarterly          | Usually backward compatible |
| @typescript-eslint | With ESLint majors | Major version bump          |

---

_Last updated: January 2026_
