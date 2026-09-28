---
'docs': patch
---

fix(docs): make the docs site lintable under ESLint 10, and fix the errors it had been hiding

`npm run lint` crashed in `docs#lint` before reporting anything (`scopeManager.addGlobals is not a function`), so no lint rule had run on the docs site since ESLint 10 landed. Once lint runs again it reports four real errors, now fixed: raw `'`/`"` characters in the playground's "About the examples" copy (`react/no-unescaped-entities`), and a `Date.now()` call during render in the scorecard's "last run" age chip (`react-hooks/purity`). The chip now measures against the static build time, which is what the page already rendered, since `/scorecard` is `force-static`. Nothing changes for visitors.
