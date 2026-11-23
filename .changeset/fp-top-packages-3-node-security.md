---
'eslint-plugin-node-security': patch
---

Fix false positives found linting popular Node.js packages and Express/NestJS starters.

- `no-zip-slip`: `zlib.createGzip()` / `createGunzip()` no longer make a file an archive file (a gzip stream has no entry names), so `path.join(this.dirname, this.filename)` in a log transport is not an archive entry. A bare `unzip(...)` call whose callee is bound to a relative module is the project's own code and is not an extraction. A member used as the base of `path.join(opts.path, entry.path)` is the extraction destination, not an entry. The same join in a file that imports an archive library, a bare `unzip` imported from a package, a relative binding that is reassigned, and an entry used as its own base still report.
- `require-stream-error-handler`: an `'error'` listener at the end of a pipe chain (`src.pipe(dest).on('finish', f).on('error', h)`) covers `dest`, because `.pipe()` returns its destination. A stream returned from the function that built it is handed to the caller, who owns its listeners. A stream piped into and never returned, passed on or listened to still reports.
