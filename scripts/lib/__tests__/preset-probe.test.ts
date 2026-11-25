import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import markdown from '@eslint/markdown';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../../../packages/eslint-plugin-conventions/src/index';
import {
  languagesSupported,
  presetBlocks,
  probeConfig,
  usesLanguage,
} from '../preset-probe';

const ROOT = resolve(import.meta.dirname, '../../..');

describe('preset-probe', () => {
  it('registers @eslint/markdown for a Markdown-language preset, and the probe resolves', async () => {
    const overrideConfig = probeConfig(configs.guidance, markdown);
    expect(overrideConfig).toContainEqual({ plugins: { markdown } });
    const eslint = new ESLint({ overrideConfigFile: true, overrideConfig });
    const [result] = await eslint.lintText('const _x = 1;\n', {
      filePath: 'probe.tsx',
    });
    expect(result?.messages.filter((m) => m.ruleId === null)).toEqual([]);
  });

  it('adds nothing for a JS preset and strips the preset’s own files and ignores', () => {
    const preset = { files: ['**/*.ts'], ignores: ['x'], rules: {} };
    expect(probeConfig(preset, markdown)).toEqual([
      { files: ['**/*.{js,jsx,ts,tsx,cjs,mjs}'] },
      { rules: {} },
    ]);
  });

  it('marks a language preset as unprobeable under ESLint 8 only', () => {
    expect(usesLanguage(presetBlocks(configs.guidance))).toBe(true);
    expect(usesLanguage(presetBlocks(configs.recommended))).toBe(false);
    expect(languagesSupported(8)).toBe(false);
    expect(languagesSupported(9)).toBe(true);
  });

  it('is what the release gate on dist/ probes with, so it cannot drift from the source lock', () => {
    const gate = readFileSync(
      resolve(ROOT, 'scripts/verify-dist-integrity.ts'),
      'utf8',
    );
    expect(gate).toMatch(/probeConfig\(config, markdown\)/);
    expect(gate).toMatch(/languagesSupported\(eslintMajor\)/);
  });
});
