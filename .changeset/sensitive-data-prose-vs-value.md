---
'eslint-plugin-secure-coding': patch
---

`no-sensitive-data-exposure` no longer reports when the surrounding prose names
a credential but the interpolated value names itself an outcome.

```js
// no longer reported — the label describes the operation that FAILED
throw new Error(`Failed to fetch access token: ${error.message}`);
throw new Error(`Token request failed with status ${tokenResponse.status}`);

// still reported — these log the credential itself
console.log(`Using token from ${source}: ${tokenFromEnv}`);
console.log(`Using password from dev: ${password}`);
```

On the pinned 8-repository corpus this rule produced six findings. Four were
the first shape and leaked nothing; two were the second and are real. The
property is structure and the label is prose, so the property wins.

Two report paths had to close, not one. The text heuristic matched
label-separator-hole, and the value path separately matched
`tokenResponse.status` by reading the **receiver's** name and ignoring what was
taken from it — the same defect `VALUE_FREE_PROPERTIES` already fixed for
`.length`, one property set over.

The new `DIAGNOSTIC_ACCESSORS` set is protocol-grounded rather than
vocabulary: `message` / `stack` / `name` are `Error.prototype`'s own, and
`status` / `statusText` are the HTTP response code and reason phrase. `code` is
deliberately excluded — an authorization code, a 2FA code and a recovery code
are all called `code`, and the rule cannot tell them apart.

Recall is unchanged: CWE corpus 69/69, zero false positives.
