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
FAILED_DETAILS=""

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
    DEPS=$(npx nx show project "$PACKAGE" --json 2>/dev/null | jq -r '.implicitDependencies // [] | .[]' 2>/dev/null || echo "")
    # Also check sourceRoot-based dependencies
    DEPS="$DEPS $(npx nx graph --print-affected --focus="$PACKAGE" 2>/dev/null | jq -r '.nodes | keys[]' 2>/dev/null | grep -v "^$PACKAGE$" || echo "")"
    
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
  
  # ──────────────────────────────────────────────────────────────
  # R18: Validate package.json exists and is readable
  # ──────────────────────────────────────────────────────────────
  PACKAGE_JSON="./packages/$PACKAGE/package.json"
  if [ ! -f "$PACKAGE_JSON" ]; then
    FAILURE_REASON="package.json not found"
    echo "❌ FAILED: $PACKAGE"
    echo "   └─ $FAILURE_REASON at: $PACKAGE_JSON"
    echo "   └─ Check if package directory exists"
    FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
    FAILED_DETAILS="${FAILED_DETAILS}$PACKAGE: $FAILURE_REASON\n"
    continue
  fi
  
  # Dynamic npm name resolution from package.json (more robust than hardcoded mapping)
  NPM_NAME=$(node -p "require('$PACKAGE_JSON').name" 2>/dev/null) || {
    echo "❌ FAILED: $PACKAGE"
    echo "   └─ Could not read 'name' from package.json"
    echo "   └─ Ensure package.json is valid JSON"
    FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
    continue
  }
  
  if [ -z "$NPM_NAME" ]; then
    echo "❌ FAILED: $PACKAGE"
    echo "   └─ 'name' field is empty in package.json"
    FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
    continue
  fi
  
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
  if [ "$TAG_EXISTS" = "true" ] && [ "$NPM_EXISTS" = "true" ]; then
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
    if ! npx nx lint "$PACKAGE"; then
      echo "❌ FAILED: $PACKAGE"
      echo "   └─ Stage: Lint"
      echo "   └─ Action: Run 'npx nx lint $PACKAGE' locally to see errors"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      continue
    fi
    
    # TEST (matches ci-pr.yml)
    echo "🧪 Testing..."
    if ! npx nx test "$PACKAGE" -c ci; then
      echo "❌ FAILED: $PACKAGE"
      echo "   └─ Stage: Test"
      echo "   └─ Action: Run 'npx nx test $PACKAGE' locally to see failures"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      continue
    fi
    
    # BUILD (matches ci-pr.yml)
    echo "🔨 Building..."
    if ! npx nx build "$PACKAGE"; then
      echo "❌ FAILED: $PACKAGE"
      echo "   └─ Stage: Build"
      echo "   └─ Action: Run 'npx nx build $PACKAGE' locally to see errors"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      continue
    fi
    
    # TYPECHECK (matches ci-pr.yml)
    echo "🔍 Typechecking..."
    if ! npx nx typecheck "$PACKAGE"; then
      echo "❌ FAILED: $PACKAGE"
      echo "   └─ Stage: Typecheck"
      echo "   └─ Action: Run 'npx nx typecheck $PACKAGE' locally to see errors"
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
      npx nx release version "$FORCE_VERSION" --projects="$PACKAGE" --dry-run || true
    elif [ "$VERSION_SPEC" != "auto" ]; then
      npx nx release version "$VERSION_SPEC" --projects="$PACKAGE" --dry-run || true
    else
      npx nx release version --projects="$PACKAGE" --dry-run || true
    fi
  else
    echo ""
    echo "📝 Bumping version..."
    
    VERSION_FAILED=false
    if [ -n "$FORCE_VERSION" ]; then
      npx nx release version "$FORCE_VERSION" --projects="$PACKAGE" || VERSION_FAILED=true
    elif [ "$VERSION_SPEC" != "auto" ]; then
      npx nx release version "$VERSION_SPEC" --projects="$PACKAGE" || VERSION_FAILED=true
    else
      OUTPUT=$(npx nx release version --projects="$PACKAGE" 2>&1) || VERSION_FAILED=true
      echo "$OUTPUT"
      
      # Fallback to patch if no conventional commits or no changes
      if [ "$VERSION_FAILED" = "true" ] && echo "$OUTPUT" | grep -qiE "(No changes detected|No projects are set to be processed|nothing to commit)"; then
        echo "ℹ️ No conventional commits detected, falling back to patch..."
        if ! npx nx release version patch --projects="$PACKAGE"; then
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
      FAILURE_REASON="Version bump failed - check if package is in nx.json release.projects array"
      echo "❌ FAILED: $PACKAGE"
      echo "   └─ Stage: Version bump"
      echo "   └─ Action: Verify package is in nx.json release.projects, then run 'npx nx release version --projects=$PACKAGE' locally"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      FAILED_DETAILS="${FAILED_DETAILS}$PACKAGE: $FAILURE_REASON\n"
      continue
    fi
    
    NEW_VERSION=$(node -p "require('./packages/$PACKAGE/package.json').version")
    echo "✅ Version: $NEW_VERSION"
    
    # ──────────────────────────────────────────────────────────────
    # BUILD (test runs automatically as dependency via nx graph)
    # ──────────────────────────────────────────────────────────────
    echo "🔨 Building..."
    BUILD_LOG="/tmp/build-$PACKAGE.log"
    if npx nx build "$PACKAGE" --output-style=static > "$BUILD_LOG" 2>&1; then
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
      npx nx release changelog --projects="$PACKAGE" || echo "⚠️ Changelog failed (non-blocking)"
    fi
    
    # ──────────────────────────────────────────────────────────────
    # PUSH (Git is source of truth - push BEFORE npm)
    # ──────────────────────────────────────────────────────────────
    echo ""
    echo "📤 Pushing changes to git..."
    
    # Pull latest to avoid push conflicts
    # R19: Abort any in-progress rebase before attempting new one
    git rebase --abort 2>/dev/null || true
    
    if ! git pull --rebase origin main; then
      # R19: Clean up failed rebase to prevent broken git state
      git rebase --abort 2>/dev/null || true
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
    # STEP 2: Publish based on release type
    # ────────────────────────────────────────────────────────────
    PUBLISH_FAILED=false
    PUBLISH_OUTPUT=""
    
    if [ "$IS_FIRST_RELEASE" = "true" ]; then
      # ════════════════════════════════════════════════════════════
      # FIRST RELEASE: Use direct npm publish with token auth
      # OIDC Trusted Publishers CANNOT create new packages on npm.
      # We must use NPM_TOKEN with direct npm publish.
      # ════════════════════════════════════════════════════════════
      
      echo "🆕 First release mode - using direct npm publish with NPM_TOKEN"
      
      # Validate NPM_TOKEN is available
      if [ -z "${NPM_TOKEN:-}" ]; then
        echo "❌ FAILED: $PACKAGE"
        echo "   └─ First release requires NPM_TOKEN secret"
        echo "   └─ Fix: Add NPM_TOKEN to GitHub repo secrets"
        echo "   └─ Go to: npmjs.com → Access Tokens → Generate Automation Token"
        FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
        continue
      fi
      
      # Validate token is valid
      echo "🔍 Validating NPM_TOKEN..."
      TOKEN_CHECK=$(npm whoami --registry=https://registry.npmjs.org/ 2>&1) || true
      if echo "$TOKEN_CHECK" | grep -qiE "(401|error|unauthorized|ENEEDAUTH)"; then
        echo "❌ FAILED: $PACKAGE"
        echo "   └─ NPM_TOKEN is invalid or expired"
        echo "   └─ Fix: Generate new token at npmjs.com → Access Tokens"
        echo "   └─ Token check returned: $TOKEN_CHECK"
        FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
        continue
      fi
      echo "   ✅ Token valid - authenticated as: $TOKEN_CHECK"
      
      # Configure explicit token-based auth (override OIDC)
      DIST_DIR="dist/packages/$PACKAGE"
      if [ ! -d "$DIST_DIR" ]; then
        echo "❌ FAILED: $PACKAGE"
        echo "   └─ Dist directory not found: $DIST_DIR"
        echo "   └─ Build may have failed"
        FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
        continue
      fi
      
      # Create local .npmrc in dist directory for token auth
      echo "📝 Configuring npm for token-based authentication..."
      echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > "$DIST_DIR/.npmrc"
      
      # Execute direct npm publish
      echo "📦 Publishing $NPM_NAME@$NEW_VERSION via npm publish..."
      PUBLISH_OUTPUT=$(cd "$DIST_DIR" && npm publish --access public --tag "$DIST_TAG" 2>&1) || PUBLISH_FAILED=true
      
      # Clean up .npmrc
      rm -f "$DIST_DIR/.npmrc"
      
    else
      # ════════════════════════════════════════════════════════════
      # EXISTING PACKAGE: Use OIDC via npx nx release publish
      # Trusted Publishers provides passwordless, provenance-signed releases
      # Fallback to NPM_TOKEN if OIDC fails with 401
      # ════════════════════════════════════════════════════════════
      
      echo "📦 Publishing via OIDC (Trusted Publishers)..."
      PUBLISH_CMD="npx nx release publish --projects=$PACKAGE --tag $DIST_TAG"
      PUBLISH_OUTPUT=$($PUBLISH_CMD 2>&1) || PUBLISH_FAILED=true
      
      # OIDC Fallback - If OIDC fails with 401, try NPM_TOKEN
      if [ "$PUBLISH_FAILED" = "true" ] && echo "$PUBLISH_OUTPUT" | grep -qiE "(401|unauthorized|ENEEDAUTH)"; then
        echo "⚠️ OIDC auth failed, attempting NPM_TOKEN fallback..."
        
        if [ -n "${NPM_TOKEN:-}" ]; then
          # Use same direct npm publish logic as first release
          DIST_DIR="dist/packages/$PACKAGE"
          if [ -d "$DIST_DIR" ]; then
            echo "📝 Configuring npm for token-based authentication..."
            echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > "$DIST_DIR/.npmrc"
            
            echo "📦 Publishing $NPM_NAME@$NEW_VERSION via npm publish (fallback)..."
            PUBLISH_OUTPUT=$(cd "$DIST_DIR" && npm publish --access public --tag "$DIST_TAG" 2>&1) || PUBLISH_FAILED=true
            
            # Check if fallback succeeded
            if [ "$PUBLISH_FAILED" = "false" ] || ! echo "$PUBLISH_OUTPUT" | grep -qiE "(error|401|403|404)"; then
              PUBLISH_FAILED=false
              echo "✅ NPM_TOKEN fallback succeeded"
              echo "⚠️ Consider configuring Trusted Publishers for this package"
            fi
            
            rm -f "$DIST_DIR/.npmrc"
          else
            echo "   └─ Cannot fallback: dist directory not found"
          fi
        else
          echo "   └─ Cannot fallback: NPM_TOKEN not configured"
          echo "   └─ Fix: Configure Trusted Publishers at npmjs.com OR add NPM_TOKEN"
        fi
      fi
    fi
    
    # ────────────────────────────────────────────────────────────
    # STEP 3: Handle publish result with comprehensive error diagnosis
    # ────────────────────────────────────────────────────────────
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
      
      # ERROR: 404 Not Found
      if echo "$PUBLISH_OUTPUT" | grep -qiE "(404|not found)"; then
        echo "❌ NPM 404: Package $NPM_NAME not found or registry error"
        echo "   └─ For first releases: Ensure NPM_TOKEN is valid"
        echo "   └─ For existing packages: Check registry status"
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
      
      # Rate limiting detection
      if echo "$PUBLISH_OUTPUT" | grep -qiE "(429|too many requests|rate limit|ETOOMANYREQ)"; then
        echo "❌ NPM Rate Limited: Too many requests for $NPM_NAME"
        echo "   └─ Fix: Wait 15-60 minutes and re-run"
        echo "   └─ Check: https://status.npmjs.org/"
        FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
        continue
      fi
      
      # GENERIC ERROR: Unknown failure
      echo "❌ NPM Publish Failed for $NPM_NAME (exit $PUBLISH_EXIT)"
      echo "   └─ Fix: Try 'npx nx release publish --projects=$PACKAGE --dry-run' locally"
      FAILED_PACKAGES="$FAILED_PACKAGES $PACKAGE"
      continue
    fi
    
    echo "$PUBLISH_OUTPUT"
    echo "✅ Published $NPM_NAME@$NEW_VERSION"
    
    # ──────────────────────────────────────────────────────────────
    # CREATE GITHUB RELEASE (only for successfully published packages)
    # ──────────────────────────────────────────────────────────────
    echo ""
    echo "📝 Creating GitHub Release..."
    
    RELEASE_TAG="${PACKAGE}@${NEW_VERSION}"
    
    # Generate changelog for this release
    CHANGELOG=""
    LAST_RELEASE_TAG=$(git tag --list "${PACKAGE}@*" --sort=-version:refname 2>/dev/null | grep -v "^$RELEASE_TAG$" | head -1 || echo "")
    
    if [ -n "$LAST_RELEASE_TAG" ]; then
      # Get commits since last release for this package
      COMMITS=$(git log --oneline "$LAST_RELEASE_TAG..HEAD" -- "packages/$PACKAGE/" 2>/dev/null | head -20 || echo "")
      if [ -n "$COMMITS" ]; then
        CHANGELOG="## What's Changed
 
$COMMITS
"
      fi
    else
      # First release - no previous tag
      CHANGELOG="## 🎉 Initial Release
 
This is the first release of \`$NPM_NAME\`.
"
    fi
    
    # Build release body
    RELEASE_BODY="# $NPM_NAME v$NEW_VERSION
 
📦 **NPM:** [\`npm install $NPM_NAME@$NEW_VERSION\`](https://www.npmjs.com/package/$NPM_NAME/v/$NEW_VERSION)
 
$CHANGELOG
---
 
*Released via [GitHub Actions](https://github.com/ofri-peretz/eslint/actions/workflows/release.yml)*"
    
    # Create GitHub Release using gh CLI
    if command -v gh &> /dev/null && [ -n "${GITHUB_TOKEN:-}" ]; then
      # Check if release already exists
      if gh release view "$RELEASE_TAG" &>/dev/null; then
        echo "   ⚠️ GitHub Release $RELEASE_TAG already exists, skipping"
      else
        if gh release create "$RELEASE_TAG" \
          --title "$NPM_NAME@$NEW_VERSION" \
          --notes "$RELEASE_BODY" \
          --target main; then
          echo "   ✅ GitHub Release created: $RELEASE_TAG"
        else
          echo "   ⚠️ Failed to create GitHub Release (non-blocking)"
        fi
      fi
    else
      echo "   ⚠️ GitHub CLI not available or GITHUB_TOKEN not set, skipping GitHub Release"
    fi
    
    # First-release post-publish guidance
    if [ "$IS_FIRST_RELEASE" = "true" ]; then
      echo ""
      echo "🎉 First release success!"
      echo "   └─ Next step: Configure Trusted Publishers for future releases"
      echo "   └─ Go to: npmjs.com → $NPM_NAME → Settings → Publishing access"
      echo "   └─ Add: GitHub Actions (repo: ofri-peretz/eslint, workflow: release.yml)"
    fi
    
    RELEASED_PACKAGES="$RELEASED_PACKAGES $PACKAGE@$NEW_VERSION"
  fi
done

# Output results
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📊 RELEASE SUMMARY"
echo "═══════════════════════════════════════════════════════════════"

if [ -n "$RELEASED_PACKAGES" ]; then
  echo "✅ Released:"
  for pkg_ver in $RELEASED_PACKAGES; do
    echo "   - $pkg_ver"
  done
else
  echo "✅ Released: (none)"
fi

if [ -n "$SKIPPED_PACKAGES" ]; then
  echo ""
  echo "⏭️ Skipped:"
  for pkg in $SKIPPED_PACKAGES; do
    echo "   - $pkg"
  done
fi

if [ -n "$FAILED_PACKAGES" ]; then
  echo ""
  echo "❌ Failed:"
  for pkg in $FAILED_PACKAGES; do
    echo "   - $pkg"
  done
  
  if [ -n "$FAILED_DETAILS" ]; then
    echo ""
    echo "📋 Failure Details:"
    echo "$FAILED_DETAILS" | while IFS= read -r line; do
      if [ -n "$line" ]; then
        echo "   $line"
      fi
    done
  fi
fi

# Write outputs for GitHub Actions
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "released=$RELEASED_PACKAGES" >> "$GITHUB_OUTPUT"
  echo "skipped=$SKIPPED_PACKAGES" >> "$GITHUB_OUTPUT"
  echo "failed=$FAILED_PACKAGES" >> "$GITHUB_OUTPUT"
  # Escape newlines for GitHub Actions multiline output
  FAILED_DETAILS_ESCAPED="${FAILED_DETAILS//$'\n'/%0A}"
  echo "failed-details=$FAILED_DETAILS_ESCAPED" >> "$GITHUB_OUTPUT"
fi

# Fail workflow if any packages failed
if [ -n "$FAILED_PACKAGES" ]; then
  echo "❌ Some packages failed to release"
  exit 1
fi
