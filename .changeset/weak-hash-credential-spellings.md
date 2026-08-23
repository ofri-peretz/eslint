---
'eslint-plugin-node-security': minor
---

`no-weak-hash-algorithm` sees twelve more spellings of "this is a credential".

An adversarial wave hashed seventeen common credential identifiers with MD5 and
found **twelve silent**. Every one is CWE-327:

```
pwd  userPwd  passphrase  passPhrase  otp  mfaCode
pinCode  masterKey  securityAnswer  seedPhrase  mnemonic
```

`seedPhrase` and `mnemonic` are the worst of them — an MD5 digest of a wallet
recovery phrase is about as bad as this rule gets.

The additions are chosen against `makeNameTest`'s mechanics rather than by
feel. An entry under six characters matches **whole words only**, so `pwd`
reads `pwd` and `userPwd` and cannot collide inside a longer word. Entries of
six or more also match as a substring of the joined identifier, which is why
the compounds are listed whole — `pincode`, not `pin`.

**`pass` and `pin` are deliberately absent.** Both are ordinary words in code
that has nothing to do with credentials — a test `pass`, a `pin` on a map — and
both are short enough to match whole words. The compound forms that *do* mean a
credential are covered by their full spelling, the same trade the list already
makes for `cert` versus `certificate`.

Measured on the pinned 8-repository corpus: **925 findings before, 925 after**.
Pure recall, no cost on real code. The FP control in the new test is the half
that proves it — `passenger`, `bypassRoute`, `pinnedTabs`, `mapPin`,
`passingTests` and `seedData` all stay silent.
