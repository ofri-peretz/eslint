---
'eslint-plugin-import-next': patch
---

fix(order): rank an import by the configured resolvers, as upstream does, so a tsconfig `paths` alias such as `@/App.js` that resolves is internal and no longer produces order findings eslint-plugin-import does not make
