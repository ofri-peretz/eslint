---
'eslint-plugin-jwt-security': patch
---

Stop matching JWT method names on files and receivers that have nothing to do with JWTs

`sign`, `verify` and `decode` are among the most common method names in
JavaScript, and every rule in this plugin matched them on name alone. Measured
over 102 open-source repositories, that reported:

- `new TextDecoder('gbk').decode(data)` — buqiyuan/nest-admin
- `textDecoder.decode(slice)` — the-mirror
- `argon.verify(user.hash, dto.password)` — argon2 password verification, vladwulf/nestjs-jwts

None involves a JWT. Two gates now apply, both using only local evidence:

1. **The file must import a JWT library** (`jsonwebtoken`, `jose`, `@nestjs/jwt`,
   `express-jwt`, `jwks-rsa`, `jwt-decode`), compared on the package root so
   subpath imports like `jose/jwt/verify` still count.
2. **A receiver explicitly imported from a non-JWT package is rejected** — the
   file gate alone is not enough, because a JWT tutorial imports `jsonwebtoken`
   _and_ `argon2`.

Neither gate requires the receiver to trace back to a JWT import, since a JWT
client is usually injected rather than constructed from one; demanding that
would trade this false-positive class for a false-negative one.

Affects all nine rules that go through `isJwtLibraryCall`.
