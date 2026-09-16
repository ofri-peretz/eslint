---
'eslint-plugin-secure-coding': patch
---

fix: `detect-object-injection` copy-loop guards must now name the key

`detect-object-injection` no longer treats a guard-shaped token that has nothing to do with the loop key as a guard. Both copy-loop arms decided "is this body guarded?" by joining the body's tokens and running a substring regex over the result, so the scan asked whether a guard SPELLING appeared anywhere — never which key it tested, nor which object, nor whether it related to the loop at all. An unrelated `LEVELS.includes(process.env.LOG_LEVEL)`, or a log line that merely named `constructor`, silenced the canonical CWE-1321 primitive: measured in Node 24, the recursive spelling of the silenced body pollutes `Object.prototype` globally. The suppression now requires a guard BOUND to the key — `ALLOWED.includes(k)`, `set.has(k)`, `Object.hasOwn(o, k)`, `Object.prototype.hasOwnProperty.call(o, k)`, `k in schema`, or `k === '__proto__'` — which is what both messages already promised. This is the contract the write path has held all along ("hasOwn naming a DIFFERENT key does not guard"); the copy-loop arms were looser still, accepting a guard that named no key at all. Guards that do name the key are unaffected, and the AST walk keeps a `__proto__` written inside a COMMENT from clearing the finding, which is why the token scan existed in the first place.
