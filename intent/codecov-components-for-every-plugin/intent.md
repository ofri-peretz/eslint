# Intent: eleven plugins report no coverage at all

Author: O. Peretz (with Claude). Status: review.

## Problem

`codecov.yml` defines 19 components for 30 plugins. The eleven without one —
`anthropic`, `drizzle`, `gemini`, `knex`, `mcp-sdk`, `mysql`, `openai`, `prisma`,
`sequelize`, `sqlite`, `typeorm` — are not merely unmeasured: each ships a README
whose Codecov badge points at `component=<pkg>`, and those URLs resolve to
**`unknown`** on the live badge endpoint.

So the storefront for eleven published packages advertises a coverage badge that says
nothing, and no gate notices, because a component that does not exist cannot fail.

## Proposed outcome

Every published plugin has a codecov component, and every README badge resolves to a
real percentage.

## Affected users and systems

`codecov.yml`, the eleven plugin READMEs (baked into the npm tarball at publish time),
and the `chore/coverage-100` initiative, which owns the underlying coverage work.

## Constraints

- Existing components carry **100% project and patch targets**. Adding a component for
  a package below 100% turns Codecov red rather than measuring anything, so this
  cannot be a blind config edit.
- The eleven are the newest plugins; several are still growing rule sets.
- README badges are baked at publish time. A badge fixed only in the repo stays broken
  on npm until the next release of that package.

## Open questions

- Raise all eleven to 100% first, or admit them at a lower target and ratchet?
- If the target has to differ per package, does that undermine the single 100% claim
  the other 19 make?
- Should a README carry a Codecov badge at all before its component exists — an
  `unknown` badge is arguably worse than none.
