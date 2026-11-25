---
'eslint-plugin-nestjs-security': patch
---

fix: no-missing-validation-pipe finds a global pipe registered in a helper main.ts imports

`main.ts` often hands `app` to `setupApp(app)` in `setup.ts` or `applyGlobalValidation(app)` in `config/app-validation.ts`, and the project scan only read module, `main.ts` and `bootstrap.ts` files, so it missed the `app.useGlobalPipes(...)` there and reported every DTO route as unvalidated. The scan now follows, one hop, the project-local imports the bootstrap file runs: a side-effect import, or a value import it calls. `import type` and an import never called are skipped. On rolling-scopes/rsschool-app the rule drops from 104 reports to the 5 inputs with no class type; on OpenWA from 93 to 0.
