---
"eslint-plugin-secure-coding": minor
---

Add `recommended-strict` preset + quick-start in README

**New preset: `configs['recommended-strict']`**
Same 16-rule set as `recommended` but every rule promoted to `'error'`.
For teams that want CI to block on all security findings, not just
critical ones. The recommended preset stays unchanged.

```js
// eslint.config.mjs
import securePlugin from 'eslint-plugin-secure-coding';
export default [...securePlugin.configs['recommended-strict']];
```

**README: copy-paste quick-start block**
Added a one-line usage example immediately after `npm install` so adopters
don't have to discover the preset table buried further down the page.
Also added cross-plugin discovery links to `node-security`, `jwt`, and
`express-security` for teams that want broader coverage.
