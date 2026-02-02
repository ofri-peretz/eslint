## 1.1.1 (2026-02-02)

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
