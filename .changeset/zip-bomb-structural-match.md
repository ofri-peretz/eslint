---
"eslint-plugin-secure-coding": patch
---

`no-unlimited-resource-allocation` no longer reports passport-jwt as a ZIP bomb.

The decompression branch matched the callee's printed text for the bare
substring `Extract` and then reported unconditionally, so the standard
passport configuration —

```js
jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
```

— was reported as an unbounded decompression in four separate repositories.
Nine findings on the 13-repo wild corpus, none of them touching an archive.

Decompression is now matched on the AST: the receiver must resolve to a known
archive module (`unzipper`, `tar`, `yauzl`, `adm-zip`, `zlib`) through its
import or `require` binding, and the method must be one of its decompression
entry points. Aliased bindings such as `const unzip = require('unzipper')`
still report; an identifier that merely reads like one does not.

9 → 0 on the wild corpus with no true positives lost.
