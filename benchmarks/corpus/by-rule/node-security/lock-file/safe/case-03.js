// node-security/lock-file — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// @note         Replaced by hand (2026-10-18). This used to be the "deep
//               monorepo" valid case — `packageManager: "pnpm"` — copied
//               without the pnpm-locked project path that made it valid. Here
//               it sits in a repo that commits package-lock.json, so it fired
//               on every run, and the project-scoped finding landed on this
//               file or on vulnerable/case-01.js depending on lint order. It
//               is now the spelled-out `any` case, which this repo satisfies.
// This MUST NOT be flagged by node-security/lock-file
/* eslint node-security/lock-file: ["error", {"packageManager":"any"}] */
const validAny = 1
