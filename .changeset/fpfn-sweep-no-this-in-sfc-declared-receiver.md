---
'eslint-plugin-react-features': patch
---

fix: `no-this-in-sfc` reported a declared TS `this` parameter, and lost class context on a nested class

Two defects in the same predicate. A function that declares an explicit `this` parameter has named its own receiver in its signature — `function (this: unknown, ...args)` forwarding through `fn.apply(this, args)` is the canonical shape — and `this` there is a declared contract, not a component mistake; it is now exempt. Separately, class tracking was a boolean flag rather than a depth, so a class nested inside a class cleared the flag on exit and valid `this` in the ENCLOSING class body then reported. It is now a depth counter.
