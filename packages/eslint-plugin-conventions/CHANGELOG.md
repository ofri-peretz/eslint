## 4.2.1

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 4.2.0

### Minor Changes

- [#241](https://github.com/ofri-peretz/eslint/pull/241) [`69fe7ac`](https://github.com/ofri-peretz/eslint/commit/69fe7ac35589a8be64328fd5aa4fdedb60203a28) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `conventions/utm-taxonomy`: align the taxonomy with the live attribution
  system — add `devto` to `utm_source` and `article` to `utm_medium`, and drop
  the never-shipped `dev_to` spelling.

  The blog's `/go/` redirect handler routes by
  `article_platforms.platform === utm_source`, and those platform rows are
  stored as `'devto'` — the un-underscored form is load-bearing and cannot
  change. Every hand-written article link and the Dev.to publisher transform
  already emit `utm_source=devto&utm_medium=article`; the taxonomy's `dev_to`
  was the outlier. No real link ever carried `dev_to`, so removing it turns
  the rule into a typo guard instead of a cohort-splitter. Runtime consumers
  (visitor-profile inference) still accept `dev_to` on inbound URLs for
  historical links.

## 4.1.0

### Minor Changes

- [#129](https://github.com/ofri-peretz/eslint/pull/129) [`90b970c`](https://github.com/ofri-peretz/eslint/commit/90b970c547f867ee79ec393ecb4da3f3e22f11f0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Three new rules at `error` severity enforcing the Observability cluster of the design philosophies (ANALYTICS_PHILOSOPHY.md + UTM_PHILOSOPHY.md):
  - **`utm-taxonomy`** — `utm_source` and `utm_medium` query-param values in any URL string literal must match the fixed taxonomy. Free-text values (`Blog`, `blog_v2`, `BLOG`) destroy joinability in PostHog and are forbidden.
  - **`no-raw-cross-property-href`** — Hand-written `<a href="https://*.interlace.tools/…">` and `<a href="https://ofriperetz.dev/…">` JSX literals are flagged. The blessed escape hatch is the per-property `buildUtmHref()` helper from `lib/utm.ts`.
  - **`analytics-event-naming`** — Vendor-neutral. Matches `<obj>.capture()` (PostHog), `<obj>.track()` (Segment / Mixpanel / Amplitude), and bare `track()` (our primitive). Event names must follow `category:object_action` (lowercase snake_case) with action from a fixed verb list; `$`-prefixed reserved events are exempt; template-literal event names are forbidden.

  Also fixes `compareVersions` in `expiring-todo-comments` to normalise wildcards (`24.x` in `engines.node`) — without this, `parseSemver` returned `null` and the comparator falsely matched every `>= engine TODO` as expired.

- [#148](https://github.com/ofri-peretz/eslint/pull/148) [`82718c2`](https://github.com/ofri-peretz/eslint/commit/82718c282895710d42c36d4679fb24d47f1c35c7) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - feat(no-magic-numbers): add conventions/no-magic-numbers — closes prob_magic_numbers ILB-Arena-Quality FN

  Flags numeric literals that lack a named constant, catching the magic number
  code smell that makes intent unclear.

  **Built-in allowlist:** `-1, 0, 1, 2` are always allowed as universally idiomatic.

  **Context-aware skips (by default):**
  - `const` / `export const` declarations — the literal IS the named constant
  - Array index access: `items[3]` (`ignoreArrayIndexes: true`)
  - Default parameter values: `function f(n = 1000) {}`
  - TypeScript enum initializers: `enum Status { Active = 1 }`
  - Numeric object property keys: `{ 404: 'Not Found' }`

  **Options:** `ignore`, `ignoreArrayIndexes`, `ignoreDefaultValues`, `ignoreEnums`, `ignoreBitwiseExpressions`.

  Added at `warn` severity in `conventions/recommended`.

### Patch Changes

- [#154](https://github.com/ofri-peretz/eslint/pull/154) [`62e67a1`](https://github.com/ofri-peretz/eslint/commit/62e67a154a858b284899e17cfe39606e6bc08427) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-magic-numbers`: add extract-const suggestion fixer. IDEs now offer a one-click "Extract to named constant" action that inserts a `const MAGIC_<value>` declaration before the containing statement and replaces the literal.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

## 4.0.7 (2026-02-09)

This was a version bump only for eslint-plugin-conventions to align it with other projects, there were no code changes.

## [4.0.5] - 2026-02-08

This was a version bump only for eslint-plugin-conventions to align it with other projects, there were no code changes.

## [4.0.4] - 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [4.0.3] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [4.0.2] - 2026-02-02

This was a version bump only for eslint-plugin-conventions to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-conventions` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## [4.0.1] - 2026-02-02

This was a version bump only for eslint-plugin-conventions to align it with other projects, there were no code changes.

## [4.0.0] - 2026-02-02

This was a version bump only for eslint-plugin-conventions to align it with other projects, there were no code changes.

## [3.0.0] - 2026-02-02

This was a version bump only for eslint-plugin-conventions to align it with other projects, there were no code changes.

## [1.0.0] - 2026-01-26

### Added

- Initial stable release with 9 convention rules
- LLM-optimized error messages for AI-assisted development
- 100% test coverage across all rules
- ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rules

| Rule                                 | Description                                           | 💼  | ⚠️  |
| :----------------------------------- | :---------------------------------------------------- | :-: | :-: |
| `no-commented-code`                  | Disallow commented-out code blocks                    | 💼  | ⚠️  |
| `expiring-todo-comments`             | Enforce expiration dates on TODO comments             | 💼  | ⚠️  |
| `prefer-code-point`                  | Prefer `codePointAt` over `charCodeAt` for Unicode    |     |     |
| `prefer-dom-node-text-content`       | Prefer `textContent` over `innerText` for performance |     |     |
| `no-console-spaces`                  | Disallow leading/trailing spaces in console calls     |     |     |
| `no-deprecated-api`                  | Disallow usage of deprecated Node.js APIs             | 💼  | ⚠️  |
| `prefer-dependency-version-strategy` | Enforce consistent version strategies                 |     |     |
| `filename-case`                      | Enforce consistent file naming conventions            |     |     |
| `consistent-existence-index-check`   | Enforce consistent array index existence checks       |     |     |

### Presets

- `recommended` - Balanced conventions for most teams

### Known Limitations

Documented in `docs/KNOWN-LIMITATIONS.md`:

- `filename-case`: Framework-required names (e.g., `webpack.config.js`) require manual exclude lists
- `no-deprecated-api`: May not detect usage through wrapper libraries
- `expiring-todo-comments`: Requires consistent date formats (ISO 8601 recommended)
