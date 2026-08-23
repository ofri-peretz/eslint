---
'eslint-plugin-node-security': minor
---

`no-weak-hash-algorithm` sees twelve more spellings of "this is a credential".

An adversarial wave hashed seventeen common credential identifiers with MD5 and
found **twelve silent**. Every one is CWE-327:

```
passphrase  passPhrase  otp  mfaCode  pinCode
masterKey  securityAnswer  seedPhrase  mnemonic
```

`no-math-random-crypto` had the same gaps — the two rules keep separate lists,
so a spelling missing from one is not missing from the other by construction.
`passphrase` and `mnemonic` are added there too.

`seedPhrase` and `mnemonic` are the worst of them — an MD5 digest of a wallet
recovery phrase is about as bad as this rule gets.

The additions are chosen against `makeNameTest`'s mechanics rather than by
feel. An entry under six characters matches **whole words only**, so `pwd`
reads `pwd` and `userPwd` and cannot collide inside a longer word. Entries of
six or more also match as a substring of the joined identifier, which is why
the compounds are listed whole — `pincode`, not `pin`.

**`pwd`, `pass` and `pin` are deliberately absent.** `pwd` was added first — the
commonest short spelling of "password", and the highest-value entry on paper.
A wider FP control then caught `pwdDirectory`, `pwdPath` and `currentPwd` all
reporting CWE-327 over ordinary filesystem code: in Node, `pwd` is also the
working directory. `password` has no second meaning; `pwd` does, in exactly the
ecosystem this plugin targets. Those three are now `valid` fixtures. Both are ordinary words in code
that has nothing to do with credentials — a test `pass`, a `pin` on a map — and
both are short enough to match whole words. The compound forms that *do* mean a
credential are covered by their full spelling, the same trade the list already
makes for `cert` versus `certificate`.

Measured on the pinned 8-repository corpus: **925 findings before, 925 after**.
Pure recall, no cost on real code. The FP control in the new test is the half
that proves it — `passenger`, `bypassRoute`, `pinnedTabs`, `mapPin`,
`passingTests` and `seedData` all stay silent.
