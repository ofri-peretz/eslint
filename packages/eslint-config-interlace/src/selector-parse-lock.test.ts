/**
 * Cross-plugin runtime lock — every aggregated plugin preset must lint a real
 * file without crashing the ESLint engine.
 *
 * Why this exists: eslint-plugin-lambda-security@1.2.3 shipped a comma-joined
 * function-exit listener key —
 *
 *   'ArrowFunctionExpression:exit, FunctionExpression:exit, FunctionDeclaration:exit'
 *
 * ESLint strips only a *trailing* `:exit` before handing a selector to esquery,
 * so the earlier `:exit` tokens reached esquery and threw
 * `Error: Unknown class name: exit` on EVERY linted file — aborting the whole
 * run the moment the preset was enabled. It shipped because the structural
 * locks (index.test.ts) only inspect config *shape*; they never boot ESLint.
 *
 * This file boots the real engine against the full aggregated surface so the
 * same bug class — a comma-joined `:exit`, a `${x}:exit` template key, or any
 * other esquery-unparseable selector — fails here, in CI, for ANY of the 19
 * plugins, instead of in a consumer's editor. Plugins are linted individually
 * so a regression names the offending plugin.
 */

import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import type { Linter } from 'eslint';
import type { TSESLint } from '@interlace/eslint-devkit';

import presets, { recommended } from './index';

type FlatConfig = TSESLint.FlatConfig.Config;

// Plain ES-module syntax — no TS, no JSX — so it parses under the default
// parser and the rules' listeners (and therefore their selectors) actually get
// registered. The crash is at listener-registration time, so a violation-free
// file is enough to trigger it.
const PROBE = `export const handler = async (event, context) => {
  function compute(x) {
    return x * 2;
  }
  const run = function (y) {
    return compute(y);
  };
  const id = event && event.id;
  if (!id) return { ok: false };
  return { ok: true, id, total: run(id), ctx: context && context.awsRequestId };
};
`;

const pluginKeyOf = (config: FlatConfig): string =>
  Object.keys(config.plugins ?? {})[0] ?? 'unknown';

// Resolves — possibly WITH lint messages, which is fine — unless a rule
// registers an esquery-unparseable selector, in which case `lintText` REJECTS
// at listener setup. `.resolves` is therefore the precise inverse of the crash.
const lintProbe = (config: readonly FlatConfig[]) =>
  new ESLint({
    overrideConfigFile: true,
    overrideConfig: config as Linter.Config[],
  }).lintText(PROBE, { filePath: 'probe.mjs' });

describe('cross-plugin selector-parse lock', () => {
  it('the probe is valid module JS (otherwise the per-plugin checks pass vacuously)', async () => {
    const results = await lintProbe([]);
    expect(results).toHaveLength(1);
    expect(results[0]!.messages.filter((m) => m.fatal)).toEqual([]);
  });

  // Each of the 19 aggregated plugins on its own — a crash names the plugin.
  for (const config of recommended) {
    it(`'${pluginKeyOf(config)}' recommended config lints a real file without an esquery selector crash`, async () => {
      await expect(lintProbe([config])).resolves.toBeDefined();
    });
  }

  // Every composed preset, including the full 19-plugin `recommended` (catches
  // any cross-config interaction) and the flagship / componentApi selections.
  for (const [name, preset] of Object.entries(presets) as [
    string,
    readonly FlatConfig[],
  ][]) {
    it(`'${name}' preset lints a real file without an esquery selector crash`, async () => {
      await expect(lintProbe(preset)).resolves.toBeDefined();
    });
  }
});
