---
'@interlace/eslint-devkit': minor
---

fix: `createPayloadResolver` recognises a handler attached by string subscript

`ws['onmessage'] = fn` and `window['addEventListener']('message', fn)` attach
exactly the handlers their dotted spellings attach. The resolver compared
`property.name`, so every rule built on it — the postMessage, WebSocket,
Worker and FileReader sink rules across `eslint-plugin-browser-security` —
lost the payload entirely and reported nothing.

A test had pinned this as "the attached property is not a plain name". It is a
plain name; it is the name a minifier writes. A property chosen at runtime,
`ws[prop] = fn`, genuinely names nothing and is now the pinned refusal.
