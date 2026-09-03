#!/bin/bash
# Script to delete all remote branches matching a pattern (excluding main)
# Usage: ./scripts/delete-branches.sh [pattern]
#        npm run delete-branches -- [pattern]
# Example: ./scripts/delete-branches.sh dependabot
#          ./scripts/delete-branches.sh feature/
#          ./scripts/delete-branches.sh "chore/"

set -e

# Get pattern from CLI argument or default to "dependabot"
PATTERN="${1:-dependabot}"

# Show usage if help is requested
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    echo "Usage: $0 [pattern]"
    echo ""
    echo "Delete all remote branches matching a pattern (excluding main branch)"
    echo ""
    echo "Arguments:"
    echo "  pattern    Branch name pattern to match (default: 'dependabot')"
    echo ""
    echo "Examples:"
    echo "  $0                    # Delete branches containing 'dependabot'"
    echo "  $0 dependabot         # Same as above"
    echo "  $0 feature/          # Delete branches starting with 'feature/'"
    echo "  $0 'chore/'           # Delete branches starting with 'chore/'"
    echo "  $0 'fix/'             # Delete branches starting with 'fix/'"
    echo ""
    exit 0
fi

echo "🔍 Fetching latest remote branches..."
git fetch --prune

echo ""
echo "📋 Finding branches matching pattern: '$PATTERN'..."
MATCHED_BRANCHES=$(git branch -r | grep "$PATTERN" | grep -v "origin/main" | sed 's|origin/||' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

if [ -z "$MATCHED_BRANCHES" ]; then
    echo "✅ No branches matching '$PATTERN' found. All clean!"
    exit 0
fi

BRANCH_COUNT=$(echo "$MATCHED_BRANCHES" | grep -c . || echo "0")
echo "Found $BRANCH_COUNT branch(es) matching '$PATTERN' to delete:"
echo "$MATCHED_BRANCHES" | sed 's/^/  - /'
echo ""

read -p "⚠️  Delete these branches? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled."
    exit 0
fi

echo ""
echo "🗑️  Deleting branches..."
DELETED=0
FAILED=0

while IFS= read -r branch; do
    if [ -z "$branch" ]; then
        continue
    fi
    
    echo -n "  Deleting $branch... "
    if git push origin --delete "$branch" 2>/dev/null; then
        echo "✅"
        ((DELETED++))
    else
        echo "❌ (already deleted or doesn't exist)"
        ((FAILED++))
    fi
done <<< "$MATCHED_BRANCHES"

echo ""
echo "📊 Summary:"
echo "  ✅ Deleted: $DELETED"
echo "  ❌ Failed/Already deleted: $FAILED"
echo ""
echo "🧹 Cleaning up local remote-tracking references..."
git fetch --prune

echo ""
echo "✅ Done!"

