# CLAUDE.md — agent contract for this repo

Map and commands: [AGENTS.md](./AGENTS.md). Rule-authoring doctrine:
[docs/RULE_AUTHORING.md](./docs/RULE_AUTHORING.md). Everything else is a check whose failure
message names the fix.

- Reproduce visual bugs at **~390px** before claiming a fix; mobile regresses most.
- **Dev hits live APIs; prod serves cached JSON.** Broken-in-prod, fine-in-dev is the expected
  failure mode.
