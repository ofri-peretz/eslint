#!/bin/bash

# Test Coverage Generation Script
# Verifies all packages generate coverage reports for Codecov

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "🧪 Testing Coverage Generation for Codecov"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Run tests with coverage
echo "📦 Running tests with coverage..."
pnpm nx run-many -t test --all --coverage --verbose

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📊 Checking coverage files..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Array of expected coverage files
coverage_files=(
  "packages/eslint-plugin/coverage/coverage-final.json"
  "packages/cli/coverage/coverage-final.json"
  "packages/eslint-plugin-utils/coverage/coverage-final.json"
)

all_found=true

for file in "${coverage_files[@]}"; do
  if [ -f "$file" ]; then
    size=$(du -h "$file" | cut -f1)
    lines=$(jq '.coverage | length' "$file")
    echo "✅ $file ($size, $lines files covered)"
  else
    echo "❌ $file NOT FOUND"
    all_found=false
  fi
done

echo ""
if [ "$all_found" = true ]; then
  echo "═══════════════════════════════════════════════════════════════"
  echo "✅ ALL COVERAGE FILES FOUND!"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "📤 Ready to upload to Codecov with:"
  echo "   files: ./packages/*/coverage/coverage-final.json"
  echo ""
  exit 0
else
  echo "═══════════════════════════════════════════════════════════════"
  echo "❌ SOME COVERAGE FILES MISSING"
  echo "═══════════════════════════════════════════════════════════════"
  exit 1
fi
