# Package README Structure Standard

This document defines the strict structure and content requirements for all ESLint plugin READMEs in the Interlace ecosystem. All generated READMEs must adhere to this template.

## Structure Overview

1.  **Logo & Header** (Centered)
2.  **Introduction** (Short, < 2 sentences, Centered)
3.  **Badges** (Centered, Standard Set)
4.  **Description** (Detailed overview)
5.  **Philosophy** (Standard "Interlace" block)
6.  **Getting Started** (Multi-language links + Installation)
7.  **Custom Sections** (Feature highlights, e.g., "What You Get", "OWASP Coverage")
8.  **Configuration Presets** (Optional, concise table)
9.  **Supported Libraries / Framework Context** (Optional, list of supported libs)
10. **AI-Optimized Messages** (Example of structured error output)
11. **Rules** (Single unified table)
12. **Related Plugins** (Ecosystem table with badges)
13. **License**
14. **Footer Image** (High-quality OG image, centered)

---

## Detailed Requirements

### 1. Logo & Header

- **Content**: The Interlace logo linked to `https://eslint.interlace.tools`.
- **Format**:
  ```markdown
  <p align="center">
    <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
  </p>
  ```
- **Constraint**: **Do NOT** include an H1 title (`# Title`). The logo serves as the visual anchor.

### 2. Introduction

- **Content**: A concise 1-2 sentence summary of what the plugin does.
- **Constraints**:
  - Must be wrapped in `<p align="center">`.
  - No headers.

### 3. Badges

- **Content**: Standard set including NPM Version, Downloads, License, Codecov, and Current Date/Release badge.
- **Constraints**:
  - All centered in one paragraph.
  - Consistent style (shields.io).

### 4. Description

- **Content**: Detailed explanation of the plugin's purpose and capabilities.
- **Goal**: 3-4 sentences highlighting "what's in it for you" (value proposition).
- **Source**: Preserves manual edits found in existing `## Description` sections. If none, falls back to the short introduction (but should be expanded).

### 5. Philosophy

- **Content**: Standard "Interlace" philosophy text emphasizing education over gatekeeping.
- **Constraint**: Identical across all plugins.

### 6. Getting Started

- **Content**:
  - Links to the official documentation site (`eslint.interlace.tools`) in English, Chinese, Korean, and Japanese.
  - A standardized `npm install` command block.
- **Format**:

  ````markdown
  ## Getting Started

  - To check out the [guide](https://eslint.interlace.tools/docs/PLUGIN), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
  - ... (multi-lang variants)

  ```bash
  npm install eslint-plugin-name --save-dev
  ```
  ````

  ```

  ```

### 7. Custom Sections (Feature Highlights)

- **Examples**: `## 💡 What You Get`, `## 🔐 OWASP Top 10 Coverage`.
- **Constraint**: These sections are preserved from existing READMEs to allow for plugin-specific value propositions.

### 8. Configuration Presets (Optional)

- **Constraint**: Keep it concise. A small table with `Preset` and `Description`.

### 9. Supported Libraries (Optional)

- **Content**: For framework-specific plugins (e.g., JWT, Crypto), list the libraries or packages explicitly supported (e.g., `jsonwebtoken`, `jose`).
- **Constraint**: Helps SEO and user confirmation of compatibility.

### 10. AI-Optimized Messages

- **Content**: An example block showing the structured error format (CWE, OWASP, Fix, Link).
- **Goal**: Demonstrate the value for AI assistants (Copilot, Cursor).
- **Placement**: Lower section, before Rules.

### 11. Rules Table

- **Structure**: Single unified table. **No sub-tables** or splitting by tag.
- **Columns**: `Rule`, `CWE`, `OWASP`, `CVSS`, `Description`, `Configs` (Icons: 💼, ⚠️, 🔧, 💡, 🚫).
- **Constraints**:
  - **Rule Name**: Must be a link to the official documentation: `[rule-name](https://eslint.interlace.tools/docs/PLUGIN/rules/rule-name)`.
  - **No Tag Column**: Categorization is handled by metadata (CWE/OWASP).
  - **Clean Data**: **No** header artifacts (rows named "Rule" or "Plugin").

### 12. Related Plugins

- **Content**: Table of other plugins in the ecosystem.
- **Columns**: `Plugin`, `NPM` (Badge), `Downloads` (Badge), `License` (Badge), `Description`.
- **Constraint**: Provides trust signals and cross-promotion.

### 13. License

- **Content**: Standard MIT License text.

### 14. Footer Image

- **Content**: High-quality Open Graph image specific to the plugin.
- **Format**:
  ```markdown
  <p align="center">
    <a href="https://eslint.interlace.tools/docs/PLUGIN"><img src="https://eslint.interlace.tools/images/og-PLUGIN.png" alt="ESLint Interlace Plugin" width="100%" /></a>
  </p>
  ```
- **Constraint**: If the image does not exist, it must be generated or provided. Width set to `100%`.

---

## Exclusions (Do NOT Include)

- **Security Research Coverage**: Do NOT include dedicated sections for specific CVEs or research papers unless critical. (Dropped 2026-01-11).
- **References**: Do NOT list raw reference links; these belong in the official documentation site. Users should be directed to the docs for deep dives.
- **Rule Details**: **No** verbose rule descriptions or code examples in the README. Keep it high-level.

## Maintenance

- This structure is enforced by `tools/scripts/fix-readmes.js`.
- Always update this document if the standardization script logic changes.
