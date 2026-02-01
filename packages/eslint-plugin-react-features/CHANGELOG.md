# Changelog

All notable changes to `eslint-plugin-react-features` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

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
