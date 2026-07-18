---
'eslint-plugin-browser-security': patch
'eslint-plugin-conventions': patch
'eslint-plugin-express-security': patch
'eslint-plugin-import-next': patch
'eslint-plugin-jwt': patch
'eslint-plugin-lambda-security': patch
'eslint-plugin-maintainability': patch
'eslint-plugin-modernization': patch
'eslint-plugin-modularity': patch
'eslint-plugin-mongodb-security': patch
'eslint-plugin-nestjs-security': patch
'eslint-plugin-node-security': patch
'eslint-plugin-operability': patch
'eslint-plugin-pg': patch
'eslint-plugin-react-a11y': patch
'eslint-plugin-react-features': patch
'eslint-plugin-reliability': patch
'eslint-plugin-secure-coding': patch
'eslint-plugin-vercel-ai-security': patch
---

Fix Codecov badge showing "unknown" in all plugin READMEs (and on npm).

Badge URLs used short component names (e.g. `?component=node-security`) but
Codecov component IDs are the full package names (e.g. `eslint-plugin-node-security`).
Updated both the badge `src` and the link `href` in every plugin README.
