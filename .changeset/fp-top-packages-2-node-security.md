---
'eslint-plugin-node-security': patch
---

Fix false positives found linting popular Node.js packages.

- `no-unsafe-buffer-alloc`: a buffer filled by `fs.read(fd, buf, 0, n, pos, (err, bytesRead) => buf.slice(0, bytesRead))` is recognised in the callback spelling, as the synchronous and promise spellings already were, provided the callback's third parameter (which aliases the whole buffer) is absent or never read; and `count === buf.byteLength ? buf : buf.subarray(0, count)` after a `readSync` hands out the whole buffer only on the arm where the read filled it. A callback that reads its third parameter, a callback that hands out the whole buffer, and the unmatched arm of the length test still report.
- `no-deprecated-buffer`: `new Buffer(...)` in the branch of a feature check that only a runtime without `Buffer.alloc` / `Buffer.allocUnsafe` / `Buffer.from` takes is not reported. The same call in the branch that runs where the API exists, behind an unrelated test, or with no check still reports.
- `no-buffer-overread`: the `noAssert` argument is recognised on `Buffer`'s numeric accessors only (`readUInt32LE`, `writeDoubleBE`, `readUIntBE`...). `writeFileTo(path, data, true)` is an `overwrite` flag, not `noAssert`.
