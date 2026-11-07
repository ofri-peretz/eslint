# oxlint-plugin-security

All notable changes to `oxlint-plugin-security` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 0.2.11

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@6.0.3`

## 0.2.10

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@6.0.2`, `eslint-plugin-secure-coding@6.0.2`

## 0.2.9

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@6.0.1`, `eslint-plugin-secure-coding@6.0.1`

## 0.2.8

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@6.0.0`, `eslint-plugin-secure-coding@6.0.0`

## 0.2.7

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@5.6.5`

## 0.2.6

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@5.6.4`

## 0.2.5

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@5.8.4`, `eslint-plugin-secure-coding@5.6.3`

## 0.2.4

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-secure-coding@5.6.2`

## 0.2.3

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@5.8.3`, `eslint-plugin-secure-coding@5.6.1`

## 0.2.2

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@5.8.2`, `eslint-plugin-secure-coding@5.6.0`

## 0.2.1

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@5.8.1`, `eslint-plugin-secure-coding@5.5.1`

## 0.2.0

### Minor Changes

- **✨ Feature** — oxlint-plugin-security, a drop-in for eslint-plugin-security on oxlint and Vite+ (private until its gate is green)

  Answers to eslint-plugin-security@4.2.0's fifteen `security/<rule>` IDs, each
  backed by an Interlace rule named in `mapping.json`, with two IDs retired as
  deprecated no-ops where the defect cannot occur on a supported runtime. It
  stays `private` until `benchmarks/suites/ilb-competitor-parity/drop-in.mjs`,
  the ship gate, is green on both engines; a lock refuses a public flip while the
  gate is red. See docs/intents/oxlint-plugin-security-drop-in and ADR-0008.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `eslint-plugin-node-security@5.8.0`, `eslint-plugin-secure-coding@5.5.0`
