---
'eslint-plugin-jwt-security': patch
---

Fix three false negatives found by the Quint fidelity models:

- Every rule now follows a renamed `jsonwebtoken` import (`import { sign as issueToken } from 'jsonwebtoken'`, `const { verify: checkToken } = require('jsonwebtoken')`). A bare callee was matched by its own name, so an alias was silently skipped.
- `no-algorithm-confusion` treats `new X509Certificate(pem).publicKey` as public key material. The certificate's KeyObject is what a verifier is handed, so the documented `X509Certificate` evidence never applied to code that could run.
- `no-sensitive-payload` matches `additionalSensitiveFields` case-insensitively. Payload keys were lowercased before lookup but the configured names were not, so the documented `['customSecret', 'internalId']` matched nothing.

Docs: `require-algorithm-whitelist` no longer lists `{ algorithm: 'RS256' }` as a correct verify (verify ignores the singular key); the stale "aliased decode" and "`let` not detected" false-negative notes are corrected.
