---
'eslint-plugin-modernization': major
---

fix!: `prefer-event-target` is no longer autofixable — its fix broke the program

The fixers rewrote the **binding name and nothing else**:
`import { EventEmitter } from 'events'` became
`import { EventTarget } from 'events'`, and the `require` form the same.

Two things were wrong with that. `events` exports no `EventTarget` — it is a
global in Node 15+ — so the rewritten import resolved to `undefined`. And the
fix never touched the use site, leaving `class Bus extends EventEmitter` bound
to a name that was no longer imported. Running `--fix` over working code
produced a file that cannot run:

```js
import { EventTarget } from "events";      // undefined
export class Bus extends EventEmitter {}   // unbound identifier
```

`EventEmitter` → `EventTarget` is a semantic migration — `.on()`/`.emit()`
against `.addEventListener()`/`.dispatchEvent()`, different error semantics,
and a breaking change for any exported class. No mechanical rewrite is
correct, so the rule now reports and leaves the decision to you.

**Reporting is unchanged.** This removes a fix that damaged source; it does not
weaken detection. Marked major because `--fix` behaviour changes for anyone who
had it enabled.

## Migration

Nothing to change in your config — the rule id, severity and messages are the
same. What changes is that `eslint --fix` no longer edits these sites.

If a previous `--fix` run already rewrote your imports, the damage looks like
this and needs reverting by hand:

```js
// Broken by the old fixer — `events` has no EventTarget export
import { EventTarget } from "events";
export class Bus extends EventEmitter {}

// Correct: either keep EventEmitter…
import { EventEmitter } from "events";
export class Bus extends EventEmitter {}

// …or migrate deliberately, using the global EventTarget and its API
export class Bus extends EventTarget {}
```

Search for `from "events"` / `require("events")` alongside a named
`EventTarget` import — that combination is always wrong and only the old fixer
produced it.
