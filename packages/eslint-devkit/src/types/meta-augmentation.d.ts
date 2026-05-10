/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Module augmentation — extends `@typescript-eslint/utils` `RuleMetaDataDocs`
 * with the Interlace-specific fields the whole-run formatter
 * (`@interlace/eslint-formatter`) renders inline:
 *
 *   meta.docs.cwe   — CWE identifier (e.g. "CWE-89") rendered as a prefix
 *                     in human + compact + JSON + NDJSON modes.
 *   meta.docs.cvss  — CVSS 3.1 score (0–10) rendered alongside CWE in
 *                     human + JSON + NDJSON.
 *
 * ESLint accepts arbitrary additional properties on `meta.docs` at
 * runtime; this declaration adds the type-system half so plugin authors
 * can populate the fields without per-rule `@ts-expect-error`.
 *
 * Importing this module (e.g. via `@interlace/eslint-devkit`'s root
 * export, which it does) is enough to activate the augmentation
 * project-wide.
 */
declare module '@typescript-eslint/utils/ts-eslint' {
    interface RuleMetaDataDocs {
        /** CWE identifier (e.g. "CWE-89"). Rendered inline by @interlace/eslint-formatter. */
        cwe?: string;
        /** CVSS 3.1 score, 0–10 inclusive. Rendered alongside CWE. */
        cvss?: number;
        /** Free-text rationale for the CWE mapping; surfaces in audit reports. */
        cweJustification?: string;
        /**
         * Per-rule confidence band — read by the ILB-Confidence bench (`npm run
         * ilb:confidence`) and used as the agent-axis routing signal:
         *   `high`   → SLO precision ≥ 90%; agents may auto-apply fixes.
         *   `medium` → SLO precision 70–90%; agents should surface for review.
         *   `low`    → SLO precision 50–70%; agents should escalate to a human.
         * Calibration (declared vs empirical precision) is computed by the
         * bench's reliability diagram. SLO: |empirical − target| ≤ 0.05.
         */
        confidence?: 'high' | 'medium' | 'low';
    }
}
export {};
