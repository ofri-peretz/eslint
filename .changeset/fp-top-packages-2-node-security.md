---
'eslint-plugin-node-security': patch
---

Fix false positives found linting popular Node.js packages.

- `no-unsafe-buffer-alloc`: a buffer whose every byte is written before it is used is no longer reported in four more spellings: `src.copy(buf, 0, from, from + SIZE)` into a buffer allocated with that same `SIZE`; `this.m = Buffer.allocUnsafeSlow(src.length); this.m.set(src)`; `fs.read(fd, buf, 0, n, pos, (err, bytesRead) => buf.slice(0, bytesRead))`; and `count === buf.byteLength ? buf : buf.subarray(0, count)` after a `readSync`. A copy range shorter than the allocation, a copy at a later offset, a property sent before it is filled, a callback that hands out the whole buffer, and the unmatched arm of the length test still report.
- `no-deprecated-buffer`: `new Buffer(...)` in the branch of a feature check that only a runtime without `Buffer.alloc` / `Buffer.allocUnsafe` / `Buffer.from` takes is not reported. The same call in the branch that runs where the API exists, behind an unrelated test, or with no check still reports.
- `no-buffer-overread`: the `noAssert` argument is recognised on `Buffer`'s numeric accessors only (`readUInt32LE`, `writeDoubleBE`, `readUIntBE`...). `writeFileTo(path, data, true)` is an `overwrite` flag, not `noAssert`.
