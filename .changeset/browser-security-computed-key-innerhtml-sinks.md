---
'eslint-plugin-browser-security': patch
---

fix: the innerHTML sink family and the transport gate read a subscripted member

`el['innerHTML'] = e.data` and `el['insertAdjacentHTML'](…)` write the same
markup from the same untrusted payload as the dotted spellings, and
`axios['get'](…)` / `self['importScripts'](…)` fetch the same resource.
`no-postmessage-innerhtml`, `no-filereader-innerhtml`,
`no-websocket-innerhtml`, `no-worker-message-innerhtml` and the shared
`transport-ownership` gate all compared `property.name` first.

A sink chosen at runtime — `el[sink] = e.data` — has no statically known name to recognise
and is now pinned as the refusal in each of the four rules.
