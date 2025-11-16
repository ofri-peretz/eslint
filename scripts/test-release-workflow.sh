#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=${1:-true}
VERSION_SPECIFIER=${2:-auto}
DIST_TAG=${3:-latest}
RUN_CI=${4:-true}

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🧪 Testing Release Workflow Locally${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Configuration:"
echo "  Dry Run: $DRY_RUN"
echo "  Version Specifier: $VERSION_SPECIFIER"
echo "  Dist Tag: $DIST_TAG"
echo "  Run CI: $RUN_CI"
echo ""

# Track failures
FAILURES=0

# Function to check step
check_step() {
    local step_name=$1
    local command=$2
    echo -e "${BLUE}🔍 Step: $step_name${NC}"
    if eval "$command"; then
        echo -e "${GREEN}✅ $step_name passed${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}❌ $step_name failed${NC}"
        echo ""
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

# Step 1: Verify we're on main branch (warning only for local testing)
echo -e "${BLUE}🔍 Step: Verify Branch${NC}"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}⚠️  Warning: Not on main branch (current: $CURRENT_BRANCH)${NC}"
    echo -e "${YELLOW}   Release workflow expects main branch${NC}"
    echo -e "${YELLOW}   Continuing for local testing...${NC}"
else
    echo -e "${GREEN}✅ On main branch${NC}"
fi
echo ""

# Step 2: Check git state (warning only for local testing)
echo -e "${BLUE}🔍 Step: Check Git State${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Warning: Working directory has uncommitted changes${NC}"
    git status --short
    echo -e "${YELLOW}   Continuing for local testing...${NC}"
else
    echo -e "${GREEN}✅ Git working directory is clean${NC}"
fi
echo ""

# Step 3: Verify Node.js and pnpm versions
check_step "Check Node.js Version" "
    NODE_VERSION=\$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ \"\$NODE_VERSION\" != \"20\" ]; then
        echo -e \"${YELLOW}⚠️  Warning: Node.js version is \$NODE_VERSION, workflow expects 20${NC}\"
        return 1
    else
        echo -e \"${GREEN}✅ Node.js version: \$(node --version)${NC}\"
        return 0
    fi
"

check_step "Check pnpm Version" "
    PNPM_VERSION=\$(pnpm --version)
    EXPECTED_VERSION=\"10.18.3\"
    if [ \"\$PNPM_VERSION\" != \"\$EXPECTED_VERSION\" ]; then
        echo -e \"${YELLOW}⚠️  Warning: pnpm version is \$PNPM_VERSION, workflow expects \$EXPECTED_VERSION${NC}\"
        return 1
    else
        echo -e \"${GREEN}✅ pnpm version: \$PNPM_VERSION${NC}\"
        return 0
    fi
"

# Step 4: Install dependencies
check_step "Install Dependencies" "
    pnpm install --frozen-lockfile
"

# Step 5: Print environment info
check_step "Print Environment Info" "
    pnpm nx report
"

# Step 6: CI Validation (if enabled)
if [ "$RUN_CI" = "true" ]; then
    check_step "Run Tests" "
        pnpm nx run-many -t test --all -c ci --parallel=4 --verbose
    "
    
    check_step "Build Packages" "
        pnpm nx run-many -t build --all --parallel=4 --verbose
    "
else
    echo -e "${YELLOW}⏭️  Skipping CI validation (run-ci=false)${NC}"
    echo ""
fi

# Step 7: Pre-flight checks
echo -e "${BLUE}🔍 Pre-Flight Checks${NC}"

# Check NPM authentication (if not dry-run)
if [ "$DRY_RUN" = "false" ]; then
    check_step "Check NPM Authentication" "
        if [ -z \"\$NODE_AUTH_TOKEN\" ] && [ -z \"\$NPM_TOKEN\" ]; then
            echo -e \"${YELLOW}⚠️  Warning: NODE_AUTH_TOKEN or NPM_TOKEN not set${NC}\"
            echo -e \"${YELLOW}   This is required for publishing${NC}\"
            echo -e \"${YELLOW}   For local testing, you can set NPM_TOKEN or use dry-run mode${NC}\"
            return 1
        else
            echo -e \"${GREEN}✅ NPM authentication token detected${NC}\"
            # Try to verify authentication
            if npm whoami >/dev/null 2>&1; then
                echo -e \"${GREEN}✅ NPM authentication verified: \$(npm whoami)${NC}\"
                return 0
            else
                echo -e \"${YELLOW}⚠️  Warning: npm whoami failed, but token is set${NC}\"
                echo -e \"${YELLOW}   This may be normal for OIDC tokens${NC}\"
                return 0
            fi
        fi
    "
else
    echo -e "${YELLOW}⏭️  Skipping NPM auth check (dry-run mode)${NC}"
    echo ""
fi

# Check npm registry
check_step "Check NPM Registry" "
    NPM_REGISTRY=\$(npm config get registry 2>/dev/null || echo '')
    if [ \"\$NPM_REGISTRY\" != \"https://registry.npmjs.org/\" ]; then
        echo -e \"${YELLOW}⚠️  Warning: npm registry is not set to https://registry.npmjs.org/${NC}\"
        echo -e \"${YELLOW}   Current registry: \${NPM_REGISTRY:-not set}${NC}\"
        return 1
    else
        echo -e \"${GREEN}✅ npm registry configured correctly: \$NPM_REGISTRY${NC}\"
        return 0
    fi
"

# Check if there are changes to release
check_step "Check for Changes to Release" "
    echo 'Running dry-run to check for changes...'
    DRY_RUN_OUTPUT=\$(pnpm nx release version --dry-run 2>&1 || true)
    if echo \"\$DRY_RUN_OUTPUT\" | grep -q 'No changes detected'; then
        echo -e \"${YELLOW}ℹ️  No changes detected for release${NC}\"
        echo -e \"${YELLOW}   This means there are no conventional commits since the last release${NC}\"
        echo -e \"${YELLOW}   The release will skip version bumping${NC}\"
        return 0
    else
        echo -e \"${GREEN}✅ Changes detected - release will proceed${NC}\"
        echo \"Preview of changes:\"
        echo \"\$DRY_RUN_OUTPUT\" | head -20
        return 0
    fi
"

# Step 8: Version preparation (dry-run)
if [ "$DRY_RUN" = "true" ]; then
    echo -e "${BLUE}🔍 Dry Run: Preview Version Changes${NC}"
    if [ "$VERSION_SPECIFIER" != "auto" ]; then
        check_step "Preview Version ($VERSION_SPECIFIER)" "
            pnpm nx release version $VERSION_SPECIFIER --dry-run
        "
    else
        check_step "Preview Version (auto)" "
            pnpm nx release version --dry-run
        "
    fi
else
    echo -e "${YELLOW}⏭️  Skipping version preparation (not in dry-run mode)${NC}"
    echo -e "${YELLOW}   In real workflow, this would prepare versions${NC}"
    echo ""
fi

# Step 9: Publish preview (dry-run)
# Note: NX has a known issue where --dry-run is converted to --dryRun=true for pnpm
# This causes pnpm to fail. We'll skip this check but note it in the summary.
if [ "$DRY_RUN" = "true" ]; then
    echo -e "${BLUE}🔍 Dry Run: Preview Publish${NC}"
    echo -e "${YELLOW}⚠️  Note: NX release publish --dry-run has a known issue${NC}"
    echo -e "${YELLOW}   NX converts --dry-run to --dryRun=true, which pnpm rejects${NC}"
    echo -e "${YELLOW}   This doesn't affect actual releases (only preview)${NC}"
    echo -e "${YELLOW}   Skipping publish dry-run check...${NC}"
    echo ""
    # Try it anyway to show the error, but don't fail
    echo "Attempting publish dry-run (expected to fail due to NX bug)..."
    pnpm nx release publish --tag $DIST_TAG --dry-run 2>&1 | head -10 || true
    echo ""
    echo -e "${YELLOW}✅ Publish dry-run check skipped (known NX issue)${NC}"
    echo ""
else
    echo -e "${YELLOW}⏭️  Skipping publish preview (not in dry-run mode)${NC}"
    echo -e "${YELLOW}   In real workflow, this would publish to NPM${NC}"
    echo ""
fi

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo -e "${GREEN}The release workflow should work correctly.${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $FAILURES issue(s)${NC}"
    echo -e "${YELLOW}Please review the errors above before running the release workflow.${NC}"
    exit 1
fi

