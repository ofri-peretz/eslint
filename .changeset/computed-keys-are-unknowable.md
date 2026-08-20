---
'eslint-plugin-node-security': minor
---

`detect-non-literal-fs-filename` now sees through a computed key.

`readFileSync(cfg[prop])` was silent while `readFileSync(dir)` reported — the
weaker evidence produced the louder verdict. A computed key selects *which*
value you get, so an unknowable key makes the result unknowable however
well-known the object is; `containsFreeVariable` simply had no MemberExpression
case and never visited the key.

The object is deliberately not walked. ESLint resolves no Node globals by
default, so `process` reads as a free variable and recursing into the object
would report every `process.env.HOME` in existence. Static keys name one fixed
slot and are left to the checks that already own them — `import.meta.url` stays
quiet.

Measured over the 20-repository real-source corpus — 21,394 files, 3.10M lines —
this rule reports **0 findings**, unchanged by the new branch. Because the branch
only ever adds a `true`, findings can only increase, so zero after means zero
before: the recall came with no new noise.

This closes the last uncovered case on eslint-plugin-security's own must-detect
corpus, taking weighted parity to **51/51 (100%)** with `fires-on-valid`
unchanged.
