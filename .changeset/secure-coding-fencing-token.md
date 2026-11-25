---
'eslint-plugin-secure-coding': patch
---

fix: no-sensitive-data-exposure does not treat a fencing or cancellation token as a credential

nestjs/locks logs `lock.fencingToken`, the increasing number a lock service hands each new holder. The word `token` alone decided it. `fencingToken`, `fencing_token` and `cancellationToken` no longer report; `fencingTokenSecret` and any other token still do.
