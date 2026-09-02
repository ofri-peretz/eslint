# Intent — the gates that protect main are click-ops, and one already vanished

> Stage 1 artifact of the AI-native SDLC. Opened after a required-reviewer rule
> that was created and verified this morning was gone by the afternoon, with
> nothing in the repository that manages it.

**Status:** draft · **Opened:** 2026-09-01 · **Owner:** @ofri-peretz

---

## What is wanted

The controls that decide what reaches `main` and npm are declared somewhere a
diff can be read, and a drift between the declaration and GitHub's live settings
is detected without anyone remembering to look.

## Why now

On 2026-09-01 a required-reviewer rule was added to the `production`
environment, so an npm publish would wait for a human. The API confirmed it
(rule `64119077`, reviewer `ofri-peretz`). Hours later:

```
gh api repos/ofri-peretz/eslint/environments/production
→ {"can_admins_bypass": true, "rules": []}
```

The rule is gone, and the release at 12:54 published
`eslint-plugin-operability@4.0.1` in 24 seconds without pausing. All three
environments — `production`, `docs-production`, `staging` — now carry zero
protection rules. Nothing in `.github/`, `scripts/` or `tools/` writes
environment configuration, so there is no in-repo change to blame and no history
to read. Who removed it cannot be determined from here.

The branch-protection half survived the same window — `review` is still a
required context, `enforce_admins` and conversation resolution are still on — but
it survived by luck, not by mechanism. It is stored the same way, edited the same
way, and would disappear the same way.

This is a control that fails **open** and **silently**. The only reason the gap
was found is that someone happened to re-check a setting they had already
confirmed, and reported as done.

## Affected users and systems

Branch protection on `main`, the `production` / `docs-production` / `staging`
environments, and every release that runs through them. Downstream: the
"a human accepts at Deploy" rule in `AI_NATIVE_SDLC.md`, which currently has no
enforcement behind it at all.

## Constraints

- Do not trade auditability for convenience. `can_admins_bypass` staying true is
  deliberate — a required check that cannot be overridden during an incident is
  its own outage — but a bypass must be visible after the fact.
- A declaration must not become a second source of truth that silently disagrees
  with GitHub. Either it applies the settings, or it only reports drift; a file
  that claims to describe reality and does not is worse than no file.
- Whatever reads these settings needs a token with admin scope. That token is now
  part of the security surface and has to be justified, not just added.

## Success criteria

- The intended state of branch protection and every environment is committed to
  the repository and reviewable in a diff.
- A drift between the committed state and GitHub's live settings is reported
  without a human initiating the check, and the report names the specific setting.
- Re-applying the required reviewer on `production` is verified by that mechanism
  rather than by a one-off API call — the same way it was "verified" this morning.
- Deleting a protection deliberately leaves a record; deleting one accidentally
  goes red.

## Open questions

- Report-only drift detection, or apply-from-file? Applying is stronger and turns
  a compromised token into a way to silently weaken every gate at once.
- Does this belong in this repo, or across the estate? The same click-ops problem
  exists in every sibling repo, and solving it once is the point of
  `AI_NATIVE_SDLC.md` living one level up.
- Should the required reviewer go back on `production` immediately as a stopgap,
  accepting that it can vanish again until this ships?
