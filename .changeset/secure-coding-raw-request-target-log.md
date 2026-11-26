---
'eslint-plugin-secure-coding': patch
---

`no-log-injection` no longer reports the raw request target. `req.url`, `request.url`, `ctx.url` and `req.path` / `ctx.path` hold the target as it came off the wire, and Node's HTTP parser rejects a request whose target carries a literal CR or LF (a percent-encoded `%0d%0a` stays encoded), so a forged log line cannot start there. The decoded and parsed parts (`query`, `params`, `body`, `headers`, `cookies`), a `url` read from them, and a `url` on an `event` or `message` root keep reporting. Seen on cal.com and Teable.
