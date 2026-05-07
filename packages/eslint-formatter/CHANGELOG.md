# Changelog

All notable changes to `@interlace/eslint-formatter` will be documented here.

## [0.1.0] — 2026-05-03

### Added

- Initial release
- Three output modes: `human`, `compact`, `json`
- Auto-mode detection (TTY → human, CI/pipe → compact)
- `ESLINT_FORMAT_MODE` environment variable override
- Rule grouping with deduplication and representative locations
- Summary statistics (errors, warnings, files, fixable count)
- Support for ESLint 8 and 9
