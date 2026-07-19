## 2.1.7

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 2.1.6

### Patch Changes

- [#180](https://github.com/ofri-peretz/eslint/pull/180) [`5650ecd`](https://github.com/ofri-peretz/eslint/commit/5650ecde72b6157f94a2accef18f48c33e9b5605) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: role-aware false-positive reduction in three Base UI / headless UI rules

  click-events-have-key-events, interactive-supports-focus, and
  no-static-element-interactions now recognize interactive ARIA roles
  (button, link, menuitem, combobox, etc.) and skip reporting when an
  element explicitly declares one. This eliminates false positives on
  Base UI and other headless-component patterns where `<div role="button">`
  is the correct composition technique.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

## 2.1.5 (2026-02-09)

This was a version bump only for eslint-plugin-react-a11y to align it with other projects, there were no code changes.

## [2.1.3] - 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [2.1.2] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [2.1.1] - 2026-02-02

This was a version bump only for eslint-plugin-react-a11y to align it with other projects, there were no code changes.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-05

### Added

- Initial release with 37 accessibility rules
- WCAG 2.1 Level A, AA, and AAA coverage
- LLM-optimized error messages with structured 2-line format
- Auto-fix capabilities for applicable rules
- ESLint 8 and ESLint 9 flat config support
- TypeScript type definitions for all rule options
- Four preset configurations:
  - `recommended` - Balanced accessibility enforcement
  - `strict` - All rules as errors
  - `wcag-a` - WCAG 2.1 Level A compliance
  - `wcag-aa` - WCAG 2.1 Level AA compliance

### Rule Categories

- **Anchor Rules (3)**: `anchor-ambiguous-text`, `anchor-has-content`, `anchor-is-valid`
- **ARIA Rules (4)**: `aria-activedescendant-has-tabindex`, `aria-props`, `aria-role`, `aria-unsupported-elements`
- **Form & Input Rules (3)**: `autocomplete-valid`, `control-has-associated-label`, `label-has-associated-control`
- **Event Rules (2)**: `click-events-have-key-events`, `mouse-events-have-key-events`
- **Content Rules (5)**: `heading-has-content`, `html-has-lang`, `iframe-has-title`, `lang`, `media-has-caption`
- **Image Rules (2)**: `img-redundant-alt`, `img-requires-alt`
- **Interactive Element Rules (6)**: `interactive-supports-focus`, `no-interactive-element-to-noninteractive-role`, `no-noninteractive-element-interactions`, `no-noninteractive-element-to-interactive-role`, `no-noninteractive-tabindex`, `no-static-element-interactions`
- **Focus & Navigation Rules (5)**: `no-access-key`, `no-aria-hidden-on-focusable`, `no-autofocus`, `no-keyboard-inaccessible-elements`, `tabindex-no-positive`
- **Visual & Distraction Rules (3)**: `no-distracting-elements`, `no-missing-aria-labels`, `no-redundant-roles`
- **Role Rules (3)**: `role-has-required-aria-props`, `role-supports-aria-props`, `prefer-tag-over-role`
- **Scope Rule (1)**: `scope`
