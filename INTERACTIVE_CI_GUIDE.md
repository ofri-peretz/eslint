# 🚀 Interactive CI Runner & Monitor Script

A powerful interactive bash script that lets you quickly trigger CI runs and view logs from your terminal.

## Features

✨ **Interactive Menu** - Easy-to-use menu-driven interface  
⚡ **Quick Trigger** - Trigger CI with one command  
📊 **View Recent Runs** - See the last 5 CI runs  
📄 **View Logs** - Full logs, failed logs only, or summaries  
🌐 **Browser Integration** - Open runs directly in GitHub  
⏱️ **Real-time Monitoring** - Watch runs as they execute  

## Installation

The script is already in your repository at `scripts/ci-interactive.sh`.

## Usage

### Basic Usage (default branch: local-playground-app)
```bash
./scripts/ci-interactive.sh
```

### Specify a Different Branch
```bash
./scripts/ci-interactive.sh master
./scripts/ci-interactive.sh develop
```

## Main Menu Options

### 1️⃣ Trigger a New CI Run

Starts a fresh CI workflow on your specified branch:
- Shows confirmation when triggered
- Asks if you want to watch it in real-time
- Displays the new run ID

### 2️⃣ View Logs from Recent Runs

Shows the last 5 CI runs with status indicators:
- **✅ Success** - Green, workflow completed successfully
- **❌ Failed** - Red, workflow had errors
- **⏳ Running** - Yellow, currently executing

### Per-Run Options

Once you select a run, you can:

1. **View run summary** - Overview and job status
2. **View full logs** - Last 100 lines of all output
3. **View failed logs only** - Shows only error outputs
4. **Watch in real-time** - Monitor until completion
5. **Open in browser** - Opens GitHub Actions in your browser
6. **Back to run list** - Return to the run selection

## Example Workflow

```
$ ./scripts/ci-interactive.sh

🚀 Interactive CI Runner & Monitor
=====================================

What would you like to do?

1) Trigger a new CI run
2) View logs from recent runs
3) Exit

Choose (1-3): 1

🚀 Triggering CI workflow on branch: local-playground-app
✅ CI workflow triggered successfully!

New run ID: 19016221240

Would you like to watch this run in-time?
1) Yes, watch it
2) No, go back to menu
Choose (1-2): 2
```

## Color Legend

- 🟢 **Green (✅)** - Success state, positive actions
- 🔴 **Red (❌)** - Errors, failures
- 🟡 **Yellow (⏳)** - In progress, waiting
- 🔵 **Blue** - Information, menu options
- 🟦 **Cyan** - Headers, important info

## Requirements

- **GitHub CLI** (`gh`) v2.0+
- **jq** (JSON processor)
- **Bash** 4.0+

Verify installation:
```bash
gh --version
jq --version
bash --version
```

## Keyboard Shortcuts

- **Ctrl+C** - Exit watching a run
- **Enter** - Continue through prompts
- **Number + Enter** - Select menu options

## Tips & Tricks

1. **Quick Status Check**
   ```bash
   ./scripts/ci-interactive.sh
   # Select "View logs from recent runs" → Select last run → "View run summary"
   ```

2. **Monitor Latest Run**
   ```bash
   ./scripts/ci-interactive.sh
   # Select "Trigger a new CI run" → "Yes, watch it"
   ```

3. **View Errors Fast**
   ```bash
   ./scripts/ci-interactive.sh
   # Select "View logs from recent runs" → Select failed run → "View failed logs only"
   ```

4. **Multiple Branches**
   ```bash
   # In one terminal
   ./scripts/ci-interactive.sh local-playground-app
   
   # In another
   ./scripts/ci-interactive.sh master
   ```

## Troubleshooting

### Script won't run
```bash
# Make sure it's executable
chmod +x scripts/ci-interactive.sh
```

### gh command not found
```bash
# Install GitHub CLI
brew install gh  # macOS
# or
sudo apt install gh  # Linux
```

### jq command not found
```bash
# Install jq
brew install jq  # macOS
sudo apt install jq  # Linux
```

### No runs showing
- Make sure you've triggered at least one workflow
- Check that you're on the correct branch
- Verify GitHub CLI authentication: `gh auth status`

## Integration with Your Workflow

Add an alias to your shell config (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# Quick CI access
alias ci='./scripts/ci-interactive.sh'
alias ci-master='./scripts/ci-interactive.sh master'
```

Then use:
```bash
ci
ci-master
```

## Advanced Usage

### From Other Directories

```bash
# From anywhere in the project
cd /some/other/path
/path/to/forge-js/scripts/ci-interactive.sh

# Or add to PATH
export PATH="$PATH:/Users/ofri/repos/ofriperetz.dev/forge-js/scripts"
ci-interactive.sh
```

### In CI/CD Pipeline

The script can be integrated into other automation:

```bash
#!/bin/bash
# Trigger CI and store run ID
echo "1" | ./scripts/ci-interactive.sh > /tmp/ci.log 2>&1
RUN_ID=$(grep "New run ID" /tmp/ci.log | cut -d' ' -f4)
echo "Run $RUN_ID triggered"
```

## Documentation

For more GitHub CLI information:
- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [gh run command reference](https://cli.github.com/manual/gh_run)

---

**Created:** November 2, 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready

