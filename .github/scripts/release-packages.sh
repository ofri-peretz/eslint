#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# RELEASE PACKAGES - Sequential Release Loop
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script handles the release of packages in dependency order.
# It's extracted from release.yml to avoid GitHub Actions' 21KB expression limit.
#
# Environment Variables (required):
#   PACKAGES          - Comma-separated list of packages to release
#   DRY_RUN           - "true" or "false"
#   VERSION_SPEC      - Version specifier (auto, major, minor, patch, etc.)
#   DIST_TAG          - NPM distribution tag (latest, next, etc.)
#   FORCE_VERSION     - Force specific version (optional)
#   GENERATE_CHANGELOG - "true" or "false"
#   RUN_CI            - "true" or "false"
#
# Outputs (written to $GITHUB_OUTPUT if set):
#   released - Space-separated list of released packages
#   skipped  - Space-separated list of skipped packages
#   failed   - Space-separated list of failed packages
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Initialize tracking variables
RELEASED_PACKAGES=""
FAILED_PACKAGES=""
SKIPPED_PACKAGES=""

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 RELEASE PIPELINE - Sequential Mode"
echo "═══════════════════════════════════════════════════════════════"
echo "📦 Packages: $PACKAGES"
echo "📝 Version: $VERSION_SPEC"
echo "🏷️ Dist tag: $DIST_TAG"
echo "🔍 Dry run: $DRY_RUN"
echo ""

# Convert comma-separated to array
IFS=',' read -ra PACKAGE_ARRAY <<< "$PACKAGES"

for PACKAGE in "${PACKAGE_ARRAY[@]}"; do
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "📦 Processing: $PACKAGE"
  echo "═══════════════════════════════════════════════════════════════"
  
  # Check if any of this package's dependencies failed (using Nx graph)
  FAILED_DEP=""
  if [ -n "$FAILED_PACKAGES" ]; then
    # Get this package's dependencies from Nx
    DEPS=$(pnpm nx show project "$PACKAGE" --json 2>/dev/null | jq -r '.implicitDependencies // [] | .[]' 2>/dev/null || echo "")
    # Also check sourceRoot-based dependencies
    DEPS="$DEPS $(pnpm nx graph --print-affected --focus="$PACKAGE" 2>/dev/null | jq -r '.nodes | keys[]' 2>/dev/null | grep -v "^$PACKAGE$" || echo "")"
    
    for dep in $DEPS; do
      if echo "$FAILED_PACKAGES" | grep -q "$dep"; then
        FAILED_DEP="$dep"
        break
      fi
    done
  fi
  
  if [ -n "$FAILED_DEP" ]; then
    echo "⏭️ SKIPPED: $PACKAGE"
    echo "   └─ Reason: Dependency '$FAILED_DEP' failed to release"
    echo "   └─ Action: Fix $FAILED_DEP first, then re-run release"
    SKIPPED_PACKAGES="$SKIPPED_PACKAGES $PACKAGE(dep:$FAILED_DEP)"
    continue
  fi
  
  # Resolve npm package name
  case "$PACKAGE" in
    eslint-devkit)
      NPM_NAME="@interlace/eslint-devkit"
      ;;
    cli)
      NPM_NAME="@interlace/cli"
      ;;
    *)
      NPM_NAME="$PACKAGE"
      ;;
  esac
  
  echo "🎯 Target project: $PACKAGE"
  echo "📛 NPM name: $NPM_NAME"
  
  # ──────────────────────────────────────────────────────────────
  # TAG RECONCILIATION - Deadlock Prevention
  # ──────────────────────────────────────────────────────────────
  CURRENT_VERSION=$(node -p "require('./packages/$PACKAGE/package.json').version")
  EXPECTED_TAG="${PACKAGE}@${CURRENT_VERSION}"
  
  echo "📌 Current version: $CURRENT_VERSION"
  echo "🏷️ Expected tag: $EXPECTED_TAG"
  
  # Check for conflicts
  TAG_EXISTS=false
  NPM_EXISTS=false
  
  if git rev-parse "$EXPECTED_TAG" >/dev/null 2>&1; then
    TAG_EXISTS=true
    echo "⚠️ Git tag exists: $EXPECTED_TAG"
  fi
  
  if npm view "$NPM_NAME@$CURRENT_VERSION" version >/dev/null 2>&1; then
    NPM_EXISTS=true
    echo "⚠️ NPM version exists: $NPM_NAME@$CURRENT_VERSION"
  fi
  
  # Decision matrix for deadlock prevention
  # If version-specifier is explicit (not auto), always bump even if current version is released
  if [ "$TAG_EXISTS" = "true" ] && [ "$NPM_EXISTS" = "true" ] && [ "$VERSION_SPEC" = "auto" ]; then
    echo "✅ Already released - skipping (current version $CURRENT_VERSION exists on both git and npm)"
    SKIPPED_PACKAGES="$SKIPPED_PACKAGES $PACKAGE"
    continue
  elif [ "$TAG_EXISTS" = "true" ] && [ "$NPM_EXISTS" = "true" ]; then
    echo "📦 Current version $CURRENT_VERSION exists, but explicit version bump requested ($VERSION_SPEC) - will bump"
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
  
  # ──────────────────────────────────────────────────────────────
  # CI VALIDATION (Optional) - Matches ci-pr.yml + lint-pr.yml
  # ──────────────────────────────────────────────────────────────
  if [ "$RUN_CI" = "true" ]; then
    echo ""
    echo "🧪 Running CI validation (matches ci-pr.yml + lint-pr.yml)..."
    
    # LINT (matches lint-pr.yml)
    echo "📝 Linting..."
    if ! pnpm nx lint "$PACKAGE"; then
      echo "❌ FAILED: $PACKAGE"
      echo "   └─ Stage: Lint"
      echo "   └─ Action: Run 'pnpm nx lint $PACKAGE' locally to see errors"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      continue
    fi
    
    # TEST (matches ci-pr.yml)
    echo "🧪 Testing..."
    if ! pnpm nx test "$PACKAGE" -c ci; then
      echo "❌ FAILED: $PACKAGE"
      echo "   └─ Stage: Test"
      echo "   └─ Action: Run 'pnpm nx test $PACKAGE' locally to see failures"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      continue
    fi
    
    # BUILD (matches ci-pr.yml)
    echo "🔨 Building..."
    if ! pnpm nx build "$PACKAGE"; then
      echo "❌ FAILED: $PACKAGE"
      echo "   └─ Stage: Build"
      echo "   └─ Action: Run 'pnpm nx build $PACKAGE' locally to see errors"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      continue
    fi
    
    # TYPECHECK (matches ci-pr.yml)
    echo "🔍 Typechecking..."
    if ! pnpm nx typecheck "$PACKAGE"; then
      echo "❌ FAILED: $PACKAGE"
      echo "   └─ Stage: Typecheck"
      echo "   └─ Action: Run 'pnpm nx typecheck $PACKAGE' locally to see errors"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      continue
    fi
    
    echo "✅ CI validation passed (lint + test + build + typecheck)"
  fi
  
  # ──────────────────────────────────────────────────────────────
  # VERSION BUMP
  # ──────────────────────────────────────────────────────────────
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
  else
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
      
      # Fallback to patch if no conventional commits or no changes
      if [ "$VERSION_FAILED" = "true" ] && echo "$OUTPUT" | grep -qiE "(No changes detected|No projects are set to be processed|nothing to commit)"; then
        echo "ℹ️ No conventional commits detected, falling back to patch..."
        if ! pnpm nx release version patch --projects="$PACKAGE"; then
          echo "❌ FAILED: $PACKAGE"
          echo "   └─ Stage: Version bump (patch fallback)"
          echo "   └─ Action: Check nx release configuration - is $PACKAGE in nx.json release.projects?"
          FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
          continue
        fi
        VERSION_FAILED=false
      fi
    fi
    
    if [ "$VERSION_FAILED" = "true" ]; then
      echo "❌ FAILED: $PACKAGE"
      echo "   └─ Stage: Version bump"
      echo "   └─ Action: Run 'pnpm nx release version --projects=$PACKAGE' locally"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      continue
    fi
    
    NEW_VERSION=$(node -p "require('./packages/$PACKAGE/package.json').version")
    echo "✅ Version: $NEW_VERSION"
    
    # ──────────────────────────────────────────────────────────────
    # BUILD (test runs automatically as dependency via nx graph)
    # ──────────────────────────────────────────────────────────────
    echo "🔨 Building..."
    BUILD_LOG="/tmp/build-$PACKAGE.log"
    if pnpm nx build "$PACKAGE" --output-style=static > "$BUILD_LOG" 2>&1; then
      echo "   ✅ Build complete"
    else
      echo "❌ FAILED: $PACKAGE (build)"
      echo "--- Build Log ---"
      cat "$BUILD_LOG"
      echo "-----------------"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      continue
    fi
    
    # ──────────────────────────────────────────────────────────────
    # CHANGELOG
    # ──────────────────────────────────────────────────────────────
    if [ "$GENERATE_CHANGELOG" = "true" ]; then
      echo ""
      echo "📝 Generating changelog..."
      pnpm nx release changelog --projects="$PACKAGE" || echo "⚠️ Changelog failed (non-blocking)"
    fi
    
    # ──────────────────────────────────────────────────────────────
    # PUSH (Git is source of truth - push BEFORE npm)
    # ──────────────────────────────────────────────────────────────
    echo ""
    echo "📤 Pushing changes to git..."
    
    # Pull latest to avoid push conflicts
    if ! git pull --rebase origin main; then
      echo "❌ FAILED: $PACKAGE"
      echo "   └─ Stage: Git pull --rebase"
      echo "   └─ Cause: Merge conflict or upstream changes"
      echo "   └─ Action: Pull latest changes locally and resolve conflicts"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      continue
    fi
    
    if ! git push origin main; then
      echo "❌ FAILED: $PACKAGE"
      echo "   └─ Stage: Git push"
      echo "   └─ Cause: Push rejected (race condition or permission issue)"
      echo "   └─ Action: Re-run the release workflow"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      continue
    fi
    
    git push origin --tags || echo "⚠️ Some tags may already exist"
    echo "✅ Git push successful"
    
    # ──────────────────────────────────────────────────────────────
    # PUBLISH TO NPM (with First-Release + Trusted Publishers support)
    # ──────────────────────────────────────────────────────────────
    echo ""
    echo "📤 Publishing to NPM..."
    
    # ────────────────────────────────────────────────────────────
    # STEP 1: Detect if this is a first-release (package doesn't exist on npm)
    # ────────────────────────────────────────────────────────────
    IS_FIRST_RELEASE=false
    PACKAGE_EXISTS_CHECK=$(npm view "$NPM_NAME" name 2>&1) || true
    
    if echo "$PACKAGE_EXISTS_CHECK" | grep -qiE "(404|not found|no such package)"; then
      IS_FIRST_RELEASE=true
      echo "🆕 First release detected - package '$NPM_NAME' does not exist on npm yet"
      echo "   └─ Will use --first-release flag"
      echo "   └─ After success: Configure Trusted Publishers at npmjs.com"
    fi
    
    # Pre-publish check: version already exists?
    if [ "$IS_FIRST_RELEASE" = "false" ]; then
      if npm view "$NPM_NAME@$NEW_VERSION" version >/dev/null 2>&1; then
        echo "⚠️ Version $NEW_VERSION already on npm - skipping publish"
        SKIPPED_PACKAGES="$SKIPPED_PACKAGES $PACKAGE"
        continue
      fi
    fi
    
    # ────────────────────────────────────────────────────────────
    # STEP 2: Build publish command with appropriate flags
    # ────────────────────────────────────────────────────────────
    PUBLISH_CMD="pnpm nx release publish --projects=$PACKAGE --tag $DIST_TAG"
    PUBLISH_ENV_PREFIX=""
    
    if [ "$IS_FIRST_RELEASE" = "true" ]; then
      PUBLISH_CMD="$PUBLISH_CMD --first-release"
      echo "📦 Command: $PUBLISH_CMD"
      echo "⚠️ First release: Disabling provenance (OIDC can't create new packages)"
      echo "   └─ Using NPM_TOKEN for authentication instead"
      # CRITICAL: Disable provenance for first releases
      # OIDC provenance requires the package to already exist on npm
      # First releases MUST use NPM_TOKEN (classic auth)
      # Use env prefix to ensure it propagates to pnpm subprocess
      PUBLISH_ENV_PREFIX="NPM_CONFIG_PROVENANCE=false"
    fi
    
    # ────────────────────────────────────────────────────────────
    # STEP 3: Execute publish with comprehensive error handling
    # ────────────────────────────────────────────────────────────
    PUBLISH_FAILED=false
    if [ -n "$PUBLISH_ENV_PREFIX" ]; then
      # First release: use env prefix to disable provenance
      PUBLISH_OUTPUT=$(env $PUBLISH_ENV_PREFIX $PUBLISH_CMD 2>&1) || PUBLISH_FAILED=true
    else
      # Regular release: use default env (provenance enabled)
      PUBLISH_OUTPUT=$($PUBLISH_CMD 2>&1) || PUBLISH_FAILED=true
    fi
    
    if [ "$PUBLISH_FAILED" = "true" ]; then
      PUBLISH_EXIT=$?
      echo "$PUBLISH_OUTPUT"
      echo ""
      
      # ════════════════════════════════════════════════════════════
      # ACTIONABLE ERROR DIAGNOSIS
      # ════════════════════════════════════════════════════════════
      
      # ERROR: Version already exists (403/EPUBLISHCONFLICT)
      if echo "$PUBLISH_OUTPUT" | grep -qiE "(403|EPUBLISHCONFLICT|cannot publish over|already exists)"; then
        echo "⚠️ Version $NEW_VERSION already on npm (detected during publish) - marking as skipped"
        SKIPPED_PACKAGES="$SKIPPED_PACKAGES $PACKAGE"
        continue
      fi
      
      # ERROR: 401 Unauthorized
      if echo "$PUBLISH_OUTPUT" | grep -qiE "(401|unauthorized|ENEEDAUTH|not logged in)"; then
        echo "❌ NPM 401: Auth credentials invalid/expired for $NPM_NAME"
        echo "   └─ Fix: Configure Trusted Publishers at npmjs.com or update NPM_TOKEN"
        FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
        continue
      fi
      
      # ERROR: 403 Forbidden (not version conflict)
      if echo "$PUBLISH_OUTPUT" | grep -qiE "(403|forbidden|EPERM)" && ! echo "$PUBLISH_OUTPUT" | grep -qiE "(already exists|cannot publish over)"; then
        echo "❌ NPM 403: Token lacks permission for $NPM_NAME"
        echo "   └─ Fix: Verify Trusted Publishers config (repo: ofri-peretz/eslint, workflow: release.yml)"
        FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
        continue
      fi
      
      # ERROR: 404 Not Found (for updates to non-existent package)
      if echo "$PUBLISH_OUTPUT" | grep -qiE "(404|not found)" && [ "$IS_FIRST_RELEASE" = "false" ]; then
        echo "❌ NPM 404: Package $NPM_NAME not found - may be first release"
        echo "   └─ Fix: Re-run workflow - it should detect --first-release"
        FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
        continue
      fi
      
      # ERROR: 404 on first release - NPM_TOKEN may be missing or invalid
      if echo "$PUBLISH_OUTPUT" | grep -qiE "(404|not found)" && [ "$IS_FIRST_RELEASE" = "true" ]; then
        echo "❌ NPM 404 on First Release: Cannot create package $NPM_NAME"
        echo ""
        echo "   OIDC Trusted Publishers cannot create new packages on npm."
        echo "   The package must be published once before OIDC can be used."
        echo ""
        echo "   ═══════════════════════════════════════════════════════════"
        echo "   SOLUTION OPTIONS:"
        echo "   ═══════════════════════════════════════════════════════════"
        echo ""
        echo "   OPTION 1: Update NPM_TOKEN secret (recommended for CI)"
        echo "   - Go to npmjs.com → Access Tokens → Generate New Token"
        echo "   - Choose 'Automation' type with publish permissions"
        echo "   - Update the NPM_TOKEN secret in GitHub repo settings"
        echo "   - Re-run this workflow"
        echo ""
        echo "   OPTION 2: Local first publish (one-time manual)"
        echo "   - Run locally: npm login"
        echo "   - Run: ./scripts/first-release.sh $PACKAGE"
        echo "   - Then configure Trusted Publishers at npmjs.com"
        echo ""
        echo "   ═══════════════════════════════════════════════════════════"
        FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
        continue
      fi
      
      # ERROR: Network/Registry issues
      if echo "$PUBLISH_OUTPUT" | grep -qiE "(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|network|registry)"; then
        echo "❌ NPM Network Error: Cannot reach registry for $NPM_NAME"
        echo "   └─ Fix: Wait and re-run. Check https://status.npmjs.org/"
        FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
        continue
      fi
      
      # GENERIC ERROR: Unknown failure
      echo "❌ NPM Publish Failed for $NPM_NAME (exit $PUBLISH_EXIT)"
      echo "   └─ Fix: Try 'pnpm nx release publish --projects=$PACKAGE --dry-run' locally"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      continue
    fi
    
    echo "$PUBLISH_OUTPUT"
    echo "✅ Published $NPM_NAME@$NEW_VERSION"
    
    # First-release post-publish guidance
    if [ "$IS_FIRST_RELEASE" = "true" ]; then
      echo "🎉 First release success! Configure Trusted Publishers: npmjs.com → $NPM_NAME → Settings → Publishing access → Add GitHub Actions (repo: ofri-peretz/eslint, workflow: release.yml)"
    fi
    
    RELEASED_PACKAGES="$RELEASED_PACKAGES $PACKAGE@$NEW_VERSION"
  fi
done

# Output results
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📊 RELEASE SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Released: $RELEASED_PACKAGES"
echo "⏭️ Skipped: $SKIPPED_PACKAGES"
echo "❌ Failed: $FAILED_PACKAGES"

# Write outputs for GitHub Actions
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "released=$RELEASED_PACKAGES" >> "$GITHUB_OUTPUT"
  echo "skipped=$SKIPPED_PACKAGES" >> "$GITHUB_OUTPUT"
  echo "failed=$FAILED_PACKAGES" >> "$GITHUB_OUTPUT"
fi

# Fail workflow if any packages failed
if [ -n "$FAILED_PACKAGES" ]; then
  echo "❌ Some packages failed to release"
  exit 1
fi
