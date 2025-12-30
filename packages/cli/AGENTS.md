# AGENTS.md

> Context for AI coding agents working on @eslint/cli

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build cli

# Run tests
nx test cli

# Run the CLI
node dist/packages/cli/bin/forge.js --help

# Link globally (optional)
cd dist/packages/cli && npm link
```

## Code Style

- TypeScript strict mode
- Use `commander` for CLI argument parsing
- Use `ora` for spinners
- Use `chalk` for colored output
- Async/await for all async operations
- Comprehensive error handling with user-friendly messages

## Testing Instructions

- Tests use Vitest
- Coverage target: ≥90% lines
- All tests must pass before committing

## Project Structure

```
src/
├── bin/
│   └── forge.ts      # CLI entry point
├── commands/
│   ├── release/      # Release management commands
│   ├── publish/      # Publishing commands
│   └── prerelease/   # Pre-release management
└── utils/            # Shared utilities
```

## CLI Purpose

CLI tool for managing releases in the monorepo. Provides comprehensive commands for versioning, publishing, and pre-release workflows.

## Commands

### Release Management

```bash
forge release changeset     # Create a changeset
forge release cs            # Alias for changeset
forge release version       # Version packages
forge release status        # Check changeset status
```

### Publishing

```bash
forge publish               # Publish all packages
forge publish --dry-run     # Preview without publishing
forge publish --verbose     # Detailed output
```

### Pre-release

```bash
forge prerelease enter alpha    # Enter alpha mode
forge prerelease enter beta     # Enter beta mode
forge prerelease enter rc       # Enter RC mode
forge prerelease exit           # Exit pre-release mode
```

## Distribution Tags

| Version Format     | Tag      | Example               |
| ------------------ | -------- | --------------------- |
| `X.Y.Z`            | `latest` | `1.0.0`               |
| `X.Y.Z-alpha.N`    | `alpha`  | `1.0.0-alpha.0`       |
| `X.Y.Z-beta.N`     | `beta`   | `1.0.0-beta.1`        |
| `X.Y.Z-rc.N`       | `rc`     | `1.0.0-rc.0`          |
| `X.Y.Z-next.N`     | `next`   | `1.0.0-next.2`        |
| `X.Y.Z-canary.SHA` | `canary` | `1.0.0-canary.abc123` |

## Workflow Examples

### Standard Release

```bash
forge release changeset     # 1. Create changeset
forge release version       # 2. Version packages
git add . && git commit -m "chore: version packages"  # 3. Commit
forge publish               # 4. Publish
```

### Pre-release

```bash
forge prerelease enter alpha    # 1. Enter pre-release
forge release changeset         # 2. Create changeset
forge release version           # 3. Version
forge publish                   # 4. Publish with alpha tag
forge prerelease exit           # 5. Exit pre-release
```
