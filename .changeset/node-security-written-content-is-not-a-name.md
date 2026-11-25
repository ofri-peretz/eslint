---
'eslint-plugin-node-security': patch
'oxlint-plugin-node-security': patch
---

fix(node-security): require-storage-encryption no longer reads written text as a credential name

The credential evidence shared by `require-storage-encryption` and `require-secure-credential-storage` treated the text of any string literal or template as a name. A test writing a fake CLI stub, ``writeFileSync(bin, `#!/bin/sh\nprintf '{"usage":{"input_tokens":10}}'\n`)``, was reported as a credential written to disk, because the joined text contains `token`. A string now counts as name evidence only when it is one name-shaped token (a storage key, a file path such as `` `${dir}/token.json` ``); text with whitespace, quotes or braces is content. Fixes #1548.
