---
'eslint-plugin-node-security': minor
---

fix(node-security): `no-math-random-crypto` reads a security value from the slot it lands in

A draw is now reported when the call names the slot with a string literal (`headers.set('X-SRF-TOKEN', ...)`, `res.setHeader`, `res.cookie`, `localStorage.setItem`, `url.searchParams.set('nonce', ...)`, `{ 'X-CSRF-Token': ... }`) and when it is the OAuth `state` of an authorization request (after `state=` in a URL, a `state` query parameter, or an object with `client_id` / `redirect_uri` / `response_type` / `scope`). `state` alone still decides nothing. Also no longer reported: a `.sort(() => Math.random() - 0.5)` shuffle, and keys qualified as `dom`, `element`, `node`, `item`, `list`, `child`, `component`, `render`, `data` or `color`.
