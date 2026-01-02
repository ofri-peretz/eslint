#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# GitHub Labels Sync Script
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script creates/updates GitHub labels for SDK compatibility tracking.
# Requires: GitHub CLI (gh) authenticated
#
# Usage:
#   ./scripts/sync-labels.sh
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "🏷️  Syncing GitHub Labels for SDK Compatibility..."

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub CLI is not authenticated. Run: gh auth login"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# SDK COMPATIBILITY LABELS
# ═══════════════════════════════════════════════════════════════════════════════

echo "📦 Creating SDK compatibility labels..."

# Core labels
gh label create "sdk-compatibility" --color "0E8A16" --description "SDK interface compatibility testing" --force 2>/dev/null || true
gh label create "breaking-change" --color "D93F0B" --description "Breaking change detected in upstream SDK" --force 2>/dev/null || true
gh label create "maintenance" --color "FBCA04" --description "Repository maintenance and infrastructure" --force 2>/dev/null || true

# Technology-specific labels
echo "🔧 Creating technology-specific labels..."

gh label create "pg" --color "336791" --description "PostgreSQL / node-postgres (pg) related" --force 2>/dev/null || true
gh label create "jwt" --color "000000" --description "JWT ecosystem (jsonwebtoken, jose, etc.)" --force 2>/dev/null || true
gh label create "express" --color "000000" --description "Express.js ecosystem" --force 2>/dev/null || true
gh label create "vercel-ai" --color "000000" --description "Vercel AI SDK" --force 2>/dev/null || true
gh label create "nestjs" --color "E0234E" --description "NestJS framework" --force 2>/dev/null || true
gh label create "lambda" --color "FF9900" --description "AWS Lambda / Middy" --force 2>/dev/null || true
gh label create "mongodb" --color "47A248" --description "MongoDB / Mongoose" --force 2>/dev/null || true
gh label create "crypto" --color "5E35B1" --description "Cryptography related" --force 2>/dev/null || true
gh label create "browser-security" --color "1976D2" --description "Browser security related" --force 2>/dev/null || true

echo "✅ Labels synced successfully!"
echo ""
echo "Labels created:"
gh label list --limit 20 | grep -E "(sdk-compatibility|breaking-change|pg|jwt|express|vercel-ai|nestjs|lambda|mongodb)"
