#!/bin/bash
# =============================================================================
# First Release Helper Script
# =============================================================================
# 
# This script helps with the first-time publish of a new npm package.
# 
# BACKGROUND:
# npm Trusted Publishers (OIDC) cannot create new packages - the package must
# already exist on npm. This script performs the initial publish using your
# local npm credentials.
#
# USAGE:
#   1. Log into npm: npm login
#   2. Run this script: ./scripts/first-release.sh <package-name>
#   3. After success, configure Trusted Publishers at npmjs.com
#
# =============================================================================

set -e

PACKAGE_NAME="${1:-}"

if [ -z "$PACKAGE_NAME" ]; then
  echo "Usage: $0 <package-name>"
  echo ""
  echo "Available packages:"
  ls -1 packages/ | while read pkg; do
    if [ -f "packages/$pkg/package.json" ]; then
      echo "  - $pkg"
    fi
  done
  exit 1
fi

# Verify package exists
if [ ! -f "packages/$PACKAGE_NAME/package.json" ]; then
  echo "❌ Package not found: packages/$PACKAGE_NAME/package.json"
  exit 1
fi

# Check npm login status
echo "🔐 Checking npm authentication..."
NPM_USER=$(npm whoami 2>/dev/null) || {
  echo "❌ Not logged in to npm. Run 'npm login' first."
  exit 1
}
echo "✅ Authenticated as: $NPM_USER"

# Get package info
PKG_VERSION=$(node -p "require('./packages/$PACKAGE_NAME/package.json').version")
NPM_NAME=$(node -p "require('./packages/$PACKAGE_NAME/package.json').name")

echo ""
echo "📦 Package: $NPM_NAME"
echo "📌 Version: $PKG_VERSION"
echo ""

# Check if already published
if npm view "$NPM_NAME" version 2>/dev/null; then
  echo "⚠️ Package $NPM_NAME already exists on npm!"
  echo "   You can use the release workflow instead."
  exit 0
fi

echo "🆕 First release detected - $NPM_NAME does not exist on npm"
echo ""

# Build the package
echo "🔨 Building package..."
npx nx build "$PACKAGE_NAME" || {
  echo "❌ Build failed"
  exit 1
}
echo "✅ Build complete"
echo ""

# Check dist folder
DIST_PATH="dist/packages/$PACKAGE_NAME"
if [ ! -d "$DIST_PATH" ]; then
  echo "❌ Dist folder not found: $DIST_PATH"
  exit 1
fi

# Publish
echo "📤 Publishing to npm..."
echo "   📂 Directory: $DIST_PATH"
echo ""

cd "$DIST_PATH"
npx nx release publish --access public

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🎉 SUCCESS! $NPM_NAME@$PKG_VERSION is now published!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "NEXT STEPS:"
echo "1. Configure Trusted Publishers for future releases:"
echo "   https://www.npmjs.com/package/$NPM_NAME/access"
echo ""
echo "   Settings:"
echo "   - Organization/User: ofri-peretz"
echo "   - Repository: eslint"
echo "   - Workflow: release.yml"
echo ""
echo "2. Future releases will use OIDC (no token needed)"
echo "═══════════════════════════════════════════════════════════════"
