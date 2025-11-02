# GitHub Actions CLI Guide

## Overview

GitHub CLI (`gh`) provides powerful commands to manage GitHub Actions workflows directly from your terminal.

**Status:** ✅ GitHub CLI v2.76.1 installed and working

## Quick Commands

### List Workflows
```bash
gh workflow list
```

**Output:**
```
NAME                STATE   ID       
Canary Release      active  201168878
CI                  active  201168879
Lint Workflows      active  201168880
Manual Publish      active  201168881
Publish Packages    active  203109984
Release             active  201168882
Dependabot Updates  active  203109991
```

### View Recent Runs
```bash
# Last 5 runs
gh run list --limit 5

# Filter by workflow
gh run list --workflow ci.yml --limit 10

# Filter by status
gh run list --status failure
gh run list --status success
```

### View Run Details
```bash
# Get full details
gh run view <RUN-ID>

# View logs
gh run view <RUN-ID> --log

# Watch in real-time (until completion)
gh run watch <RUN-ID>
```

### Trigger Workflows
```bash
# Only works if workflow has 'on: workflow_dispatch'
gh workflow run <workflow-filename> --ref <branch>

# Example:
gh workflow run release.yml --ref master
```

### Manage Runs
```bash
# Cancel a running workflow
gh run cancel <RUN-ID>

# Delete a completed run
gh run delete <RUN-ID>

# Download artifacts
gh run download <RUN-ID> --dir ./artifacts
```

## Project Workflows

### 1. **CI** (201168879)
- Runs on: push to PRs
- Tests, builds, and lints the project
- **Note:** Does NOT have `workflow_dispatch` enabled

### 2. **Release** (201168882)
- Handles semantic versioning and releases
- Creates release tags and GitHub releases

### 3. **Manual Publish** (201168881)
- Can be manually triggered
- Publishes packages to npm

### 4. **Publish Packages** (203109984)
- Publishes to npm registry
- Triggered by release workflow

### 5. **Lint Workflows** (201168880)
- Validates workflow YAML files

### 6. **Canary Release** (201168878)
- Publishes canary versions for testing

### 7. **Dependabot Updates** (203109991)
- Automated dependency updates

## Common Workflows

### Check Latest Test Results
```bash
# View last 3 runs
gh run list --workflow ci.yml --limit 3

# Get the first run's ID and view details
RUN_ID=$(gh run list --workflow ci.yml --limit 1 --json databaseId -q .[0].databaseId)
gh run view $RUN_ID

# View full logs
gh run view $RUN_ID --log
```

### Monitor a Failing Build
```bash
# Find failed runs
gh run list --status failure --limit 5

# View details
gh run view <RUN-ID>

# See what went wrong
gh run view <RUN-ID> --log
```

### Download Build Artifacts
```bash
# List artifacts from a run
gh run view <RUN-ID>

# Download all artifacts
gh run download <RUN-ID> --dir ./build-artifacts
```

## Useful Aliases

Add these to your `.bashrc`, `.zshrc`, or terminal config:

```bash
# List recent CI runs
alias ghci='gh run list --workflow ci.yml --limit 10'

# View latest CI run
alias ghci-latest='gh run view $(gh run list --workflow ci.yml --limit 1 --json databaseId -q ".[0].databaseId")'

# View latest CI logs
alias ghci-logs='gh run view $(gh run list --workflow ci.yml --limit 1 --json databaseId -q ".[0].databaseId") --log'

# Watch latest run
alias ghci-watch='gh run watch $(gh run list --limit 1 --json databaseId -q ".[0].databaseId")'

# List failed runs
alias ghfailed='gh run list --status failure --limit 5'
```

## Advanced Usage

### Export Run Data to JSON
```bash
# Get run details as JSON
gh run list --workflow ci.yml --limit 5 --json conclusion,status,updatedAt,databaseId

# Pretty print
gh run list --limit 5 --json databaseId,conclusion,status | jq '.'
```

### Filter by Branch
```bash
# Filter failed runs on specific branch  
gh run list --status failure | grep branch-name
```

### Batch Operations
```bash
# Cancel all failed runs for a workflow
gh run list --status failure --workflow ci.yml --json databaseId | \
  jq -r '.[].databaseId' | \
  xargs -I {} gh run cancel {}
```

## Tips & Tricks

1. **Real-time Monitoring:** Use `gh run watch <RUN-ID>` to monitor builds without refreshing the web UI

2. **Quick Status Check:** `gh run list --limit 1` shows the latest run status instantly

3. **Log Parsing:** Use `gh run view <RUN-ID> --log | grep "error\|warning\|failed"` to find issues quickly

4. **Automation:** Combine with shell scripts to automate workflow monitoring

5. **JSON Export:** Use `--json` flag with `jq` for powerful data filtering and processing

## Recent Runs in This Repository

```
STATUS  TITLE          WORKFLOW  BRANCH    EVENT     ID        ELAPSED  AGE     
X       chore(deps...  CI        depen...  pull_...  19007...  26s      about...
X       chore(deps...  CI        depen...  pull_...  19007...  24s      about...
X       chore(deps...  CI        depen...  pull_...  19007...  31s      about...
```

*Note: X indicates failure, ✓ indicates success*

## Requirements

- ✅ GitHub CLI v2.76.1+ installed
- ✅ Authenticated with `gh auth login`
- ✅ Access to the forge-js repository

## More Information

- [GitHub CLI Docs](https://cli.github.com/manual/gh_run)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Forge.js Repository](https://github.com/ofri-peretz/forge-js)

---

**Created:** November 2, 2025
**Last Updated:** November 2, 2025

