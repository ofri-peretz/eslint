---
'eslint-plugin-node-security': patch
---

fix: buffer, AEAD and length-prefix gates read a subscripted method

`b['readUInt8'](0)` reads the same bytes, `crypto['createDecipheriv'](…)`
opens the same unauthenticated decipher, and `chunk['readUInt32BE'](0)` is the
same attacker-controlled length prefix.
