---
'@interlace/eslint-devkit': patch
'eslint-plugin-node-security': patch
---

Scaffolding for tests is now recognised as test material, and
`no-math-random-crypto` allows test files by default.

`testUtils/`, `test-utils/`, `testing/`, `test-helpers/` and their siblings hold
the builders and fake objects a suite consumes. They appear in six of the eight
public repositories in the current sample, and none of them was recognised. The
pattern is spelled out rather than matched as a prefix, because `test` also
starts `testimonials`.

`no-math-random-crypto` defaulted to reporting in test files. A fake OIDC user
whose `session_state` is filled with `Math.random()` is what a test double looks
like, and the suggested fix — use `crypto.getRandomValues` — makes a fixture no
safer. The rule's subject is unpredictability at runtime and a fixture has no
runtime. Set `allowInTests: false` to restore the old behaviour.

Together these take City-of-Helsinki/haitaton-ui from 4 findings to 0 across
61.7 KLOC.
