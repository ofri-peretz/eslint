# @forge-js/cli - AI Agent Guide

## Package Overview

**Name:** @forge-js/cli  
**Version:** 2.4.0  
**Description:** CLI tool for managing releases in the forge-js monorepo. Comprehensive CLI tool for managing releases, publishing, and pre-release workflows in Nx monorepos.

**Keywords:** cli, monorepo, release-management, nx, versioning, semantic-versioning, publishing, changesets, pre-release, alpha, beta, rc, next, canary

**Homepage:** https://github.com/ofri-peretz/forge-js#readme  
**Repository:** https://github.com/ofri-peretz/forge-js.git  
**Directory:** packages/cli

## Installation

```bash
# Install in the monorepo
pnpm install

# Build the CLI
pnpm nx build cli

# Link globally (optional)
cd dist/packages/cli
npm link
```

## Quick Start

```bash
# Use the CLI
node dist/packages/cli/bin/forge.js --help

# Or if linked globally
forge --help
```

## Commands

### Release Management

#### `forge release changeset` or `forge release cs`

Create a changeset for tracking changes.

```bash
forge release changeset
# or
forge release cs

# Create empty changeset
forge release changeset --empty
```

#### `forge release version`

Version packages based on changesets.

```bash
forge release version
```

#### `forge release status`

Check changeset status.

```bash
forge release status
forge release status --verbose
forge release status --since main
```

### Publishing

#### `forge publish`

Publish all packages with automatic tag detection.

```bash
# Publish all packages
forge publish

# Dry run (no actual publishing)
forge publish --dry-run

# Verbose output
forge publish --verbose
```

### Pre-release Management

#### `forge prerelease enter <tag>`

Enter pre-release mode.

```bash
forge prerelease enter alpha
forge prerelease enter beta
forge prerelease enter rc
forge prerelease enter next
forge prerelease enter canary

# Enter pre-release with snapshot
forge prerelease enter alpha --snapshot
```

#### `forge prerelease exit`

Exit pre-release mode.

```bash
forge prerelease exit
```

## Distribution Tags

The CLI automatically determines the correct npm distribution tag:

| Version Format | Tag | Example |
|---------------|-----|---------|
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

## Features

- **Smart Tag Detection:** Automatically detects npm distribution tags based on version
- **Pre-release Support:** Full support for alpha, beta, rc, next, canary versions
- **Dry Run Mode:** Test publishing without actually publishing
- **Beautiful Output:** Colored, spinner-based progress indicators
- **Error Handling:** Comprehensive error messages and validation

## CI/CD Integration

The CLI is designed to work seamlessly with GitHub Actions:

```yaml
- name: Publish packages
  run: npx @forge-js/cli publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## API Reference

### Command Structure

All commands follow the pattern:
```bash
forge <command> <subcommand> [options]
```

### Options

| Option | Description | Example |
|--------|-------------|---------|
| `--dry-run` | Preview without executing | `forge publish --dry-run` |
| `--verbose` | Show detailed output | `forge release status --verbose` |
| `--empty` | Create empty changeset | `forge release changeset --empty` |
| `--since <branch>` | Check status since branch | `forge release status --since main` |
| `--snapshot` | Use snapshot versioning | `forge prerelease enter alpha --snapshot` |

## FAQ

**Q: How do I create a changeset?**  
A: Run `forge release changeset` and follow the prompts.

**Q: How do I version packages?**  
A: Run `forge release version` after creating changesets.

**Q: How do I publish packages?**  
A: Run `forge publish` after versioning. The CLI automatically detects the correct npm tag.

**Q: How do I enter pre-release mode?**  
A: Run `forge prerelease enter <tag>` where tag is alpha, beta, rc, next, or canary.

**Q: How do I exit pre-release mode?**  
A: Run `forge prerelease exit`.

**Q: How do I test publishing without actually publishing?**  
A: Use `--dry-run` flag: `forge publish --dry-run`.

**Q: How do I check changeset status?**  
A: Run `forge release status` or `forge release status --verbose` for detailed output.

**Q: How do I use this in CI/CD?**  
A: Install the package and run commands. Set NODE_AUTH_TOKEN environment variable for npm authentication.

**Q: What npm tags are supported?**  
A: latest, alpha, beta, rc, next, canary. Tags are automatically determined from version numbers.

**Q: How do I link the CLI globally?**  
A: Build the package, then run `npm link` from the dist/packages/cli directory.

## Related Packages

- **@forge-js/eslint-plugin-llm-optimized:** Main ESLint plugin package
- **@interlace/eslint-devkit:** Utilities for building ESLint rules

## License

MIT © Ofri Peretz

## Support

- **Documentation:** https://github.com/ofri-peretz/forge-js/blob/main/packages/cli/README.md
- **Issues:** https://github.com/ofri-peretz/forge-js/issues
- **Discussions:** https://github.com/ofri-peretz/forge-js/discussions

