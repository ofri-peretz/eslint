#!/bin/bash

# GitHub Actions CLI - Practical Examples
# These are real, executable commands you can run

echo "═══════════════════════════════════════════════════════════════════"
echo "  GitHub Actions CLI - Practical Examples"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Example 1: Check all workflows
echo "📋 Example 1: List all workflows"
echo "────────────────────────────────────────────────────────────────"
echo "$ gh workflow list"
echo ""

# Example 2: Get recent CI runs
echo "🏃 Example 2: Get last 10 CI runs"
echo "────────────────────────────────────────────────────────────────"
echo "$ gh run list --workflow ci.yml --limit 10"
echo ""

# Example 3: Get failed runs
echo "❌ Example 3: Find all failed runs"
echo "────────────────────────────────────────────────────────────────"
echo "$ gh run list --status failure --limit 5"
echo ""

# Example 4: View latest run details
echo "🔍 Example 4: View latest run details"
echo "────────────────────────────────────────────────────────────────"
echo "$ RUN_ID=\$(gh run list --limit 1 --json databaseId -q '.[0].databaseId')"
echo "$ gh run view \$RUN_ID"
echo ""

# Example 5: View run logs
echo "📄 Example 5: View full logs from a run"
echo "────────────────────────────────────────────────────────────────"
echo "$ gh run view <RUN-ID> --log | head -100"
echo ""

# Example 6: Watch a run in real-time
echo "⏱️  Example 6: Watch a run until completion"
echo "────────────────────────────────────────────────────────────────"
echo "$ gh run watch <RUN-ID>"
echo ""

# Example 7: Export run data to JSON
echo "📊 Example 7: Export run data as JSON"
echo "────────────────────────────────────────────────────────────────"
echo "$ gh run list --limit 5 --json databaseId,conclusion,status,updatedAt"
echo ""

# Example 8: Find runs for specific branch
echo "🌳 Example 8: Get runs for a specific branch"
echo "────────────────────────────────────────────────────────────────"
echo "$ gh run list --workflow ci.yml --limit 10 | grep 'your-branch'"
echo ""

# Example 9: Cancel a running workflow
echo "🛑 Example 9: Cancel a running workflow"
echo "────────────────────────────────────────────────────────────────"
echo "$ gh run cancel <RUN-ID>"
echo ""

# Example 10: Filter logs for errors
echo "🔎 Example 10: Search logs for errors"
echo "────────────────────────────────────────────────────────────────"
echo "$ gh run view <RUN-ID> --log | grep -E 'error|failed|Error'"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "  Advanced Workflow Automation"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

echo "🤖 Advanced 1: Check CI and show summary"
echo "────────────────────────────────────────────────────────────────"
cat << 'SCRIPT'
#!/bin/bash
echo "CI Pipeline Summary:"
gh run list --workflow ci.yml --limit 5 --json \
  'conclusion,status,updatedAt,databaseId' | \
  jq '.[] | {
    status: .status,
    conclusion: .conclusion,
    id: .databaseId,
    updated: .updatedAt
  }'
SCRIPT

echo ""
echo "🤖 Advanced 2: Auto-retry failed tests"
echo "────────────────────────────────────────────────────────────────"
cat << 'SCRIPT'
#!/bin/bash
# Get latest failed run
LATEST_FAILED=$(gh run list --status failure --limit 1 --json databaseId -q '.[0].databaseId')
if [ ! -z "$LATEST_FAILED" ]; then
  echo "Latest failed run: $LATEST_FAILED"
  echo "Re-running..."
  # Note: Would need to push a new commit to re-trigger CI
fi
SCRIPT

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  Monitor Your Builds in Bash Script"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

cat << 'SCRIPT'
#!/bin/bash
# monitor_builds.sh - Monitor CI builds in real-time

WORKFLOW="ci.yml"
CHECK_INTERVAL=30

echo "🚀 Starting CI Monitor..."
echo "Checking every $CHECK_INTERVAL seconds"
echo ""

while true; do
  echo "[$(date +'%H:%M:%S')] Getting latest CI runs..."
  
  # Get latest 5 runs
  RUNS=$(gh run list --workflow "$WORKFLOW" --limit 5 --json databaseId,conclusion,status)
  
  # Parse and display
  echo "$RUNS" | jq '.[] | "\(.status) - \(.conclusion // "pending") - \(.databaseId)"'
  
  # If there's a failed run, show it
  FAILED=$(gh run list --workflow "$WORKFLOW" --status failure --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null)
  
  if [ ! -z "$FAILED" ]; then
    echo "⚠️  Failed run detected: $FAILED"
    echo "View logs: gh run view $FAILED --log"
  fi
  
  echo ""
  sleep $CHECK_INTERVAL
done
SCRIPT

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  Save these examples and run them!"
echo "═══════════════════════════════════════════════════════════════════"

