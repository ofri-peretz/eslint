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

