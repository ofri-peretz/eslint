#!/bin/bash

# Security plugins to generate documentation for
declare -A PLUGINS=(
  ["browser-security"]="45:Browser security rules for XSS, CSRF, CSP, and client-side vulnerabilities."
  ["express-security"]="10:Express.js security rules for middleware, CORS, and API protection."
  ["jwt"]="13:JWT security rules for token validation, algorithm safety, and claims verification."
  ["lambda-security"]="14:AWS Lambda security rules for serverless functions."
  ["mongodb-security"]="16:MongoDB security rules for NoSQL injection and query safety."
  ["nestjs-security"]="6:NestJS security rules for guards, validation, and throttling."
  ["node-security"]="31:Node.js security rules for crypto, file access, and dependencies."
  ["vercel-ai-security"]="19:Vercel AI SDK security rules for prompt injection and AI safety."
  ["crypto"]="11:Cryptography security rules for secure encryption practices."
  ["pg"]="13:PostgreSQL security rules for SQL injection and connection safety."
  ["react-a11y"]="36:React accessibility rules for WCAG compliance."
  ["react-features"]="51:React best practices and feature rules."
)

# Icons for each plugin
declare -A ICONS=(
  ["browser-security"]="Globe"
  ["express-security"]="Server"
  ["jwt"]="Key"
  ["lambda-security"]="Cloud"
  ["mongodb-security"]="Database"
  ["nestjs-security"]="Shield"
  ["node-security"]="Terminal"
  ["vercel-ai-security"]="Bot"
  ["crypto"]="Lock"
  ["pg"]="Database"
  ["react-a11y"]="Accessibility"
  ["react-features"]="Puzzle"
)

DOCS_DIR="apps/docs/content/docs/security"

for PLUGIN in "${!PLUGINS[@]}"; do
  IFS=':' read -r RULE_COUNT DESCRIPTION <<< "${PLUGINS[$PLUGIN]}"
  ICON="${ICONS[$PLUGIN]}"
  PLUGIN_DIR="$DOCS_DIR/plugin-$PLUGIN"
  
  echo "Generating $PLUGIN ($RULE_COUNT rules)..."
  
  # Create meta.json
  cat > "$PLUGIN_DIR/meta.json" << EOF
{
    "title": "$PLUGIN",
    "icon": "$ICON",
    "defaultOpen": false
}
EOF

  # Create index.mdx (Overview)
  cat > "$PLUGIN_DIR/index.mdx" << EOF
---
title: Overview
description: $DESCRIPTION
icon: $ICON
---

import { RemoteReadme } from '@/components/docs/remote-readme';

<Callout type="info" title="Live from GitHub">
  This content is fetched directly from the plugin's README on GitHub.
</Callout>

<RemoteReadme plugin="$PLUGIN" />

---

## Quick Navigation

<Cards>
  <Card
    title="Changelog"
    description="View release history and updates"
    href="/docs/security/plugin-$PLUGIN/changelog"
    icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
  />
  <Card
    title="Rules"
    description="Browse all $RULE_COUNT available rules"
    href="/docs/security/plugin-$PLUGIN/rules"
    icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
  />
</Cards>
EOF

  # Create changelog.mdx
  cat > "$PLUGIN_DIR/changelog.mdx" << EOF
---
title: Changelog
description: Release history for eslint-plugin-$PLUGIN
icon: History
---

import { RemoteChangelog } from '@/components/docs/remote-changelog';

<Callout type="info" title="Live from GitHub">
  This changelog is fetched directly from GitHub releases.
</Callout>

<RemoteChangelog plugin="$PLUGIN" />
EOF

  # Create rules/meta.json
  cat > "$PLUGIN_DIR/rules/meta.json" << EOF
{
    "title": "Rules",
    "icon": "BookOpen",
    "defaultOpen": false
}
EOF

  # Create rules/index.mdx
  cat > "$PLUGIN_DIR/rules/index.mdx" << EOF
---
title: Rules
description: All ESLint rules provided by eslint-plugin-$PLUGIN
icon: BookOpen
---

import { RulesTable } from '@/components/docs/rules-table';

<Callout type="info" title="$RULE_COUNT Rules Available">
  $DESCRIPTION
</Callout>

## All Rules

<RulesTable plugin="$PLUGIN" showLinks />
EOF

  # Generate individual rule files
  RULES_SRC_DIR="packages/eslint-plugin-$PLUGIN/docs/rules"
  if [ -d "$RULES_SRC_DIR" ]; then
    for RULE_FILE in "$RULES_SRC_DIR"/*.md; do
      if [ -f "$RULE_FILE" ]; then
        RULE_NAME=$(basename "$RULE_FILE" .md)
        cat > "$PLUGIN_DIR/rules/$RULE_NAME.mdx" << EOF
---
title: $RULE_NAME
description: ESLint rule documentation for $RULE_NAME
icon: FileCode
---

import { RemoteRuleDoc } from '@/components/docs/remote-rule-doc';

<RemoteRuleDoc plugin="$PLUGIN" rule="$RULE_NAME" />
EOF
      fi
    done
  fi
  
  echo "  Created $(ls -1 "$PLUGIN_DIR/rules"/*.mdx 2>/dev/null | wc -l) rule files"
done

echo "Done! Generated documentation for ${#PLUGINS[@]} plugins"
