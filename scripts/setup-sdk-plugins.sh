#!/bin/bash
# Script to configure the 3 new SDK-specific security plugins

set -e

PLUGINS=("openai" "anthropic" "google-ai")

for plugin in "${PLUGINS[@]}"; do
  PKG_DIR="packages/eslint-plugin-${plugin}-security"
  
  echo "Configuring eslint-plugin-${plugin}-security..."
  
  # Create directory structure
  mkdir -p "$PKG_DIR/src/rules/${plugin}"
  mkdir -p "$PKG_DIR/src/tests/${plugin}"
  mkdir -p "$PKG_DIR/src/types"
  
  # Remove auto-generated lib folder
  rm -rf "$PKG_DIR/src/lib"
  
  # Copy LICENSE and AGENTS.md
  cp packages/eslint-plugin-secure-coding/LICENSE "$PKG_DIR/"
  cp packages/eslint-plugin-secure-coding/AGENTS.md "$PKG_DIR/"
  
  echo "✓ Configured $plugin plugin structure"
done

echo ""
echo "✅ All 3 SDK security plugins configured!"
echo ""
echo "Next steps:"
echo "1. Update package.json files"
echo "2. Update project.json files"  
echo "3. Update tsconfig files"
echo "4. Create index.ts, types, and README for each"
