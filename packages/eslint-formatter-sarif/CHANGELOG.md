# @interlace/eslint-formatter-sarif

All notable changes to `@interlace/eslint-formatter-sarif` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 1.0.0

### Major Changes

- **💥 Breaking** — requires Node 22.13 or later; Node 18 and 20 are end-of-life

  `engines.node` is now `>=22.13.0` (was `>=18.0.0`). Node 22.13, 24 and 26 are the versions tested. Stay on the previous major if you cannot leave Node 18 or 20 yet.

  ## Migration

  Run your linter on Node 22.13 or later, or pin the previous major until you can:

  ```sh
  # Before: any Node 18+
  node --version   # v20.x
  # After: Node 22.13+ (24 and 26 are also tested)
  nvm install 22 && nvm use 22   # or 24, or 26
  ```

  Nothing in your ESLint or oxlint config changes.

## 0.2.0

### Minor Changes

- **✨ Feature** — publish the SARIF formatter to npm

  `npm install --save-dev @interlace/eslint-formatter-sarif` has returned 404 since #105 marked the package private: its `main` pointed at a `dist/` that no build produced. It now builds through the shared `dist/` contract and ships as its first public release, so `eslint -f @interlace/eslint-formatter-sarif` works outside this repo.
