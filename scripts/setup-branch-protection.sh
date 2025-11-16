#!/usr/bin/env bash
set -euo pipefail

# Setup Branch Protection for main branch
# This prevents force pushes to main, even for administrators
# Run: ./scripts/setup-branch-protection.sh

REPO_OWNER="${GITHUB_REPOSITORY_OWNER:-ofri-peretz}"
REPO_NAME="${GITHUB_REPOSITORY_NAME:-forge-js}"
BRANCH="main"

echo "🔒 Setting up branch protection for '$BRANCH' branch"
echo "Repository: $REPO_OWNER/$REPO_NAME"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) is not installed"
  echo "Install it: https://cli.github.com/"
  exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
  echo "❌ Not authenticated with GitHub CLI"
  echo "Run: gh auth login"
  exit 1
fi

echo "📋 Current branch protection status:"
gh api "repos/$REPO_OWNER/$REPO_NAME/branches/$BRANCH/protection" 2>/dev/null || echo "  No protection rules found"
echo ""

echo "🔧 Configuring branch protection rules..."
echo ""

# Configure branch protection
# This prevents force pushes, even for admins
gh api "repos/$REPO_OWNER/$REPO_NAME/branches/$BRANCH/protection" \
  --method PUT \
  --field required_status_checks=null \
  --field enforce_admins=true \
  --field required_pull_request_reviews=null \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_linear_history=false \
  --field allow_squash_merge=true \
  --field allow_merge_commit=true \
  --field allow_rebase_merge=true \
  --field required_conversation_resolution=false \
  --field lock_branch=false \
  --field allow_fork_syncing=false \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" || {
    echo ""
    echo "⚠️  Failed to set branch protection via API"
    echo ""
    echo "Please configure manually in GitHub:"
    echo "  1. Go to: https://github.com/$REPO_OWNER/$REPO_NAME/settings/branches"
    echo "  2. Add rule for branch: $BRANCH"
    echo "  3. Enable: 'Do not allow force pushes'"
    echo "  4. Enable: 'Do not allow deletions'"
    echo "  5. Enable: 'Do not allow bypassing the above settings' (even for admins)"
    exit 1
  }

echo "✅ Branch protection configured successfully!"
echo ""
echo "📋 Protection rules applied:"
echo "  ✓ Force pushes to '$BRANCH' are blocked (even for admins)"
echo "  ✓ Branch deletion is blocked"
echo "  ✓ Admins cannot bypass protection"
echo ""
echo "✅ Force pushes to PR branches are still allowed"
echo "✅ Normal pushes (fast-forward) to main are allowed via PR merge"

