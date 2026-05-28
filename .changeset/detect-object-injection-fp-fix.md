---
"eslint-plugin-secure-coding": patch
---

fix(detect-object-injection): suppress ~3,470 Edge false positives via four new safe-pattern guards

- Test-file skip: rule is now silent on `*.test.*`, `*.spec.*`, `__tests__/`, and `*.fixture.*` paths
- `for...in` loop variable: keys from `for (const key in obj)` are own property names, not user input
- `Object.keys/entries` iteration: `for (const key of Object.keys(obj))` is safe by construction
- Typed-array objects (`new Float32Array/Uint8Array/Int32Array/…`): element access is numeric, not string-keyed

None of the guards widen the TP surface — dangerous properties (`__proto__`, `constructor`, `prototype`) and genuine user-input bracket access still fire. Closes the largest single source of ILB-Wild noise.
