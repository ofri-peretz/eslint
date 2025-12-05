# 📦 eslint-plugin-import Rules TODO

Comprehensive list of rules from `eslint-plugin-import` to be implemented in `eslint-plugin-generalist` (or `@forge-js/eslint-plugin-llm-optimized`).

> **Status:** 
> 🟢 = Implemented (or superior equivalent exists)
> 🟡 = In Progress / Planned
> 🔴 = Not Started
> ❌ = Skipped (Legacy/Not needed)

## 📊 Analysis
- **Total Rules:** ~66
- **Implemented:** ~7
- **Priority:** High (Architecture & Module boundaries are critical for LLMs)

---

## 🛡️ Static Analysis (Critical)

These rules are essential for correctness and preventing runtime crashes.

| Status | Rule | Description | Priority | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 🟢 | `no-unresolved` | Ensure imports point to a file/module that can be resolved. | **Critical** | Implemented. |
| 🟢 | `named` | Ensure named imports correspond to a named export in the remote file. | **Critical** | Implemented. |
| 🟢 | `default` | Ensure a default export is present, given a default import. | **Critical** | Implemented. |
| 🟢 | `namespace` | Ensure imported namespaces contain dereferenced properties as they are dereferenced. | **Critical** | Implemented. |
| 🔴 | `no-restricted-paths` | Restrict which files can be imported in a given folder. | High | Essential for "Boundaries". |
| 🔴 | `no-absolute-path` | Forbid import of modules using absolute paths. | Medium | |
| 🔴 | `no-dynamic-require` | Forbid `require()` calls with expressions. | High | Security risk. Overlaps with our `no-unsafe-dynamic-require`. |
| 🔴 | `no-internal-modules` | Use this rule to prevent importing the submodules of other modules. | High | Essential for encapsulation. |
| 🔴 | `no-webpack-loader-syntax` | Forbid Webpack loader syntax in imports. | Low | Legacy. |
| 🔴 | `no-self-import` | Forbid a module from importing itself. | Medium | Easy to implement. |
| 🟢 | `no-cycle` | Ensure imports do not create a cycle. | **Critical** | **SUPERIOR IMPLEMENTATION:** We use Tarjan's Algo (`no-circular-dependencies`). |
| 🔴 | `no-useless-path-segments` | Prevent unnecessary path segments in import and require statements. | Low | Formatting. |
| 🔴 | `no-relative-parent-imports` | Use this rule to prevent imports to folders in relative parent paths. | Medium | Good for monorepos. |

## ⚠️ Helpful Warnings

These rules catch common bugs and deprecated patterns.

| Status | Rule | Description | Priority | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 | `export` | Report any invalid exports, i.e. re-export of the same name. | High | |
| 🔴 | `no-named-as-default` | Report use of exported name as identifier of default export. | Medium | Confusing pattern. |
| 🔴 | `no-named-as-default-member` | Report use of exported name as property of default export. | Medium | |
| 🟢 | `no-deprecated` | Report imported names marked with `@deprecated` documentation tag. | High | Implemented. |
| 🟢 | `no-extraneous-dependencies` | Forbid the use of extraneous packages. | **Critical** | Implemented. |
| 🔴 | `no-mutable-exports` | Forbid the use of mutable exports with `var` or `let`. | Medium | Functional programming. |
| 🔴 | `no-unused-modules` | Report modules without exports, or exports without matching import in another module. | High | Dead code elimination. |

## 🎨 Module Systems

Rules for specific module system constraints.

| Status | Rule | Description | Priority | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 | `unambiguous` | Report potentially ambiguous parse goal (`script` vs. `module`). | Low | Mostly solved by tools. |
| 🔴 | `no-commonjs` | Report CommonJS `require` calls and `module.exports` or `exports`. | Medium | Enforce ESM. |
| 🔴 | `no-amd` | Report AMD `require` and `define` calls. | Low | Legacy. |
| 🔴 | `no-nodejs-modules` | No Node.js builtin modules. | Medium | Browser-only code. |
| 🔴 | `import/first` | Ensure all imports appear before other statements. | Medium | Formatting. |
| 🔴 | `import/exports-last` | Ensure all exports appear after other statements. | Low | Formatting. |
| 🔴 | `import/no-duplicates` | Report repeated import of the same module in multiple places. | Medium | Formatting. |
| 🔴 | `import/no-namespace` | Report use of namespace imports. | Low | Style choice. |
| 🔴 | `import/extensions` | Ensure consistent use of file extension within the import path. | Medium | Formatting. |
| 🟢 | `import/order` | Enforce a convention in module import order. | High | Implemented as `enforce-import-order`. |
| 🔴 | `import/newline-after-import` | Enforce a newline after import statements. | Low | Formatting. |
| 🔴 | `import/prefer-default-export` | Prefer a default export if module exports a single name. | Low | Controversial. |
| 🔴 | `import/max-dependencies` | Limit the maximum number of dependencies a module can have. | Medium | Complexity metric. |
| 🔴 | `import/no-unassigned-import` | Forbid unassigned imports. | Medium | Side effects. |
| 🔴 | `import/no-named-default` | Forbid named default exports. | Low | |
| 🔴 | `import/no-default-export` | Forbid default exports. | Medium | Style choice. |
| 🔴 | `import/no-named-export` | Forbid named exports. | Low | Style choice. |
| 🔴 | `import/no-anonymous-default-export` | Forbid anonymous default exports. | Medium | React Fast Refresh requirement. |
| 🔴 | `import/group-exports` | Prefer named exports to be grouped together in a single export declaration. | Low | |
| 🔴 | `import/dynamic-import-chunkname` | Enforce a leading comment with the webpackChunkName for dynamic imports. | Low | Webpack specific. |

---

## 🧠 AI Implementation Context

### Complexity Note for LLMs
Implementing the **Resolver** logic is the hardest part of `eslint-plugin-import`. It requires understanding:
- `tsconfig.json` paths
- `package.json` exports/imports
- Node.js resolution algorithm
- Webpack aliases

**Strategy:**
1.  Reuse `enhanced-resolve` (Webpack's resolver) or `get-tsconfig` to handle resolution. Don't write a resolver from scratch.
2.  For `no-restricted-paths`, leverage our architectural boundaries logic.

### Reference Implementation Links
- [import-js/eslint-plugin-import](https://github.com/import-js/eslint-plugin-import)
- [Resolution Algorithm](https://nodejs.org/api/modules.html#all-together)

