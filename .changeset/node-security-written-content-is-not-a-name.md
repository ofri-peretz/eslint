---
'eslint-plugin-node-security': patch
---

fix(node-security): `require-storage-encryption` no longer reads written CONTENT as a credential name

`namesACredential` matched a credential word anywhere in a string or template literal's text, including the
_content_ being written to disk rather than a key or path naming it. A test stub that writes a fake CLI's JSON
output — `writeFileSync(bin, \`#!/bin/sh\nprintf '{"usage":{"input_tokens":10}}'\n\`)` — contains "token"
incidentally, inside prose that is printed, not stored, and was reported as an unencrypted credential write
(CWE-312).

Fixed by requiring a NAME to be a single token: no identifier, key or path segment contains whitespace, so a
multi-word or multi-line string is evidence of what is printed, never of what is stored.
