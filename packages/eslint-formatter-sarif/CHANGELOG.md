# @interlace/eslint-formatter-sarif

All notable changes to `@interlace/eslint-formatter-sarif` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 0.2.0

### Minor Changes

- **✨ Feature** — publish the SARIF formatter to npm

  `npm install --save-dev @interlace/eslint-formatter-sarif` has returned 404 since #105 marked the package private: its `main` pointed at a `dist/` that no build produced. It now builds through the shared `dist/` contract and ships as its first public release, so `eslint -f @interlace/eslint-formatter-sarif` works outside this repo.
