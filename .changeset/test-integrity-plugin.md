---
'eslint-plugin-test-integrity': minor
'@interlace/eslint-devkit': patch
---

feat(test-integrity): new plugin — no focused tests, unexplained skips, fixed sleeps or retries

Four rules for the ways a test suite is made to pass without the code passing:
`no-focused-test` (`.only`, `fit`), `no-unexplained-skip` (`.skip`, `.todo`, `xit`, constant
`skipIf` — legal with an issue URL, a decision id or an unexpired date in a comment),
`no-fixed-sleep` (`setTimeout` promises, `await sleep(n)`, `page.waitForTimeout`) and
`no-test-retry` (`retry` / `retries` in tests and runner configs). A call counts as a test only
when its root is an unbound global or imported from a test runner. Every rule runs on ESLint and
oxlint. Presets: `recommended` (errors) and `adoption` (warnings).

The `test-integrity-diff` bin adds the two changed-lines checks a rule cannot see, for a lefthook
`pre-push` step: an assertion moved to a weaker matcher (`toBe` → `toBeTruthy`), and a snapshot
changed with no `Snapshot:` reason in the commit message.
