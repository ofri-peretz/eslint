# Validation Scripts Inventory

**Created:** January 12, 2026  
**Location:** `/Users/ofri/repos/ofriperetz.dev/eslint/scripts/`  
**Purpose:** Automated validation scripts for ongoing quality assurance

---

## Available Scripts

### 1. validate-mermaid.sh

**Purpose**: Validate all Mermaid diagrams for syntax errors

**Location**: `scripts/validate-mermaid.sh`

**Usage**:

```bash
./scripts/validate-mermaid.sh
```

**What It Checks**:

- Finds all markdown files containing Mermaid diagrams
- Extracts Mermaid code blocks
- Checks for unquoted parentheses in node labels
- Checks for unquoted square brackets in node labels
- Reports files with syntax errors

**Exit Codes**:

- `0`: All diagrams valid
- `1`: One or more syntax errors found

**Example Output**:

```
=== Mermaid Diagram Syntax Validator ===

Finding all Mermaid diagrams...
Found 72 files with Mermaid diagrams

=== Summary ===
Total files scanned: 72
Files with errors: 0
✅ All Mermaid diagrams passed validation!
```

**Recommended Use**:

- Pre-commit hook
- CI/CD pipeline
- Before deployment
- After adding new documentation

---

## Integration Examples

### Pre-Commit Hook

**File**: `.git/hooks/pre-commit`

```bash
#!/bin/bash

echo "Validating Mermaid diagrams..."
./scripts/validate-mermaid.sh

if [ $? -ne 0 ]; then
  echo "❌ Mermaid validation failed. Please fix syntax errors before committing."
  exit 1
fi

echo "✅ Mermaid validation passed"
```

### Husky Integration

**File**: `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate Mermaid diagrams
npm run validate:mermaid || exit 1
```

**File**: `package.json`

```json
{
  "scripts": {
    "validate:mermaid": "./scripts/validate-mermaid.sh"
  }
}
```

### GitHub Actions

**File**: `.github/workflows/validate-mermaid.yml`

```yaml
name: Validate Mermaid Diagrams

on:
  push:
    paths:
      - '**/*.md'
  pull_request:
    paths:
      - '**/*.md'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Make script executable
        run: chmod +x scripts/validate-mermaid.sh

      - name: Validate Mermaid Diagrams
        run: ./scripts/validate-mermaid.sh
```

---

## Future Scripts (Planned)

### 2. validate-sitemap.sh (Planned)

**Purpose**: Validate all sitemap URLs return expected status codes

**Planned Features**:

- Extract all URLs from sitemap.xml
- Test each URL with cURL
- Check for 404s, 500s, redirects
- Report only errors (silent success mode)

### 3. validate-browser.sh (Planned)

**Purpose**: Browser-based validation for client-side errors

**Planned Features**:

- Use Playwright/Puppeteer
- Visit all sitemap URLs
- Capture console errors
- Report JavaScript exceptions
- Screenshot failed pages

### 4. validate-links.sh (Planned)

**Purpose**: Check all internal and external links in documentation

**Planned Features**:

- Extract links from markdown files
- Test internal links (file existence)
- Test external links (HTTP status)
- Report broken links
- Ignore whitelist (e.g., example.com)

---

## Maintenance

### Updating Scripts

When modifying validation logic:

1. Update the script in `scripts/`
2. Test locally before committing
3. Update this inventory documentation
4. Update relevant audit files if validation strategy changes

### Adding New Scripts

When adding new validation scripts:

1. Create script in `scripts/` directory
2. Make executable: `chmod +x scripts/new-script.sh`
3. Add to this inventory with:
   - Purpose
   - Usage example
   - What it checks
   - Exit codes
4. Update CI/CD workflows if needed
5. Update pre-commit hooks if needed

---

## Best Practices

1. **Exit Codes**: Always use proper exit codes (0 = success, 1 = failure)
2. **Silent Success**: Only output details when errors found (keep noise low)
3. **Colored Output**: Use ANSI colors for better readability
4. **Error Context**: Show which files/lines have errors
5. **Fast Feedback**: Optimize for speed when possible

---

## Related Documentation

- [Mermaid Syntax Audit](../.agent/mermaid-syntax-audit.md)
- [Client-Side Error Detection Guide](../.agent/client-side-error-detection-guide.md)
- [Sitemap Validation Audit](../.agent/sitemap-validation-audit.md)

---

**Last Updated**: January 12, 2026
