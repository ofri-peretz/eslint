## [1.1.4] - 2026-05-03

## 1.2.1

### Patch Changes

- [#229](https://github.com/ofri-peretz/eslint/pull/229) [`acc81a7`](https://github.com/ofri-peretz/eslint/commit/acc81a74d0c329027bf6011f5db4b1bf9beba650) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-unknown-property` no longer fires on custom React components. The rule now
  only checks host (lowercase DOM) elements, matching upstream
  `react/no-unknown-property` — uppercase and member-expression JSX names
  (`<Box surface="card">`, `<Motion.div />`) accept arbitrary props.

## 1.2.0

### Minor Changes

- [#100](https://github.com/ofri-peretz/eslint/pull/100) [`fcb6d8e`](https://github.com/ofri-peretz/eslint/commit/fcb6d8ed6c6f531fe11427508673a31fe754a2e6) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Expose the `component-api/*` rule namespace to consumers.

  Eight rules — `no-default-test-id`, `require-data-slot`, `no-is-prefix-prop`,
  `no-inline-style`, `no-raw-color-literal`, `no-arbitrary-token-class`,
  `no-kind-prop-discriminator`, `no-wrapper-sub-component` — already exist in
  `src/rules/component-api/`, but they were not previously included in the
  published `rules` map and so could not be registered by consumers.
  This release adds them so downstream apps (e.g. `apps/blog`, `apps/docs`,
  `interlace-landing`) can register the `componentApi` preset via:

  ```js
  import reactFeatures from "eslint-plugin-react-features";

  {
    plugins: { "react-features": reactFeatures },
    rules: {
      "react-features/component-api/no-default-test-id": "error",
      "react-features/component-api/require-data-slot": "warn",
      "react-features/component-api/no-is-prefix-prop": "warn",
      "react-features/component-api/no-inline-style": "warn",
      "react-features/component-api/no-raw-color-literal": "warn",
      "react-features/component-api/no-arbitrary-token-class": "warn",
      "react-features/component-api/no-kind-prop-discriminator": "warn",
      "react-features/component-api/no-wrapper-sub-component": "warn",
    },
  }
  ```

  Each rule corresponds to a rule ID (R5/R6/R8/R11/R12/R18/R19) in the
  `interlace-component` skill at `agents/skills/interlace-component/SKILL.md`.
  The rules are not part of the `recommended` config — they ship as an opt-in
  `componentApi` preset that strict design systems can enable on top of the
  base react ruleset.

  Unblocks STR-1 in `agents/apps/blog/INTERLACE_AUDIT.md`.

### Patch Changes

- [#141](https://github.com/ofri-peretz/eslint/pull/141) [`38ab670`](https://github.com/ofri-peretz/eslint/commit/38ab670a0221684f4fd3d5dc3c05ddec7458ca2b) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: remove false `meta.fixable: 'code'` declarations from 21 rules that had no `fix()` function

  Rules that declared `fixable: 'code'` in their ESLint meta without an actual `fix()` implementation would show the ⚡ auto-fix icon in editors and CI formatters but apply no change when `--fix` was run. This patch removes the misleading declaration from:
  - `browser-security/no-clickjacking`
  - `import-next/first`, `named`, `no-barrel-import`, `no-import-module-exports`, `no-namespace`
  - `node-security/no-buffer-overread`, `no-unsafe-dynamic-require`, `no-zip-slip`
  - `react-features/react-no-inline-functions`
  - `reliability/no-jsdoc-terminator-in-example` (uses `suggest`, not auto-fix; corrected to `hasSuggestions: true` only)
  - `secure-coding/no-directive-injection`, `no-electron-security-issues`, `no-graphql-injection`, `no-improper-sanitization`, `no-improper-type-validation`, `no-ldap-injection`, `no-unchecked-loop-condition`, `no-unlimited-resource-allocation`, `no-weak-password-recovery`, `no-xpath-injection`

- [#186](https://github.com/ofri-peretz/eslint/pull/186) [`edf208d`](https://github.com/ofri-peretz/eslint/commit/edf208d67ac2357312c97d8964fcf6a462e407eb) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Consolidation cleanup — no rule behavior change:
  - **react-features**: the README rules table now lists the 8 `componentApi`
    preset rules. The README generator (`sync-readme-rules.ts`) and the
    `plugin-rule-source-drift` validator now recurse into nested
    `docs/rules/<category>/` subfolders, so every documented rule is advertised
    consistently (previously the nested componentApi docs were silently dropped,
    which an earlier `readme` exception had papered over — that exception is now
    removed in favour of the real fix).
  - **node-security**: remove the orphaned `no-pii-in-logs` rule source — the rule
    was migrated to `eslint-plugin-secure-coding` and is no longer exported here;
    the dead source was still compiling into `dist`.
  - **import-next**: restore the `no-cycle` unit test after [#180](https://github.com/ofri-peretz/eslint/issues/180)'s SCC refactor
    (`computeSCCsFromFile` + `findShortestCyclePath` are now bridged in the mock).

  Also fixes `scripts/ilb-plugin-scope-audit.ts` to stop mis-reading config-preset
  keys (`'recommended-strict': {`) as rules.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Bug Fixes

- `jsx-no-target-blank`: replaced `/^\/\//.test(href)` with `href.startsWith('//')` (oxlint correctness rule).

## [1.1.3] - 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [1.1.2] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [1.1.1] - 2026-02-02

This was a version bump only for eslint-plugin-react-features to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-react-features` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## [1.1.0] - 2026-02-02

### Features

- **infra:** migrate from pnpm to npm for Vercel compatibility ([46172cd7](https://github.com/ofri-peretz/eslint/commit/46172cd7))
- **docs:** implement 3-pillar navigation with sidebar tabs ([03c3f688](https://github.com/ofri-peretz/eslint/commit/03c3f688))
- **docs:** deploy new Interlace VI and mobile UX ([c05b5106](https://github.com/ofri-peretz/eslint/commit/c05b5106))
- add high-fidelity OG images, banners, and update docs layout ([bf60afed](https://github.com/ofri-peretz/eslint/commit/bf60afed))

### Bug Fixes

- **release:** fix release workflow logic, docs cache, and promote lint warnings to errors ([5945113a](https://github.com/ofri-peretz/eslint/commit/5945113a))
- **docs:** resolve MDX compatibility issues and add validation tests ([dac50031](https://github.com/ofri-peretz/eslint/commit/dac50031))
- **docs:** revert inappropriate security additions to non-security plugins ([b8b7bac0](https://github.com/ofri-peretz/eslint/commit/b8b7bac0))
- **docs:** strict readout alignment to NestJS structure and table consolidation --no-verify ([6e12c39f](https://github.com/ofri-peretz/eslint/commit/6e12c39f))
- **docs:** wrap lucide icons with span for title attribute compatibility ([bd36290d](https://github.com/ofri-peretz/eslint/commit/bd36290d))

### Documentation

- update rule documentation and docs app UI improvements ([53c83f8c](https://github.com/ofri-peretz/eslint/commit/53c83f8c))
- add Known False Negatives to all rules (173 rules updated) ([1e988afd](https://github.com/ofri-peretz/eslint/commit/1e988afd))
- fleet-wide documentation compliance - 160 rules improved ([1d68f96a](https://github.com/ofri-peretz/eslint/commit/1d68f96a))
- update plugin documentation with standardized badges and new OG images ([627773c9](https://github.com/ofri-peretz/eslint/commit/627773c9))
- finalize readme structure, drop security research coverage ([30b96dbd](https://github.com/ofri-peretz/eslint/commit/30b96dbd))
- remove header and legend artifacts from rules table ([8e46b93e](https://github.com/ofri-peretz/eslint/commit/8e46b93e))
- finalize readme layout with centered badges and strict structure ([f9413c91](https://github.com/ofri-peretz/eslint/commit/f9413c91))
- align main README with Interlace branding ([15e520cd](https://github.com/ofri-peretz/eslint/commit/15e520cd))

### ❤️ Thank You

- Ofri Peretz

## [1.0.0] - 2026-01-26

### Added

- Initial stable release with 53 React rules
- 1,190+ test cases covering edge cases and TypeScript integration
- LLM-optimized error messages for AI-assisted development
- ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rule Categories

#### Migration Rules (React 17→18)

- `jsx-no-target-blank` - Require rel="noopener" on target="\_blank" links
- `jsx-no-script-url` - Disallow javascript: URLs in JSX
- `jsx-no-duplicate-props` - Disallow duplicate props
- `no-danger-with-children` - Disallow children with dangerouslySetInnerHTML
- `no-deprecated` - Disallow deprecated React APIs
- `no-find-dom-node` - Disallow findDOMNode
- `no-unsafe` - Disallow UNSAFE\_ lifecycle methods
- `void-dom-elements-no-children` - Disallow children in void DOM elements

#### Performance Rules

- `no-inline-handlers` - Disallow inline function handlers (re-render prevention)
- `no-object-style-literals` - Disallow object literals in style prop
- `require-memo` - Require React.memo for pure components
- `require-usecallback` - Require useCallback for function props
- `require-usememo` - Require useMemo for expensive computations

#### Core React Rules

- Hooks rules: exhaustive-deps, rules-of-hooks compliance
- Component patterns: naming, structure, composition
- State management: useState, useReducer patterns

### Presets

- `recommended` - Balanced React best practices
- `strict` - All rules as errors
- `performance` - Performance-focused subset
- `migration` - React upgrade assistance

### ⚠️ Breaking from 0.x

- Removed deprecated rules (now in `react-a11y`)
- Renamed: `react-perf/no-jsx-bind` → `performance/no-inline-handlers`

### Known Limitations

Documented in `docs/KNOWN-LIMITATIONS.md`:

- `jsx-no-target-blank`: Dynamic `href` variables not detected
- `jsx-no-script-url`: Obfuscated patterns in variables not detected
- Spread props (`{...props}`) prevent static attribute analysis
