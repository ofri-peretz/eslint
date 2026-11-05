---
'eslint-plugin-modernization': patch
---

fix: rules now decide by code structure, found by the new Quint fidelity models.

- `no-instanceof-array`: the built-in `Array` by binding. An imported or parameter `Array` is not reported; `x instanceof globalThis.Array` is.
- `prefer-event-target`: Node's EventEmitter by where the binding comes from. Angular's `EventEmitter`, a local class and a member of a parameter are not reported; the default import, the required module itself, a namespace member with `new` and a quoted require key are. A named import or destructured require is reported once, where it is bound, not again at each `extends`. A `require` that is not Node's loader (a parameter, a local function) is not reported; a `createRequire` loader is.
- `prefer-at`: the implicit `arguments` object (which has no `.at()`) is not reported; a non-null asserted receiver (`xs![xs!.length - 1]`) is. `checkLastElement: false` now stops the last-element report. A fractional offset (`xs[xs.length - 1.5]`) is not reported, a write through a TS wrapper (`(xs[xs.length - 1]!) = v`) is not reported, and `o['a.b']` no longer matches `o.a.b` as the same receiver.
