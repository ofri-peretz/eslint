---
'eslint-plugin-node-security': patch
---

Fix false positives found linting popular Node.js packages and Express/NestJS starters.

- `no-zip-slip`: `zlib.createGzip()` / `createGunzip()` no longer make a file an archive file (a gzip stream has no entry names), so `path.join(this.dirname, this.filename)` in a log transport is not an archive entry. A bare `unzip(...)` call whose callee is bound to a relative module is the project's own code and is not an extraction. A member canonicalized in place (`opts.path = path.resolve(path.normalize(opts.path))`) is not a join onto anything; any later read of it is judged on its own. The same join in a file that imports an archive library, a bare `unzip` imported from a package, a relative binding that is reassigned, two entries in one join, and an entry used as a join base still report.
- `require-stream-error-handler`: an `'error'` listener at the end of a pipe chain (`src.pipe(dest).on('finish', f).on('error', h)`) covers `dest`, because `.pipe()` returns its destination. A destination built in place is covered by the listener that ends the chain. A stream binding returned from the function that built it (resolved by scope, not by name) is handed to the caller, who owns its listeners. A stream piped into and never returned, passed on or listened to still reports.
