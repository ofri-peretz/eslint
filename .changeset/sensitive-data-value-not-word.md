---
"eslint-plugin-secure-coding": patch
---

`no-sensitive-data-exposure` no longer reports prose that mentions a credential,
and now catches a concatenated credential in a log call.

The rule flagged any string containing the *word* password/token/secret, so
ordinary messages were findings — ten across the 13-repo wild corpus, including
`throw new Error('Token not found')` and a message quoting a password policy
back to the user, which is the opposite of a leak.

A standalone string literal must now carry a value (`password: hunter2`,
`api_key=abc123`) rather than name a concept. The identifier path deliberately
keeps the plain word match: a variable named `password` is sensitive because of
what it holds.

The same change closes a pre-existing false negative. The logging path handled
`Literal` and `Identifier` arguments but not a concatenation of the two, so
`console.log('password: ' + password)` — the case this rule most exists for —
was silent.

10 → 0 false positives on the wild corpus, with a real detection added.
