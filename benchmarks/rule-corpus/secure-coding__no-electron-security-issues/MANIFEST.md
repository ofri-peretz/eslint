# Rule corpus — `secure-coding/no-electron-security-issues` (CWE-16)

**The question this corpus exists to answer:** this rule had already shipped one
name-inference defect — it matched the letters `ui` inside `benchmarks/suites/`,
so the same file reported differently depending on which directory you ran ESLint
from. That was fixed by splitting the path into segments. Did the fix reach the
defect, or only its most visible symptom?

It reached the symptom. The segment rewrite kept `ui`, `view` and `views` as
whole directories, and `renderer.js` / `preload.js` as basenames — and then
decided, from those alone, that a file runs in an Electron renderer process.
`src/ui/**` is the components directory in essentially every React and Vue app;
`views/` is the Express template directory; `renderer.js` is what React, webpack
and every static-site generator call their rendering module. Every one of them
was reporting `require('fs')` as CWE-16 in projects with no Electron at all.

So the corpus is built around one distinction the rule could not previously
make: **is this an Electron file, or is it a file with an Electron-shaped name?**

## Layout

`vulnerable/` — must be reported at least once. `safe/` — must produce nothing.

The filenames are load-bearing for two fixtures. The duel harness lints each
file under its basename, so `renderer.node-access.js` (vulnerable) and
`renderer.markdown.js` (safe) are the same filename convention carrying opposite
verdicts, separated only by whether the file loads Electron.

## What the corpus proved

| # | Fixture | Defect | Outcome |
|---|---|---|---|
| 1 | `safe/renderer.markdown.js` | `directNodeAccess` decided "this is a renderer" from the filename alone, with no Electron evidence anywhere in the file | **Fixed** — gated on the devkit's shared `createModuleEvidence` probe (`electron`, `@electron/*`, `electron-*`), and `ui` / `view` / `views` removed from the directory list |
| 2 | `vulnerable/10-quoted-keys.js` | `{ 'nodeIntegration': true }` and `{ 'webPreferences': { … } }` were invisible: only `Identifier` keys were read, so quoting a key changed the verdict | **Fixed** — a shared `propertyName()` accepts a string-literal key; computed keys are still skipped rather than guessed at |
| 3 | `vulnerable/07-legacy-remote-module.js` | `enableRemoteModule`, `webviewTag`, `nodeIntegrationInWorker`, `nodeIntegrationInSubFrames` and `allowDisplayingInsecureContent` were absent from the option list, all of them on Electron's own security checklist | **Fixed** — one table, exact membership, plus a `legacyElectronFeature` message |
| 4 | `safe/07-local-preload-paths.js` | An unsafe preload was decided by `path.includes('http')`, `('remote')`, `('node_modules')`. `./preload/remote-control-preload.js` and `./src/http-client/preload.js` are local application files | **Fixed** — decided from the path's shape: a URL scheme or protocol-relative specifier, or `node_modules` as a whole segment |

Every fix is locked by a regression block in
`packages/eslint-plugin-secure-coding/src/rules/no-electron-security-issues/no-electron-security-issues.test.ts`,
each verified to fail against the rule as it stood before.

## The recall gap that is NOT fixed

`vulnerable/09-shell-open-external.js` is missed and stays missed. `shell.openExternal(untrusted)`
is item 14 on Electron's security checklist and the best-known Electron RCE
chain, but it is a taint question about a call argument rather than a
configuration literal, and it needs a sink and a message this rule does not have.
Left as an honest false negative rather than papered over.

`{ [flagName]: true }` (a computed key resolving to a constant) is also missed,
deliberately: a computed key is a variable, and resolving it is a different piece
of work from reading a quoted one.

## Judgement on the rule

Not vacuous. The configuration half is a genuine, high-value check that fires on
the exact code Electron's own documentation warns about, and it now does so
without asking what anything is called. The `directNodeAccess` half is
narrower than it looks — it needs both an Electron import and a renderer-shaped
path — which is the correct trade: a renderer that uses Node and imports nothing
from Electron is indistinguishable from an ordinary Node module read one file at
a time, and the window that enabled `nodeIntegration` is still reported at its
own definition site.
