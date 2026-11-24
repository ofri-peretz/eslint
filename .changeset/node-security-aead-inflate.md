---
'eslint-plugin-node-security': patch
---

fix: no-unbounded-decompression accepts a payload an AEAD decipher authenticated

nestjs/workflows inflates a payload only after `Buffer.concat([decipher.update(…), decipher.final()])` on an `aes-256-gcm` decipher with `setAuthTag`. `final()` throws unless the tag verifies, so a bomb needs the key. The whole chain is required: a node:crypto `createDecipheriv` with a literal GCM/CCM/OCB/ChaCha20-Poly1305 algorithm, `setAuthTag`, `final()` on the same decipher, and every write of the payload binding.
