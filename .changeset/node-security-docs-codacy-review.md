---
'eslint-plugin-node-security': patch
'oxlint-plugin-node-security': patch
---

docs(node-security): eight doc defects found by Codacy's reviewer, and every doc's CWE and severity now match the rule

Codacy renders these docs from the release tag (codacy/codacy-eslint#5025).

- `no-unsafe-buffer-alloc`: a one-argument `copy`/`set`/`write` from a source
  shorter than the buffer leaves the tail uninitialized. The rule accepts it as
  covering; that is now documented as a known false negative, and the safe
  examples size from the source or send only `buf.subarray(0, written)`.
- `no-toctou-vulnerability`: the suggested fix was `access()` then
  `readFile()`, the race itself. It is now one `open` (with `O_NOFOLLOW` or
  `'wx'` as the case needs) and an `ENOENT` handler.
- `no-ssrf`: the safe example allowlisted a hostname and never checked where it
  resolved. It now resolves, rejects private, loopback and link-local
  addresses, and pins the socket to the checked address.
- `detect-non-literal-fs-filename`: `startsWith(baseDir)` accepted
  `/safe-dir-evil`. Containment is now `path.relative`-based, with a realpath
  check for symlinks.
- `no-static-iv`: the AES-GCM example dropped the auth tag. It now stores
  `getAuthTag()` with the nonce and calls `setAuthTag()` on decrypt.
- `detect-child-process`, `detect-non-literal-fs-filename`, `no-buffer-overread`,
  `no-zip-slip`: a template `CWE-693` header replaced by the rule's CWE.
  Front-matter `cwe` and `severity` now match each rule's meta and CVSS band
  across all node-security docs.
- `lock-file`: "npm, yarn, or npm" now reads "npm, yarn, or pnpm", the schema's
  enum.
