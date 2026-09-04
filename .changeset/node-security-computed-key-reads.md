---
'eslint-plugin-node-security': patch
---

A computed or quoted property key is still the same property.

Eight sites across seven rules read a key through
`X.key.type === Identifier` before touching `X.key.name`, so
`{ ['shell']: true }` and `{ 'shell': true }` named nothing while
`{ shell: true }` named the same property. All eight now use
`objectKeyName`, which returns an Identifier's name only when the key is
not computed, and any statically-known string otherwise.

`detect-non-literal-fs-filename` needed more than the helper. A
`prop.computed` bail sat before the key was ever read, so a destructured
require was matched in two spellings and missed in the third:

    const { readFile } = require('fs')              reported
    const { 'readFile': read } = require('fs')      reported
    const { ['readFile']: read } = require('fs')    silent

The third now reports. A key chosen at runtime — `const { [k]: read }` —
still names nothing readable and is still skipped.

`detect-child-process` also stops missing the template spelling of the
argv separator: ``spawn(cmd, [`--`])`` passes the same separator as
`spawn(cmd, ['--'])`.

Three rules are fully clear of the subscript blind spot as a result:
`detect-non-literal-fs-filename`, `no-insecure-rsa-padding` and
`no-self-signed-certs`. The remaining seven carry a second gate and are
tracked separately.
