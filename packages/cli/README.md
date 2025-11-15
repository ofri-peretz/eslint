# @forge-js/cli

Comprehensive CLI tool for managing releases in the forge-js monorepo.

---

## 🚀 Quick Start

Get started with the CLI in 30 seconds:

```bash
# 1. Install (in monorepo)
pnpm install

# 2. Build
pnpm nx build cli

# 3. Use the CLI
node dist/packages/cli/bin/forge.js --help
```

For global access, link the package:
```bash
cd dist/packages/cli
npm link
forge --help
```

---

## Installation

```bash
# Install in the monorepo
pnpm install

# Build the CLI
pnpm nx build cli

# Link globally (optional)
npm link
```

## Commands

### Release Management

```bash
# Create a changeset
forge release changeset
# or
forge release cs

# Create empty changeset
forge release changeset --empty

# Version packages
forge release version

# Check changeset status
forge release status
forge release status --verbose
forge release status --since main
```

### Publishing

```bash
# Publish all packages with automatic tag detection
forge publish

# Dry run (no actual publishing)
forge publish --dry-run

# Verbose output
forge publish --verbose
```

### Pre-release Management

```bash
# Enter pre-release mode
forge prerelease enter alpha
forge prerelease enter beta
forge prerelease enter rc
forge prerelease enter next
forge prerelease enter canary

# Enter pre-release with snapshot
forge prerelease enter alpha --snapshot

# Exit pre-release mode
forge prerelease exit
```

## Features

✅ **Smart Tag Detection** - Automatically detects npm distribution tags based on version  
✅ **Pre-release Support** - Full support for alpha, beta, rc, next, canary versions  
✅ **Dry Run Mode** - Test publishing without actually publishing  
✅ **Beautiful Output** - Colored, spinner-based progress indicators  
✅ **Error Handling** - Comprehensive error messages and validation  

## Distribution Tags

The CLI automatically determines the correct npm distribution tag:

| Version Format | Tag | Example |
|----------------|-----|---------|
| `X.Y.Z` | `latest` | `1.0.0` |
| `X.Y.Z-alpha.N` | `alpha` | `1.0.0-alpha.0` |
| `X.Y.Z-beta.N` | `beta` | `1.0.0-beta.1` |
| `X.Y.Z-rc.N` | `rc` | `1.0.0-rc.0` |
| `X.Y.Z-next.N` | `next` | `1.0.0-next.2` |
| `X.Y.Z-canary.SHA` | `canary` | `1.0.0-canary.abc123` |

## Workflow Examples

### Standard Release

```bash
# 1. Make changes
# 2. Create changeset
forge release changeset

# 3. Version packages
forge release version

# 4. Commit and push
git add .
git commit -m "chore: version packages"
git push

# 5. Publish
forge publish
```

### Pre-release Workflow

```bash
# 1. Enter pre-release mode
forge prerelease enter alpha

# 2. Create changeset
forge release changeset

# 3. Version with pre-release tag
forge release version

# 4. Publish with alpha tag
forge publish

# 5. Exit pre-release mode
forge prerelease exit
```

## Integration with CI/CD

The CLI is designed to work seamlessly with GitHub Actions:

```yaml
- name: Publish packages
  run: npx @forge-js/cli publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Development

```bash
# Build the CLI
pnpm nx build cli

# Run locally
node dist/packages/cli/bin/forge.js --help

# Link for development
cd dist/packages/cli
npm link
forge --help
```

## Architecture

```
packages/cli/
├── bin/
│   └── forge.js          # Entry point
├── src/
│   ├── index.ts          # Main CLI setup
│   └── commands/
│       ├── release.ts    # Release commands
│       ├── publish.ts    # Publishing logic
│       └── prerelease.ts # Pre-release management
├── package.json
└── tsconfig.json
```

## Dependencies

- **commander** - CLI framework
- **chalk** - Terminal styling
- **ora** - Elegant terminal spinners

## License

ISC

