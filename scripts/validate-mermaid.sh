#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Mermaid Diagram Syntax Validator ==="
echo ""

# Find all markdown files with Mermaid diagrams
echo "Finding all Mermaid diagrams..."
FILES=$(find packages -name "*.md" -type f -exec grep -l '```mermaid' {} \;)
TOTAL=$(echo "$FILES" | wc -l | tr -d ' ')

echo "Found $TOTAL files with Mermaid diagrams"
echo ""

ERRORS_FOUND=0
ERROR_FILES=""

while IFS= read -r file; do
  # Extract mermaid blocks and check for common syntax errors
  MERMAID_CONTENT=$(sed -n '/```mermaid/,/```$/p' "$file")
  
  # Check for unquoted parentheses in node labels
  if echo "$MERMAID_CONTENT" | grep -E '\[[^]]*\([^)]*\)[^]]*\]' | grep -v '"' > /dev/null; then
    echo -e "${RED}⚠️  ERROR in: $file${NC}"
    echo "   Found unquoted parentheses in node labels"
    echo "$MERMAID_CONTENT" | grep -E '\[[^]]*\([^)]*\)[^]]*\]' | grep -v '"' | head -3
    echo ""
    ERRORS_FOUND=$((ERRORS_FOUND + 1))
    ERROR_FILES="${ERROR_FILES}${file}\n"
  fi
  
  # Check for unquoted square brackets in node labels
  if echo "$MERMAID_CONTENT" | grep -E '\[[^]]*\[[^]]*\][^]]*\]' | grep -v '"' > /dev/null; then
    echo -e "${RED}⚠️  ERROR in: $file${NC}"
    echo "   Found unquoted square brackets in node labels"
    echo "$MERMAID_CONTENT" | grep -E '\[[^]]*\[[^]]*\][^]]*\]' | grep -v '"' | head -3
    echo ""
    ERRORS_FOUND=$((ERRORS_FOUND + 1))
    ERROR_FILES="${ERROR_FILES}${file}\n"
  fi
done <<< "$FILES"

echo ""
echo "=== Summary ==="
echo "Total files scanned: $TOTAL"
echo -e "${RED}Files with errors: $ERRORS_FOUND${NC}"
echo ""

if [ $ERRORS_FOUND -gt 0 ]; then
  echo "Files with errors:"
  echo -e "$ERROR_FILES"
  exit 1
else
  echo -e "${GREEN}✅ All Mermaid diagrams passed validation!${NC}"
  exit 0
fi
