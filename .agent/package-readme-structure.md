# Package README Structure Standard

This document defines the strict structure and content requirements for all ESLint plugin READMEs in the Interlace ecosystem. All generated READMEs must adhere to this template.

## Structure Overview

1.  **Logo & Header** (Centered)
2.  **Introduction** (Short, < 2 sentences, Centered)
3.  **Badges** (Centered, Standard Set)
4.  **Description** (Detailed overview)
5.  **Philosophy** (Standard "Interlace" block)
6.  **Getting Started** (Multi-language links + Installation)
7.  **Custom Sections** (Feature highlights, Examples)
8.  **AI-Optimized Messages** (Message format)
9.  **Rules** (Unified table, Security or Pattern variant)
10. **Compatibility Matrix** (If applicable, below Rules)
11. **Configuration Presets** (Optional, concise table)
12. **Supported Libraries / Framework Context** (Optional)
13. **Related Plugins** (Ecosystem table with badges)
14. **License**
15. **Footer Image** (High-quality OG image, centered, MUST be at the end)

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
- **Goal**: Descriptions should include at least 3 sentences and up to 5. They can not include only 1 sentence. Highlight "what's in it for you" (value proposition).
- **Source**: Preserves manual edits found in existing `## Description` sections. If none, falls back to the short introduction (but should be expanded).

### 5. Philosophy

- **Content**: Standard "Interlace" philosophy text emphasizing education over gatekeeping.
- **Constraint**: Identical across all plugins.
- **Required Format**:

  ```markdown
  ## Philosophy

  **Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.
  ```

### 6. Getting Started

- **Content**:
  - Links to the official documentation site (`eslint.interlace.tools`) in English, Chinese, Korean, Japanese, Spanish, and Arabic.
  - A standardized `npm install` command block.
- **Format**:

  ````markdown
  ## Getting Started

  - To check out the [guide](https://eslint.interlace.tools/docs/PLUGIN), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
  - 要查看中文 [指南](https://eslint.interlace.tools/docs/PLUGIN), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
  - [가이드](https://eslint.interlace.tools/docs/PLUGIN) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
  - [ガイド](https://eslint.interlace.tools/docs/PLUGIN)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
  - Para ver la [guía](https://eslint.interlace.tools/docs/PLUGIN), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
  - للاطلاع على [الدليل](https://eslint.interlace.tools/docs/PLUGIN)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

  ```bash
  npm install eslint-plugin-name --save-dev
  ```
  ````

### 7. Custom Sections (Examples / Highlights)

- **Examples**: `## 💡 What You Get`, `## ⚡ Performance`, `## 🧠 How It Works`.
- **Constraint**: Feature highlights and examples of the plugin's capabilities.
- **Placement**: Depends on content type (Features = High, FAQ = Low). See 8.5.

### 8. AI-Optimized Messages (Message Format)

- **Content**: An example block showing the structured error format (CWE, OWASP, Fix, Link) or Smart Fix suggestions.
- **Goal**: Demonstrate the value for AI assistants (Copilot, Cursor).
- **Requirement**: Must include a brief, 1-2 sentence explanation **below** the code block detailing _why_ this format is optimized.
  - **Key Points to Cover**: Explain that providing structured context (CWE, OWASP, Fix suggestions) allows AI tools to "reason" about the error and suggest the correct fix immediately, rather than hallucinating or guessing.
- **Placement**: Before Rules.

### 8.5. Custom Sections (FAQ / Highlights)

- **Examples**: `## 🙋 FAQ`, `## 💡 Features`.
- **Constraint**: Must be placed **BELOW** the Rules table to prioritize core information.

### 9. Rules Table

- **Structure**: Single unified table. **No sub-tables** or splitting by tag.
- **Constraint**: Rule Name must be a link to official documentation.
- **Header Artifacts**: Exclude rows that are just category headers.

**Variant A: Security Plugins (Default)**

- **Columns**: `Rule`, `CWE`, `OWASP`, `CVSS`, `Description`, `Configs` (Icons: 💼, ⚠️, 🔧, 💡, 🚫).

**Variant B: Architecture / Non-Security Plugins**

- **Columns**: `Rule`, `Pattern/Concept`, `Description`, `Configs`.
- **Logic**: Use "Pattern/Concept" instead of security metrics. This maps to the architectural domain or rule category (e.g., "Style Guide", "Module Systems").

### 10. Compatibility Matrix (Optional)

- **Content**: If valid, a matrix showing compatibility with replaced plugins (e.g., `eslint-plugin-import`).
- **Placement**: **Below** the Rules table.
- **Format**:

  ```markdown
  ## 📦 Compatibility

  | Package       | Version                                                                                                             |
  | :------------ | :------------------------------------------------------------------------------------------------------------------ |
  | `plugin-name` | [![npm](https://img.shields.io/npm/v/plugin-name.svg?style=flat-square)](https://www.npmjs.com/package/plugin-name) |
  | `node`        | ^18.18.0                                                                                                            |
  ```

### 11. Configuration Presets (Optional)

- **Constraint**: Strict 2-column table: `Preset` and `Description`.
- **Source**: `src/index.ts` configs export.
- **Format**:

  ```markdown
  ## ⚙️ Configuration Presets

  | Preset        | Description                                                 |
  | :------------ | :---------------------------------------------------------- |
  | `recommended` | Balanced security profile for most applications.            |
  | `strict`      | Maximum security settings (may require more configuration). |
  ```

### 11.5. Config vs. Rules Validation

- **Requirement**: You MUST verify that the icons in the `Rules` table (step 9) exactly match the exported configuration.
  - Open the plugin's config file (e.g., `src/configs/recommended.ts` or `src/index.ts`).
  - Verify that every rule enabled in `recommended` has the 💼 icon.
  - Verify that every rule set to "warn" has the ⚠️ icon.
    This ensures the README is a source of truth.

  ```

  ```

### 12. Supported Libraries (Optional)

- **Content**: List of supported libraries for framework-specific plugins.
- **Columns**: `Library`, `npm` (Version Badge), `Downloads` (Badge), `Detection` (What is covered).
- **Format**:

  ```markdown
  ## 📚 Supported Libraries

  | Library | npm                | Downloads                | Detection             |
  | ------- | ------------------ | ------------------------ | --------------------- |
  | `lib`   | [![npm](...)](...) | [![downloads](...)](...) | Signing, Verification |
  ```

### 13. Related Plugins

- **Content**: Table of other plugins in the ecosystem.
- **Columns**: `Plugin`, `NPM` (Badge), `Downloads` (Badge), `License` (Badge), `Description`.

### 14. License

- **Content**: Standard MIT License text.

### 15. Footer Image

- **Content**: High-quality Open Graph image specific to the plugin.
- **Format**:
  ```markdown
  <p align="center">
    <a href="https://eslint.interlace.tools/docs/PLUGIN"><img src="https://eslint.interlace.tools/images/og-PLUGIN.png" alt="ESLint Interlace Plugin" width="100%" /></a>
  </p>
  ```
- **Constraint**: Width set to `300` (mandatory).
- **Placement**: MUST be the very last element in the README.

---

## Exclusions (Do NOT Include)

- **Security Research Coverage**: Do NOT include dedicated sections for specific CVEs or research papers unless critical. (Dropped 2026-01-11).
- **References**: Do NOT list raw reference links; these belong in the official documentation site. Users should be directed to the docs for deep dives.
- **Rule Details**: **No** verbose rule descriptions or code examples in the README. Keep it high-level.

## Governed Documents

This standard applies to the following 16 plugins:

- `packages/eslint-plugin-architecture/README.md`
- `packages/eslint-plugin-browser-security/README.md`
- `packages/eslint-plugin-crypto/README.md`
- `packages/eslint-plugin-express-security/README.md`
- `packages/eslint-plugin-import-next/README.md`
- `packages/eslint-plugin-jwt/README.md`
- `packages/eslint-plugin-lambda-security/README.md`
- `packages/eslint-plugin-mongodb-security/README.md`
- `packages/eslint-plugin-nestjs-security/README.md`
- `packages/eslint-plugin-pg/README.md`
- `packages/eslint-plugin-quality/README.md`
- `packages/eslint-plugin-react-a11y/README.md`
- `packages/eslint-plugin-react-features/README.md`
- `packages/eslint-plugin-secure-coding/README.md`
- `packages/eslint-plugin-vercel-ai-security/README.md`
- `packages/eslint-devkit/README.md` (Partial applicability)

## Maintenance

- This structure is enforced by `tools/scripts/fix-readmes.js`.
- Always update this document if the standardization script logic changes.
