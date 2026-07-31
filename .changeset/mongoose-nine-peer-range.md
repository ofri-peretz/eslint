---
'eslint-plugin-mongodb-security': patch
---

Widen optional peer ranges to accept mongoose ^9 and mongodb driver ^7. The rules lint call patterns statically and never import either library, and the interface-compatibility suite passes against mongoose 9.7 / mongodb 7.5 — the old caps just broke `npm install` in current-major repos.
