/**
 * Plugin Template Conformance — eslint variant.
 *
 * Asserts every plugin folder under `quality/` and `security/` ships the
 * canonical page set. eslint's per-plugin contract is a subset of the
 * cross-product template (eslint plugins don't have install / configuration /
 * migration / benchmark / FAQ pages today — those are coming as we publish
 * scorecards per plugin).
 *
 * The required list below is the **eslint-specific minimum**. As pages fill
 * in across plugins, add them here to ratchet the contract upward.
 */

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import {
  validatePluginTemplateConformance,
  type RequiredPage,
} from '#interlace/validators/plugin-template-conformance';

const ESLINT_REQUIRED_PAGES: RequiredPage[] = [
  { file: 'index.mdx', required: true, rationale: 'Plugin landing page.' },
  { file: 'changelog.mdx', required: true, rationale: 'Release history.' },
  { file: 'meta.json', required: true, rationale: 'Sidebar nav for the plugin folder.' },
];

describe('plugin template conformance (eslint pillars)', () => {
  it('every plugin under quality/ + security/ ships the eslint-required pages', async () => {
    const findings = await validatePluginTemplateConformance({
      pillarRoots: [
        resolve(__dirname, '..', '..', 'content', 'docs', 'quality'),
        resolve(__dirname, '..', '..', 'content', 'docs', 'security'),
      ],
      pluginPrefix: 'plugin-',
      requiredPages: ESLINT_REQUIRED_PAGES,
    });

    if (findings.length > 0) {
      console.error('Plugin template conformance issues:', findings);
    }
    expect(findings).toEqual([]);
  });
});
