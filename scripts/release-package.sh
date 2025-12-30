#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# release-package.sh - Release a single package to NPM
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script handles the release of a single package, including:
# - Tag reconciliation (deadlock prevention)
# - Version bumping
# - Testing and building
# - Publishing to NPM with actionable error messages
#
# Usage: ./scripts/release-package.sh <package> [options]
#
# Environment variables:
#   PACKAGE          - Package name (required)
#   DRY_RUN          - true/false
#   VERSION_SPEC     - auto/major/minor/patch/etc
#   DIST_TAG         - latest/next/beta/etc
#   FORCE_VERSION    - Specific version to force
#   GENERATE_CHANGELOG - true/false
#   RUN_CI           - true/false
#   FAILED_PACKAGES  - Space-separated list of already failed packages
#
# Exit codes:
#   0 - Success (released or skipped)
#   1 - Failed
#   2 - Skipped due to dependency failure
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

PACKAGE="${PACKAGE:-}"
DRY_RUN="${DRY_RUN:-false}"
VERSION_SPEC="${VERSION_SPEC:-auto}"
DIST_TAG="${DIST_TAG:-latest}"
FORCE_VERSION="${FORCE_VERSION:-}"
GENERATE_CHANGELOG="${GENERATE_CHANGELOG:-true}"
RUN_CI="${RUN_CI:-false}"
FAILED_PACKAGES="${FAILED_PACKAGES:-}"

# ───────────────────────────────────────────────────────────────────────────────
# Helper: Print actionable error
# ───────────────────────────────────────────────────────────────────────────────
print_error() {
  local title="$1"
  local cause="$2"
  local action="$3"
  echo ""
  echo "❌ $title"
  echo "   └─ Cause: $cause"
  echo "   └─ Action: $action"
  echo ""
}

# ───────────────────────────────────────────────────────────────────────────────
# Resolve NPM package name
# ───────────────────────────────────────────────────────────────────────────────
resolve_npm_name() {
  case "$PACKAGE" in
    eslint-devkit) echo "@interlace/eslint-devkit" ;;
    cli) echo "@interlace/cli" ;;
    *) echo "$PACKAGE" ;;
  esac
}

# ───────────────────────────────────────────────────────────────────────────────
# Check dependency failures
# ───────────────────────────────────────────────────────────────────────────────
check_dependencies() {
  if [ -z "$FAILED_PACKAGES" ]; then
    return 0
  fi
  
  DEPS=$(pnpm nx show project "$PACKAGE" --json 2>/dev/null | jq -r '.implicitDependencies // [] | .[]' 2>/dev/null || echo "")
  
  for dep in $DEPS; do
    if echo "$FAILED_PACKAGES" | grep -q "$dep"; then
      echo "⏭️ SKIPPED: $PACKAGE"
      echo "   └─ Reason: Dependency '$dep' failed to release"
      echo "   └─ Action: Fix $dep first, then re-run release"
      echo "RESULT=skipped:dep:$dep"
      exit 2
    fi
  done
}

# ───────────────────────────────────────────────────────────────────────────────
# Tag reconciliation
# ───────────────────────────────────────────────────────────────────────────────
reconcile_tags() {
  local npm_name="$1"
  
  CURRENT_VERSION=$(node -p "require('./packages/$PACKAGE/package.json').version")
  EXPECTED_TAG="${PACKAGE}@${CURRENT_VERSION}"
  
  echo "📌 Current version: $CURRENT_VERSION"
  
  TAG_EXISTS=false
  NPM_EXISTS=false
  
  if git rev-parse "$EXPECTED_TAG" >/dev/null 2>&1; then
    TAG_EXISTS=true
  fi
  
  if npm view "$npm_name@$CURRENT_VERSION" version >/dev/null 2>&1; then
    NPM_EXISTS=true
  fi
  
  # Decision matrix
  if [ "$TAG_EXISTS" = "true" ] && [ "$NPM_EXISTS" = "true" ]; then
    echo "✅ Already released - skipping"
    echo "RESULT=skipped:already-released"
    exit 0
  elif [ "$TAG_EXISTS" = "true" ] && [ "$NPM_EXISTS" = "false" ]; then
    echo "⚠️ Orphaned tag detected - cleaning up..."
    if [ "$DRY_RUN" = "false" ]; then
      git tag -d "$EXPECTED_TAG" 2>/dev/null || true
      git push origin ":refs/tags/$EXPECTED_TAG" 2>/dev/null || true
      echo "✅ Orphaned tag cleaned"
    else
      echo "🔍 [DRY RUN] Would delete orphaned tag"
    fi
  elif [ "$TAG_EXISTS" = "false" ] && [ "$NPM_EXISTS" = "true" ]; then
    echo "⚠️ NPM ahead of git - will bump version"
  fi
}

# ───────────────────────────────────────────────────────────────────────────────
# CI Validation
# ───────────────────────────────────────────────────────────────────────────────
run_ci_validation() {
  if [ "$RUN_CI" != "true" ]; then
    return 0
  fi
  
  echo ""
  echo "🧪 Running CI validation..."
  
  echo "📝 Linting..."
  pnpm nx lint "$PACKAGE" --verbose || {
    print_error "Lint failed" "ESLint errors in $PACKAGE" "Run 'pnpm nx lint $PACKAGE' locally"
    exit 1
  }
  
  echo "🧪 Testing..."
  pnpm nx test "$PACKAGE" -c ci --verbose || {
    print_error "Test failed" "Test failures in $PACKAGE" "Run 'pnpm nx test $PACKAGE' locally"
    exit 1
  }
  
  echo "🔨 Building..."
  pnpm nx build "$PACKAGE" --verbose || {
    print_error "Build failed" "Build errors in $PACKAGE" "Run 'pnpm nx build $PACKAGE' locally"
    exit 1
  }
  
  echo "🔍 Typechecking..."
  pnpm nx typecheck "$PACKAGE" --verbose || {
    print_error "Typecheck failed" "Type errors in $PACKAGE" "Run 'pnpm nx typecheck $PACKAGE' locally"
    exit 1
  }
  
  echo "✅ CI validation passed"
}

# ───────────────────────────────────────────────────────────────────────────────
# Version bump
# ───────────────────────────────────────────────────────────────────────────────
bump_version() {
  echo ""
  echo "📝 Bumping version..."
  
  VERSION_FAILED=false
  
  if [ -n "$FORCE_VERSION" ]; then
    pnpm nx release version "$FORCE_VERSION" --projects="$PACKAGE" || VERSION_FAILED=true
  elif [ "$VERSION_SPEC" != "auto" ]; then
    pnpm nx release version "$VERSION_SPEC" --projects="$PACKAGE" || VERSION_FAILED=true
  else
    OUTPUT=$(pnpm nx release version --projects="$PACKAGE" 2>&1) || VERSION_FAILED=true
    echo "$OUTPUT"
    
    # Fallback to patch if no conventional commits
    if [ "$VERSION_FAILED" = "true" ] && echo "$OUTPUT" | grep -q "No changes detected"; then
      echo "ℹ️ No conventional commits, falling back to patch..."
      pnpm nx release version patch --projects="$PACKAGE" || {
        print_error "Version bump failed" "Patch fallback also failed" "Check nx release configuration"
        exit 1
      }
      VERSION_FAILED=false
    fi
  fi
  
  if [ "$VERSION_FAILED" = "true" ]; then
    print_error "Version bump failed" "nx release version error" "Run 'pnpm nx release version --projects=$PACKAGE' locally"
    exit 1
  fi
  
  NEW_VERSION=$(node -p "require('./packages/$PACKAGE/package.json').version")
  echo "✅ New version: $NEW_VERSION"
  echo "$NEW_VERSION"
}

# ───────────────────────────────────────────────────────────────────────────────
# Test and build
# ───────────────────────────────────────────────────────────────────────────────
test_and_build() {
  echo ""
  echo "🧪 Testing package..."
  pnpm nx test "$PACKAGE" -c ci --verbose || {
    print_error "Test failed (pre-publish)" "Tests failed" "Run 'pnpm nx test $PACKAGE' locally"
    exit 1
  }
  
  echo ""
  echo "🔨 Building package..."
  pnpm nx build "$PACKAGE" --verbose || {
    print_error "Build failed (pre-publish)" "Build failed" "Run 'pnpm nx build $PACKAGE' locally"
    exit 1
  }
}

# ───────────────────────────────────────────────────────────────────────────────
# Push to git
# ───────────────────────────────────────────────────────────────────────────────
push_to_git() {
  echo ""
  echo "📤 Pushing changes to git..."
  
  git pull --rebase origin main || {
    print_error "Git pull failed" "Merge conflict or upstream changes" "Pull locally and resolve conflicts"
    exit 1
  }
  
  git push origin main || {
    print_error "Git push failed" "Push rejected" "Re-run the release workflow"
    exit 1
  }
  
  git push origin --tags || echo "⚠️ Some tags may already exist"
  echo "✅ Git push successful"
}

# ───────────────────────────────────────────────────────────────────────────────
# Publish to NPM
# ───────────────────────────────────────────────────────────────────────────────
publish_to_npm() {
  local npm_name="$1"
  local new_version="$2"
  
  echo ""
  echo "📤 Publishing to NPM..."
  
  # Detect first release
  IS_FIRST_RELEASE=false
  PACKAGE_CHECK=$(npm view "$npm_name" name 2>&1) || true
  
  if echo "$PACKAGE_CHECK" | grep -qiE "(404|not found|no such package)"; then
    IS_FIRST_RELEASE=true
    echo "🆕 First release detected - will use --first-release flag"
  fi
  
  # Pre-publish check
  if [ "$IS_FIRST_RELEASE" = "false" ]; then
    if npm view "$npm_name@$new_version" version >/dev/null 2>&1; then
      echo "⚠️ Version $new_version already on npm - skipping"
      echo "RESULT=skipped:npm-exists"
      exit 0
    fi
  fi
  
  # Build command
  PUBLISH_CMD="pnpm nx release publish --projects=$PACKAGE --tag $DIST_TAG"
  if [ "$IS_FIRST_RELEASE" = "true" ]; then
    PUBLISH_CMD="$PUBLISH_CMD --first-release"
  fi
  
  # Execute publish
  PUBLISH_OUTPUT=$($PUBLISH_CMD 2>&1) || {
    PUBLISH_EXIT=$?
    echo "$PUBLISH_OUTPUT"
    
    # 403/conflict - treat as skip
    if echo "$PUBLISH_OUTPUT" | grep -qiE "(403|EPUBLISHCONFLICT|cannot publish over|already exists)"; then
      echo "⚠️ Version already exists - marking as skipped"
      echo "RESULT=skipped:conflict"
      exit 0
    fi
    
    # 401 - auth issue
    if echo "$PUBLISH_OUTPUT" | grep -qiE "(401|unauthorized|ENEEDAUTH)"; then
      print_error "NPM 401 Unauthorized" "Auth credentials invalid/expired" \
        "Configure Trusted Publishers at npmjs.com or update NPM_TOKEN secret"
      exit 1
    fi
    
    # 403 forbidden (not conflict)
    if echo "$PUBLISH_OUTPUT" | grep -qiE "(403|forbidden|EPERM)"; then
      print_error "NPM 403 Forbidden" "Token lacks permission" \
        "Check token scopes or configure Trusted Publishers"
      exit 1
    fi
    
    # Network error
    if echo "$PUBLISH_OUTPUT" | grep -qiE "(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|network)"; then
      print_error "NPM Network Error" "Cannot reach npm registry" \
        "Wait and re-run. Check https://status.npmjs.org/"
      exit 1
    fi
    
    # Generic error
    print_error "NPM Publish Failed (exit $PUBLISH_EXIT)" "Unknown error" \
      "Try 'pnpm nx release publish --projects=$PACKAGE --dry-run' locally"
    exit 1
  }
  
  echo "$PUBLISH_OUTPUT"
  echo "✅ Published $npm_name@$new_version"
  
  if [ "$IS_FIRST_RELEASE" = "true" ]; then
    echo ""
    echo "🎉 First release successful! Configure Trusted Publishers at npmjs.com"
  fi
  
  echo "RESULT=released:$PACKAGE@$new_version"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if [ -z "$PACKAGE" ]; then
  echo "❌ PACKAGE environment variable is required"
  exit 1
fi

NPM_NAME=$(resolve_npm_name)

echo "═══════════════════════════════════════════════════════════════"
echo "📦 Processing: $PACKAGE"
echo "═══════════════════════════════════════════════════════════════"
echo "🎯 NPM name: $NPM_NAME"

# Check dependencies
check_dependencies

# Tag reconciliation
reconcile_tags "$NPM_NAME"

# CI validation (optional)
run_ci_validation

# Dry run mode
if [ "$DRY_RUN" = "true" ]; then
  echo ""
  echo "🔍 [DRY RUN] Version bump preview:"
  if [ -n "$FORCE_VERSION" ]; then
    pnpm nx release version "$FORCE_VERSION" --projects="$PACKAGE" --dry-run || true
  elif [ "$VERSION_SPEC" != "auto" ]; then
    pnpm nx release version "$VERSION_SPEC" --projects="$PACKAGE" --dry-run || true
  else
    pnpm nx release version --projects="$PACKAGE" --dry-run || true
  fi
  echo "RESULT=dry-run"
  exit 0
fi

# Version bump
NEW_VERSION=$(bump_version | tail -1)

# Test and build
test_and_build

# Changelog
if [ "$GENERATE_CHANGELOG" = "true" ]; then
  echo ""
  echo "📝 Generating changelog..."
  pnpm nx release changelog --projects="$PACKAGE" || echo "⚠️ Changelog failed (non-blocking)"
fi

# Push to git
push_to_git

# Publish to NPM
publish_to_npm "$NPM_NAME" "$NEW_VERSION"
