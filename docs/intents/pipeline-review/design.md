# Design — optimise for slots, not minutes

> Stage 2 artifact for [`intent.md`](./intent.md). The full audit is in
> [`findings.md`](./findings.md); the per-stage candidates and their
> hole-checks are in [`intents.md`](./intents.md).

**Status:** shipped · **Opened:** `2026-09-03` · **Owner:** `@ofri-peretz`

---

## Requirements

| #   | Requirement                                                                         |
| :-- | :---------------------------------------------------------------------------------- |
| R1  | Every candidate carries a measured verdict; none is left as an opinion.             |
| R2  | No change may rename or remove a required check context.                            |
| R3  | Every gate added fails OPEN — an unexpected state runs the check, never skips it.   |
| R4  | No exact cron collision (same minute + day-of-week) remains.                        |
| R5  | A job moved to a trimmed dependency tree is proven not to need what the tree omits. |
| R6  | Repository settings are untouched.                                                  |

## Design

**The lever is job count and per-job cost, not duration.** Minutes are free and
wall clock is `review`-bound, so the only quantities worth moving are the number
of slots a PR occupies and what each occupant pays before it starts working.

Three changes, each verified against a different failure mode:

1. **Scope the review** (#842). A job-level gate, never a `paths:` filter — a
   filtered workflow never reports and a required context that never arrives
   blocks every merge (R2). The gate fails open (R3).
2. **Lean dependencies** (#845). Nine script-only jobs move to the existing
   `node-modules-lean-v4-*` key. All twelve scripts they run were grepped for
   `apps/` imports first (R5).
3. **Stagger the last cron collision.** `weekly-benchmark` moves off 09:00
   Monday, which `metrics-freshness` occupies for a documented reason — it must
   follow the 08:00 peer-health snapshot (R4).

## Verification

```bash
# R4 — exact minute+dow collisions, expect 0
python3 - <<'PY'
import os,re,collections
D='.github/workflows'; rows=[]
for f in os.listdir(D):
    if f.endswith('.yml'):
        for m in re.finditer(r"cron:\s*['\"]([^'\"]+)['\"]", open(f'{D}/{f}').read()):
            c=m.group(1).split()
            if len(c)>=5: rows.append((c[1],c[0],c[4],f))
print(sum(1 for k,n in collections.Counter((r[0],r[1],r[2]) for r in rows).items() if n>1))
PY

# R2 — required contexts still provided by a workflow
gh api repos/ofri-peretz/eslint/branches/main/protection \
  --jq '.required_status_checks.contexts[]'

# R3 — the review gate's fail-open path
npx vitest run scripts/__tests__/review-scope-lock.test.ts
```

## Rejected

- **Consolidating the small PR-gate jobs.** Measured: frees ~5 slots, serialises
  ~110s of currently-parallel work, and renames a required context. Revisit only
  with a queue simulation.
- **`install: false` on the script jobs.** Every one runs an npm script.
- **Sharding `benchmark.yml` further.** It is scheduled; nobody waits, and more
  shards worsen the ceiling it already strains.
- **Deleting `deploy.yml`** on the basis of 0 runs in 30 days. It is dispatched
  by `auto-deploy.yml` for storybook and registry, which simply were not
  affected in the window.
