---
'eslint-plugin-reliability': patch
---

fix: `no-unsafe-type-narrowing`'s `allowWithComment` no longer disarms the whole file

Two compounding defects. `/known/i` matched inside **unknown** — the word most likely to
appear next to an `as unknown as T` cast — and `/safe/i` matched inside **unsafe**, so a
comment condemning a cast whitelisted it. Both keywords are now word-bounded, which keeps
the intended `// known to be this type` and `// safe - validated above` working.

Separately, the proximity check had no lower bound: for a comment _below_ the assertion the
line distance goes negative, which satisfies `<= 1` at any range. One trailing comment
silenced every assertion above it — 988 lines away, in the case that surfaced this.
