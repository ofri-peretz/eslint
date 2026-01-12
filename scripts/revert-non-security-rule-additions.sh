#!/bin/bash

# Revert inappropriate security-focused additions to non-security plugin rule docs
# These plugins are architectural/quality focused, not security focused

set -e

echo "🔄 Reverting inappropriate security additions to non-security plugins..."

# Non-security plugins that got inappropriate additions in commit 1d68f96
NON_SECURITY_PLUGINS=(
  "eslint-plugin-import-next"
  "eslint-plugin-architecture"
  "eslint-plugin-quality"
  "eslint-plugin-react-features"
  "eslint-plugin-react-a11y"
)

REVERTED_COUNT=0

for plugin in "${NON_SECURITY_PLUGINS[@]}"; do
  docs_dir="packages/$plugin/docs/rules"
  
  if [ ! -d "$docs_dir" ]; then
    echo "⚠️  Skipping $plugin (docs dir not found)"
    continue
  fi
  
  echo "📦 Processing $plugin..."
  
  # For each .md file in the docs/rules directory
  find "$docs_dir" -name "*.md" | while read -r file; do
    # Check if file exists in the commit before 1d68f96
    if git show 1d68f96^:"$file" > /dev/null 2>&1; then
      # Restore the file to its state before commit 1d68f96
      git show 1d68f96^:"$file" > "$file"
      REVERTED_COUNT=$((REVERTED_COUNT + 1))
      echo "  ✅ Reverted: $(basename "$file")"
    fi
  done
done

echo ""
echo "✅ Complete! Reverted $REVERTED_COUNT rule documentation files to pre-1d68f96 state"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff"
echo "2. Update .agent/rules-compliance-audit.md to clarify it's for SECURITY rules only"
echo "3. Create .agent/architectural-rules-standard.md for non-security rules"
echo "4. Commit: git add . && git commit -m 'fix(docs): revert inappropriate security additions to non-security plugins'"
