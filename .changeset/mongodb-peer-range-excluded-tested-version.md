---
'eslint-plugin-mongodb-security': patch
---

Widen the `mongodb` / `mongoose` peer ranges to include the versions actually tested

The declared peers had fallen a major behind reality on both drivers:

| SDK | Was | Now | Tested against |
| :--- | :--- | :--- | :--- |
| `mongodb` | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0` | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` | 7.2.0 |
| `mongoose` | `^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` | `^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0 \|\| ^9.0.0` | 9.7.4 |

The package develops and tests against `mongodb@^7.5.0` and `mongoose@^9.7.4`,
so the ranges excluded the exact versions `mongodb-interface.spec.ts` proves
the rules work on — every consumer on a current driver got a peer warning for
a combination CI validates on every run.

Both changes are purely additive: no previously-supported major was dropped,
so no existing install gains a warning. The rules match driver call shapes
(`find`, `updateOne`, `$where`, schema options) that are unchanged across v4–v7
and v6–v9 respectively.
