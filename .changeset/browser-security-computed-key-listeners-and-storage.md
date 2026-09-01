---
'eslint-plugin-browser-security': patch
---

fix: seven more browser rules read a string-subscript member

`window['addEventListener']('message', …)`, `URL['createObjectURL'](blob)`,
`window['open'](location.hash)`, `localStorage['getItem']('isAdmin')`,
`navigator.serviceWorker['register'](u)`, `res['setHeader'](…)` and
`req['headers'].origin` all reach exactly what their dotted spellings reach.
Seven rules compared `property.name` first and went silent on every one.

One pinned test was a false POSITIVE rather than a miss:
`require-postmessage-origin-check` reported a message handler that guards on
`ALLOWED.test(event['origin'])` — a working anchored origin check the rule
could not see. It is now correctly accepted.
