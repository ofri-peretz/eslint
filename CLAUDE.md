# CLAUDE.md — agent contract for this repo

Map and commands: [AGENTS.md](./AGENTS.md). PR flow: the `ship-a-pr` skill. Rule-authoring
doctrine: [docs/RULE_AUTHORING.md](./docs/RULE_AUTHORING.md). Everything else is a check whose
failure message names the fix; skipped hooks and CI polling loops are denied by
`.claude/hooks/guard-bash.mjs`.

- **Lock everything you fix.** Not done until reverting the fix turns CI red: a vitest lock in
  `apps/docs/src/__tests__/*-lock.test.ts(x)`, a shape lock plus a live check for external data.
  (judgment, until proofline)
- `npm run ci:local` mirrors the pre-push gate. `git commit` and `git push` run lefthook and can
  take minutes: not a hang.
- Reproduce visual bugs at **~390px** before claiming a fix; mobile regresses most.
- **Dev hits live APIs; prod serves cached JSON.** Broken-in-prod, fine-in-dev is the expected
  failure mode.
- Only `main` deploys. Never loosen CSP in `next.config.mjs`; a new image host is an explicit
  `images.remotePatterns` entry, never a wildcard.
