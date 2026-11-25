---
'@interlace/eslint-devkit': patch
'eslint-plugin-react-a11y': patch
---

fix(eslint-devkit): a package whose `package.json` does not parse now resolves to `null` inside the oxc-free fallback resolver instead of throwing out of it. eslint-plugin-react-a11y only corrects a schema comment on its deprecated stubs.
