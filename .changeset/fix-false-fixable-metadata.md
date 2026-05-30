---
"eslint-plugin-browser-security": patch
"eslint-plugin-import-next": patch
"eslint-plugin-node-security": patch
"eslint-plugin-react-features": patch
"eslint-plugin-reliability": patch
"eslint-plugin-secure-coding": patch
---

fix: remove false `meta.fixable: 'code'` declarations from 21 rules that had no `fix()` function

Rules that declared `fixable: 'code'` in their ESLint meta without an actual `fix()` implementation would show the ⚡ auto-fix icon in editors and CI formatters but apply no change when `--fix` was run. This patch removes the misleading declaration from:

- `browser-security/no-clickjacking`
- `import-next/first`, `named`, `no-barrel-import`, `no-import-module-exports`, `no-namespace`
- `node-security/no-buffer-overread`, `no-unsafe-dynamic-require`, `no-zip-slip`
- `react-features/react-no-inline-functions`
- `reliability/no-jsdoc-terminator-in-example` (uses `suggest`, not auto-fix; corrected to `hasSuggestions: true` only)
- `secure-coding/no-directive-injection`, `no-electron-security-issues`, `no-graphql-injection`, `no-improper-sanitization`, `no-improper-type-validation`, `no-ldap-injection`, `no-unchecked-loop-condition`, `no-unlimited-resource-allocation`, `no-weak-password-recovery`, `no-xpath-injection`
