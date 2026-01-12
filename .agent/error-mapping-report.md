# ESLint Interlace Tools Error Mapping Report

**Report Date:** January 12, 2026  
**Domain:** https://eslint.interlace.tools/  
**Total URLs Scanned:** 318  
**Errors Found:** 3 (2 HTTP-level, 1+ client-side)

---

## Executive Summary

A comprehensive scan of all 318 URLs extracted from the sitemap revealed **3 categories of errors**:

1. **404 Not Found** - `/articles` endpoint
2. **308 Permanent Redirect** - `/docs/` (trailing slash)
3. **Client-Side Rendering Errors** - At least 1 confirmed (Mermaid syntax errors causing application crashes)

**Key Finding**: HTTP status checks alone are insufficient. Pages can return HTTP 200 but still fail with client-side JavaScript exceptions, making them unusable for visitors.

---

## Scan Methodology

### Tools Used

- `curl` for HTTP status code validation
- Browser automation (Antigravity browser subagent) for client-side error detection
- `sitemap.xml` as the source of truth for all URLs
- Bash scripting for automation

### Process

1. Retrieved sitemap from `https://eslint.interlace.tools/sitemap.xml`
2. Extracted all `<loc>` URLs (318 total)
3. Normalized URLs from `https://interlace-eslint.vercel.app` to `https://eslint.interlace.tools`
4. Tested each URL using `curl -I` to retrieve HTTP status codes
5. Identified and analyzed errors

---

## Detailed Error Analysis

### Error 1: 404 Not Found

**URL:** `https://eslint.interlace.tools/articles`

**HTTP Response:**

```
HTTP/2 404
```

#### Root Cause

The `/articles` route is defined in the sitemap but does not have a corresponding page implementation or has been removed/relocated.

#### Recommendations

- [ ] **Option A:** Implement the `/articles` page if it's intended to exist
- [ ] **Option B:** Remove the URL from `sitemap.xml` if the page is deprecated
- [ ] **Option C:** Add a redirect to the correct articles location (e.g., `/docs/articles`)

#### Priority

🟡 **Medium** - While this is a broken link, it may not be a critical user path if articles are accessible through other routes.

---

### Error 2: 308 Permanent Redirect

**URL:** `https://eslint.interlace.tools/docs/`

**HTTP Response:**

```
HTTP/2 308
Location: /docs
```

#### Root Cause

Next.js is issuing a permanent redirect from `/docs/` (with trailing slash) to `/docs` (without trailing slash). While this works functionally, it adds an unnecessary redirect and may impact:

- SEO (duplicate URL signals)
- Performance (extra round-trip)
- User experience (slight delay)

#### Recommendations

- [ ] **Update sitemap.xml:** Change `https://eslint.interlace.tools/docs/` to `https://eslint.interlace.tools/docs` (remove trailing slash)
- [ ] **Verify Next.js config:** Ensure `trailingSlash` is set to `false` in `next.config.js`
- [ ] **Resubmit sitemap:** After fixing, resubmit to search engines

#### Priority

🟢 **Low** - This is a minor optimization issue, not a broken link.

---

### Error 3: Client-Side Rendering Failures

**URL:** `https://eslint.interlace.tools/docs/secure-coding/rules/no-exposed-sensitive-data`

**HTTP Response:**

```
HTTP/2 200 OK
```

✅ **BUT** the page fails to render with this error:

```
Application error: a client-side exception has occurred while loading eslint.interlace.tools
(see the browser console for more information).
```

#### Root Cause

**Mermaid Diagram Syntax Error** in the markdown source file:

**File**: `packages/eslint-plugin-secure-coding/docs/rules/no-exposed-sensitive-data.md`  
**Line 53-55**: Unquoted node labels containing special characters (parentheses)

**Broken Code:**

```mermaid
flowchart TD
    App[Application] -->|Log password| LogFile[📝 Log File / ELK / Splunk]  # ❌ Parentheses unquoted
    Attacker -->|Read Logs| Leak[🔓 Data Leak (CWE-532)]  # ❌ Parentheses unquoted
```

**Fix:**

```mermaid
flowchart TD
    App[Application] -->|Log password| LogFile["📝 Log File / ELK / Splunk"]  # ✅ Quoted
    Attacker -->|Read Logs| Leak["🔓 Data Leak (CWE-532)"]  # ✅ Quoted
```

**Why This Crashes the App:**

1. Mermaid v11.12.2 parser fails on unquoted special characters
2. Parser throws uncaught exception during diagram rendering
3. Exception bubbles up to React/Next.js hydration layer
4. Next.js error boundary catches it and shows "Application error" screen
5. Entire page becomes unusable (not just the diagram)

#### Impact Analysis

**User Impact:**

- 🔴 **Critical**: Page completely unusable (white screen with error message)
- 🔴 **SEO Impact**: Search engines may de-index pages with JavaScript errors
- 🔴 **Documentation Gap**: Users cannot access rule documentation

**Scope:**

- **Confirmed**: 1 rule page (`no-exposed-sensitive-data`)
- **Potentially Affected**: 50+ files contain Mermaid diagrams (found via `grep`)
- **Need Validation**: All Mermaid diagrams should be syntax-checked

#### Recommendations

- [x] **Immediate**: Fixed `no-exposed-sensitive-data.md` (quoted node labels) - **Deployment needed**
  - Local fix verified ✅
  - Live site still shows error (pending Vercel rebuild)
  - Fix will take effect after next deployment
- [ ] **Short-term**: Scan all 50+ Mermaid diagrams for syntax errors
- [ ] **Medium-term**: Add Mermaid syntax validation to CI/CD pipeline
- [ ] **Long-term**: Implement graceful error handling for Mermaid failures (don't crash entire page)

**Validation Script:**

````bash
# Find all files with Mermaid diagrams
find packages -name "*.md" -exec grep -l '```mermaid' {} \;

# Extract and validate each diagram (requires mermaid-cli)
npx mmdc --help  # Install: npm i -g @mermaid-js/mermaid-cli
````

#### Priority

🔴 **CRITICAL** - This completely breaks user access to documentation. HTTP 200 status masks the severity.

**Common Mermaid Syntax Issues to Check:**

1. **Unquoted parentheses** in node labels: `[Text (detail)]` → `["Text (detail)"]`
2. **Unquoted brackets** in node labels: `[Text [note]]` → `["Text [note]"]`
3. **Invalid arrows**: `-->>` vs `-->` (depends on diagram type)
4. **Missing semicolons** in some diagram types
5. **Invalid keywords** or typos in diagram declarations

---

## Verification Commands

You can reproduce these errors using:

```bash
# Test the 404 error
curl -I https://eslint.interlace.tools/articles

# Test the 308 redirect
curl -I https://eslint.interlace.tools/docs/

# Verify the corrected URL works
curl -I https://eslint.interlace.tools/docs
```

---

## Success Metrics

| Metric                        | Value  | Percentage  |
| ----------------------------- | ------ | ----------- |
| Total URLs Scanned            | 318    | 100%        |
| HTTP 200 Responses            | 316    | 99.37%      |
| **HTTP-Level Errors**         | **2**  | **0.63%**   |
| 404 Errors                    | 1      | 0.31%       |
| 308 Redirects                 | 1      | 0.31%       |
| **Client-Side Errors**        | **1+** | **Unknown** |
| Mermaid Syntax Errors (found) | 1      | N/A         |
| Mermaid Files (need checking) | 50+    | N/A         |

> ⚠️ **Note**: HTTP 200 does not guarantee page functionality. Client-side validation required for accurate error reporting.

---

## Next Steps

### Immediate Actions

1. ✅ **Fixed Client-Side Error**: Corrected Mermaid syntax in `no-exposed-sensitive-data.md`
2. **Scan Remaining Mermaid Diagrams**: Validate all 50+ files for syntax errors
3. **Fix the 404:** Decide on the fate of `/articles` (implement, redirect, or remove from sitemap)
4. **Fix the 308:** Update sitemap to use `/docs` without trailing slash

### Best Practices

- **Sitemap Hygiene:** Ensure all URLs in `sitemap.xml` return 200 status codes
- **Client-Side Validation:** HTTP checks alone are insufficient; use browser automation to detect runtime errors
- **Mermaid Diagram Validation:** Add `mermaid-cli` to CI/CD pipeline to validate diagram syntax
- **Automated Monitoring:** Consider adding a CI/CD check to validate all sitemap URLs (both HTTP and client-side)
- **Trailing Slash Consistency:** Standardize URL format across the entire site (with or without trailing slash)
- **Graceful Error Handling:** Implement error boundaries that don't crash the entire page for component failures

---

## Related Files

- Sitemap: `https://eslint.interlace.tools/sitemap.xml`
- Next.js Config: `/apps/docs/next.config.js` (presumed location)
- Documentation Root: `/apps/docs` (presumed location)

---

## Appendix: Full URL List

All 318 scanned URLs are available in the sitemap at:

```
https://eslint.interlace.tools/sitemap.xml
```

To extract the full list:

```bash
curl -s https://eslint.interlace.tools/sitemap.xml | \
  grep -o '<loc>[^<]*</loc>' | \
  sed 's/<loc>//g' | \
  sed 's/<\/loc>//g' | \
  sed 's|https://interlace-eslint.vercel.app|https://eslint.interlace.tools|g'
```

---

## Validation Scripts

### Validate All Mermaid Diagrams

````bash
# Find all Mermaid diagrams
find packages -name "*.md" -type f -exec grep -l '```mermaid' {} \; > /tmp/mermaid-files.txt
echo "Found $(wc -l < /tmp/mermaid-files.txt) files with Mermaid diagrams"

# Check for common syntax errors
while IFS= read -r file; do
  # Check for unquoted parentheses in node labels
  if sed -n '/```mermaid/,/```$/p' "$file" | grep -E '\[.*\(.*\).*\]' | grep -v '"'; then
    echo "⚠️  Potential syntax error in: $file"
    echo "   Found unquoted parentheses in node labels"
  fi
done < /tmp/mermaid-files.txt
````

### Browser-Based Validation

```bash
# Test a specific URL for client-side errors
# (Requires Playwright or similar)
npx playwright test --headed -g "no client-side errors"
```

### Add to CI/CD Pipeline

````yaml
# .github/workflows/validate-docs.yml
name: Validate Documentation

on: [push, pull_request]

jobs:
  validate-mermaid:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Mermaid Syntax
        run: |
          npm install -g @mermaid-js/mermaid-cli
          find packages -name "*.md" -exec grep -l '```mermaid' {} \; | while read file; do
            # Extract and validate each diagram
            echo "Validating: $file"
            # Add validation logic here
          done
````
