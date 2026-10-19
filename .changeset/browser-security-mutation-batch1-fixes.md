---
'eslint-plugin-browser-security': patch
---

fix(browser-security): wrong verdicts surfaced by Stryker mutation testing (batch 1)

- `require-postmessage-origin-check` no longer reports a `message` listener on a WebSocket, Worker, EventSource or BroadcastChannel held in a class field. This covers a field initialiser (`socket = new WebSocket(url)`), a private field (`#socket = new WebSocket(url)`, `#socket!: WebSocket`, or `this.#socket = new WebSocket(url)` in the constructor), and a quoted computed key (`['connection']: WebSocket`). Those messages have no origin to check. The same receiver was already exempt when assigned in a method or declared as a public field.
- `no-postmessage-wildcard-origin` now reports a wildcard written as a template literal: ``postMessage(data, `*`)`` and ``{ targetOrigin: `*` }``.
- `no-disabled-certificate-validation` now reports `process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0` and `` = `0` ``. `process.env` stores every value as a string, so both disable certificate verification exactly like `= '0'`, which was already reported.
- `no-jwt-in-storage` now treats a template-literal flag like ``setItem('auth_attempted', `1`)`` the same as its quoted spelling `'1'`, which was already exempt.
