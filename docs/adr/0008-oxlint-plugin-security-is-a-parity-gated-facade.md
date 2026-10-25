# ADR 0008: `oxlint-plugin-security` is a façade that ships only when its parity gate holds

- **Status:** proposed. Ofri accepts or rejects it at Design→Build.
- **Date:** 2026-10-25
- **Deciders:** @ofri-peretz
- **Intent:** [`docs/intents/oxlint-plugin-security-drop-in/`](../intents/oxlint-plugin-security-drop-in/intent.md)

## Context

Vite+ 1.0 bundles oxlint and pitches it as the way to drop ESLint and its plugins. A
separate intent, `oxlint-native-plugin-names`, publishes one `oxlint-plugin-<name>` alias
for each of our plugins. That work is not touched here.

`eslint-plugin-security` (eslint-community, Apache-2.0, 4.2.0 published 2026-10-01) is
the incumbent this family keeps measuring itself against. `oxlint-plugin-security` was
free on npm on 2026-10-25.

These facts were measured on 2026-10-25 with oxlint 1.74.0, ESLint 10.13.0 and Node
24.22. The scratch harness is described in the design. Build commits it as the gate
runner.

1. **oxlint names a plugin's rules after `meta.name`, not after the package.** The
   order is: config alias, then `normalizePluginName(meta.name)`, then the package
   name. A plugin with `meta.name: 'oxlint-plugin-security'` surfaced its rules as
   `security(...)`.
2. **oxlint fails to parse a config that names an unknown rule.** The error was
   `Rule '__nope__' not found in plugin 'security'`. So a drop-in has to export every
   rule ID the incumbent exports, including the ones we chose not to implement.
   Otherwise the user's config stops loading.
3. **The incumbent already runs under oxlint.** `"jsPlugins": ["eslint-plugin-security"]`
   reported `security(detect-non-literal-fs-filename)`,
   `security(detect-possible-timing-attacks)` and `security(detect-invisible-characters)`.
   An oxlint user doesn't need us in order to have these rules. A façade has to be
   _better_, not merely available (PRINCIPLES rule 13).
4. **If two plugins both claim `security`, oxlint picks one without saying so.** We
   loaded `eslint-plugin-security` and then a plugin whose `meta.name` normalizes to
   `security`. oxlint raised no error, and only the second plugin's message appeared.
   ESLint refuses the same setup: `Cannot redefine plugin "security"`.
5. **The alias escape hatch works.** With
   `{ "name": "security-legacy", "specifier": "eslint-plugin-security" }` both plugins
   ran side by side.
6. **The incumbent's 15 rules are spread across two of our plugins under eight
   different names.** Five share a name with ours: `detect-object-injection` and
   `detect-non-literal-regexp` (secure-coding), and `detect-child-process`,
   `detect-eval-with-expression` and `detect-non-literal-fs-filename` (node-security).
   The full table is in the design.
7. **oxlint honours `meta.defaultOptions`.** A probe rule declaring
   `defaultOptions: [{ flag: true }]`, configured with no options, saw
   `context.options = [{"flag":true}]`.

## Decision

1. Add a new package, `packages/oxlint-plugin-security`. Its `meta.name` is
   `oxlint-plugin-security`, so oxlint gives it the rule prefix `security`. It exports
   exactly the incumbent's rule IDs and the incumbent's `recommended` and
   `recommended-legacy` configs. A user swaps the package and changes nothing else.
2. **It has no rule logic of its own.** Each rule ID is one of two things:
   - **Wrapped:** an existing Interlace rule object, re-exported under the incumbent's
     ID. Where the incumbent's behaviour depends on it, the rule also gets pinned
     `meta.defaultOptions`.
   - **Retired:** a stub that reports nothing and is marked `meta.deprecated`. This is
     only allowed where the defect can't occur on any supported runtime, and the reason
     must be stated in `wont-fix.json`.

   Every rule ID's source is one committed data file, `mapping.json`. A lock checks it
   against the pinned incumbent.

3. **It ships only when the parity gate holds.** The gate needs three things:
   - every incumbent ID resolves under both oxlint and ESLint;
   - no live miss on the incumbent's own test corpus, at the pinned incumbent version
     and scored per rule;
   - no finding on the incumbent's valid cases that isn't declared as a divergence.

   The package lands `"private": true`. A lock fails if `private` is flipped while the
   gate is red. The name is not reserved and no placeholder is published.

## Why not a plain alias of `eslint-plugin-secure-coding`

- **The prefix would be wrong.** oxlint takes the prefix from `meta.name`, so
  re-exporting secure-coding surfaces as `secure-coding/...` (fact 1). Every rule in the
  user's config would be "not found" (fact 2).
- **No single plugin holds the incumbent's rule set.** secure-coding covers 4 of the 15
  rules. The rest are in node-security, and some don't exist yet (fact 6). An alias of
  any one plugin can't produce the incumbent's IDs.
- **Renaming the namespace of our main plugin would break portability.**
  INTEROP_PHILOSOPHY (moved to `ofri-peretz/interlace` in #493) makes
  `// eslint-disable-next-line <plugin>/<rule>` the canonical form and says every
  runtime must recognize it. ESLint users write `secure-coding/<rule>`. If secure-coding's
  `meta.name` became `security`, oxlint would report `security/<rule>`. Every disable
  comment and every config would then be correct in one engine and wrong in the other.
  The sibling intent's alias lock (its R5) exists to catch exactly that `meta.name` edit.
- **A façade under its own name avoids all three problems,** and the only thing it
  costs is a mapping file.

## The namespace clash is intended

The façade replaces the incumbent, so loading both is a mistake. Each engine surfaces
that mistake differently:

- **ESLint** refuses with `Cannot redefine plugin "security"` (fact 4). It is loud and
  safe.
- **oxlint** silently keeps one plugin (fact 4). This is the dangerous case. The README
  states it in its first screen. A lock pins the observed behaviour, so a change in
  oxlint shows up as a failing test rather than a support thread.
- **Escape hatch for running both** (for example, while auditing the swap): alias one of
  them in `jsPlugins` (fact 5). The README gives the exact snippet.

## The reputational risk, and how it is bounded

Taking the oxlint form of an eslint-community package name can read as an official port,
or as squatting. Fact 3 makes that worse: the incumbent already works under oxlint, so the
façade can't claim it fills a gap in availability. The risk is bounded like this:

- **Nothing is published before the gate holds.** No placeholder and no name reservation.
  If someone else takes the name first, we lose the name and keep our reputation. That
  is the better trade.
- **The first line of the README and the npm `description` say "independent; not
  affiliated with eslint-community or oxc".** The vendored test corpus keeps its
  Apache-2.0 attribution.
- **The README leads with measured differences, each with its caveat.** Examples: CWE
  metadata on every finding, and the declared divergences. It never says just "faster"
  or "better". Both plugins run as JS plugins under oxlint, so there is no speed claim to
  make.
- **Telling eslint-community maintainers before the first publish is Ofri's call.** It
  is outward-facing, and it is listed as an open question in the intent.

## The ESLint-side twin

**In scope, at no extra cost: the same package works as a one-import swap under ESLint
flat config.** ESLint takes the namespace from the `plugins` key, not from `meta.name`,
so `plugins: { security: require('oxlint-plugin-security') }` gives the same IDs. The
incumbent's `configs.recommended` is mirrored, so `security.configs.recommended` works
too. The gate runs under both engines, as INTEROP_PHILOSOPHY's compatibility contract
requires.

**Out of scope: a separately named ESLint package.** `eslint-plugin-security` belongs to
the incumbent. A scoped `@interlace/eslint-plugin-security` would add a package with no
capability the façade lacks. PRINCIPLES rule 8 also says a prefix says accessory.
Reconsider if ESLint users avoid installing a package named `oxlint-…`, measured by
issues or by downloads that never convert.

## Consequences

- A new published name lives under the incumbent's shadow. Its quality bar is the
  incumbent's own test suite, which is stricter than the bar any of our plugins answers
  to today.
- Each rule mapped from node-security or secure-coding gains a second set of users who
  never chose that plugin. That raises the cost of a false positive in those rules.
  Mapped dependencies are therefore pinned to exact versions, so every release re-runs
  the gate.
- Work the gate forces on existing packages: one new rule
  (`secure-coding/no-invisible-characters`), one new option
  (`no-timing-unsafe-compare`), one fix for a false positive (bare `eval()`), and a home
  for the mustache rule. The design records the decisions.
- `wont-fix.json` gets corrected: `detect-buffer-noassert` is now detected 29/29, and
  two of its stated reasons are factually wrong (see the design).

## Rejected

- **Alias secure-coding, or rename its `meta.name`.** Rejected above.
- **Write the façade's rules as new code.** That duplicates logic and splits the fix
  path for every false positive. PRINCIPLES rule 2 and this ADR's decision 2 both forbid
  it.
- **Reserve the name now with a placeholder.** That is the squatting reading of the risk
  above.
- **Retire every rule we don't implement.** A no-op under a live-defect ID silently
  removes detection the user had. Retiring is limited to defects that can't occur.
- **Gate on the existing "any rule fired" parity number.** It is an upper bound across
  three plugins with every rule on. It doesn't measure what a user gets from
  `security/<id>`, and it ignores findings on valid cases. The gate is scored per rule.
