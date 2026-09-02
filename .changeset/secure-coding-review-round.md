---
'eslint-plugin-secure-coding': patch
---

fix: `ipcRenderer['send'](...)` and `app['get'](...)` name the same call

`no-electron-security-issues` resolved the IPC method off `property.name`, so
a subscripted `send`/`invoke`/`handle` crossed the same bridge with the same
payload unreported. `no-missing-authentication` resolved a route registration
and a middleware reference the same way, so `app['get']('/api/users', h)`
registered an unguarded route in silence.

Both were found by teaching the computed-key probe to honour each case's own
options: 1,077 of the ledger's TP cases carry options and had been probed
under defaults, so a case that only fires when configured looked like a case
that never fired.
