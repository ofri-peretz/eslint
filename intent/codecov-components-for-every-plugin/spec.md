# Spec: eleven plugins report no coverage at all

Intent: [`intent.md`](./intent.md). Status: draft.

## Requirements

- **R1** Every published `packages/eslint-plugin-*` has exactly one `component_id` in
  `codecov.yml`, whose `paths` resolve to a directory that exists.
- **R2** No plugin ships a Codecov badge for a component that does not exist. A README
  either has a real component or no badge.
- **R3** Admitting a component must not turn an existing green check red. A package
  enters at a target it already meets.
- **R4** The entry target is visible, not implied: if a package enters below 100%, its
  component says so, and the gap is a ratchet with a direction rather than a
  permanent exemption.
- **R5** A future plugin cannot repeat this. Adding `packages/eslint-plugin-<new>/`
  without a component fails a check.

## Design

Three steps, in this order, because each makes the next safe.

**1. Measure before admitting.** Run coverage across the eleven and record the actual
project percentage per package. This is the input to every decision below and nobody
has it yet.

**2. Admit at the measured floor, ratchet upward.** Each of the eleven gets a
component whose target is its measured coverage rounded *down* to the nearest whole
percent — so it is green on day one (R3) and any regression is immediately red. The
ratchet is the existing `chore/coverage-100` work raising each floor over time; this
spec does not do that work, it only makes it visible.

The alternative — hold all eleven out until they reach 100% — was rejected: it leaves
eleven badges reading `unknown` for however long that takes, which is the visible
half of the problem and the half a user sees.

**3. Lock the class.** Extend
`scripts/__tests__/plugin-name-metadata-drift.lock.test.ts`, which already asserts
that every codecov path resolves to a real package, with the converse: every plugin
directory has a component (R5). That test already loads both sides.

Badges (R2) need no change once R1 holds — they resolve as soon as the component
exists and one coverage upload lands.

## Verification

- `npx vitest run scripts/__tests__/plugin-name-metadata-drift.lock.test.ts` — must
  fail on the current tree (11 plugins with no component) and pass after.
- `npm run map:names` — the "No codecov component" line disappears from
  `.agent/link-and-name-map.md`.
- Curl each of the eleven badge URLs and confirm none returns `unknown` after the
  first coverage upload post-merge.

## Risks and rejected alternatives

- **Rejected: one blanket 100% target for all eleven.** Turns Codecov red for every
  package below it, which is a worse signal than silence — a permanently red check is
  ignored within a week.
- **Rejected: drop the badges instead.** Solves the `unknown` badge and abandons the
  measurement, which is the wrong half to keep.
- **Risk: eleven per-package targets read as eleven different standards.** Mitigated
  by R4 — a floor with a direction is a ratchet, not an exemption, and the component
  list makes each floor public.
- **Risk: a measured floor rounds down to something embarrassing.** That is
  information, not a reason to postpone.

## Out of scope

Raising any package's coverage. That is `chore/coverage-100`. This spec makes the
number visible and regression-proof; it does not improve it.
