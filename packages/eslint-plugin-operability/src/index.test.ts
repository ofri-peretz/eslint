import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import plugin, { rules, configs } from './index';

// The unscoped published name + bare plugin key. These packages ship WITHOUT
// the `@interlace` scope (matching `eslint-plugin-*` across the ecosystem and
// package.json `name`); recommended configs register the bare short key. Pinned
// so a scoped name/key can never silently ship again.
const PLUGIN_NAME = 'eslint-plugin-operability';
const PLUGIN_KEY = 'operability';

/**
 * Mirrors ESLint's flat-config rule-id resolution (ESLint 9/10 —
 * `lib/config/config.js`: `parseRuleId` + `getRuleFromConfig`):
 *
 *   - scoped ids (`@scope/...`)  → plugin name is everything up to the LAST `/`
 *   - unscoped ids               → plugin name is everything up to the FIRST `/`
 *   - the rule then resolves against `plugins[pluginName].rules[ruleName]`
 *
 * This is the exact path that throws `Could not find plugin "<name>"` for a real
 * consumer (`new ESLint(...)` / the CLI) when a recommended config's rule ids
 * don't line up with its registered plugin keys. v3.0.5 shipped doubly
 * namespaced — plugin key `@interlace/operability` but rule ids
 * `@interlace/operability/operability/no-console-log`, which resolves to the
 * (unregistered) plugin `@interlace/operability/operability`.
 */
function parseRuleId(ruleId: string): { pluginName: string; ruleName: string } {
  if (!ruleId.includes('/')) return { pluginName: '@', ruleName: ruleId };
  const pluginName = ruleId.startsWith('@')
    ? ruleId.slice(0, ruleId.lastIndexOf('/'))
    : ruleId.slice(0, ruleId.indexOf('/'));
  return { pluginName, ruleName: ruleId.slice(pluginName.length + 1) };
}

describe('eslint-plugin-operability plugin interface', () => {
  it('should export correct, UNSCOPED meta information (no @interlace scope)', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe(PLUGIN_NAME);
    // Fail closed on ANY scope — keep parity with the unscoped package.json
    // `name` and the rest of the ecosystem (`eslint-plugin-*`).
    expect(plugin.meta?.name?.startsWith('@')).toBe(false);
    expect(plugin.meta?.version).toBeDefined();
    expect(typeof plugin.meta?.version).toBe('string');
    expect(plugin.meta?.version).toBeTruthy();
  });

  it('should export all operability rules (both flat and categorized)', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});

    // Flat names
    expect(ruleKeys).toContain('no-console-log');
    expect(ruleKeys).toContain('no-process-exit');
    expect(ruleKeys).toContain('no-debug-code-in-production');
    expect(ruleKeys).toContain('no-verbose-error-messages');
    expect(ruleKeys).toContain('require-code-minification');
    expect(ruleKeys).toContain('require-data-minimization');

    // Categorized names
    expect(ruleKeys).toContain('operability/no-console-log');
    expect(ruleKeys).toContain('operability/no-process-exit');
    expect(ruleKeys).toContain('operability/no-debug-code-in-production');
    expect(ruleKeys).toContain('operability/no-verbose-error-messages');
    expect(ruleKeys).toContain('operability/require-code-minification');
    expect(ruleKeys).toContain('operability/require-data-minimization');

    expect(ruleKeys.length).toBe(12); // 6 flat + 6 categorized
  });

  it('should export rules matching plugin.rules', () => {
    expect(rules).toBeDefined();
    expect(Object.keys(rules).length).toBeGreaterThan(0);
    // rules export should contain flat names only
    expect(Object.keys(rules)).toContain('no-console-log');
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs['recommended']).toBeDefined();
      expect(configs['recommended'].plugins?.['operability']).toBeDefined();

      const recommendedRules = configs['recommended'].rules || {};
      Object.keys(recommendedRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^operability\//);
      });

      // Verify at least one rule is configured
      expect(Object.keys(recommendedRules).length).toBeGreaterThan(0);
    });

    it('should have all recommended rules reference existing rules', () => {
      const recommendedRules = Object.keys(configs['recommended'].rules || {});
      const pluginRules = Object.keys(plugin.rules || {});

      recommendedRules.forEach((ruleName) => {
        const shortName = ruleName.replace('operability/', '');
        expect(pluginRules).toContain(shortName);
      });
    });

    // Regression lock for the v3.0.5 doubly-namespaced recommended config.
    // The published build registered `plugins: { '@interlace/operability' }`
    // but keyed rules `@interlace/operability/operability/<rule>`, so any
    // consumer enabling this preset alongside another config hit
    // `Could not find plugin "@interlace/operability/operability"`.
    // This reproduces ESLint's own resolution and fails closed on any rule id
    // whose plugin segment isn't a registered plugin key (or whose rule is
    // missing from that plugin). It would have caught the bug pre-publish.
    it('every recommended rule id resolves to a registered plugin + existing rule', () => {
      const recommended = configs['recommended'];
      const registeredPlugins = recommended.plugins ?? {};
      const ruleIds = Object.keys(recommended.rules ?? {});

      expect(ruleIds.length).toBeGreaterThan(0);

      for (const ruleId of ruleIds) {
        const { pluginName, ruleName } = parseRuleId(ruleId);

        expect(
          Object.prototype.hasOwnProperty.call(registeredPlugins, pluginName),
          `rule "${ruleId}" → plugin "${pluginName}" is not registered in ` +
            `configs.recommended.plugins (keys: ${Object.keys(registeredPlugins).join(', ')})`,
        ).toBe(true);

        const resolvedRules = (registeredPlugins[pluginName] as { rules?: Record<string, unknown> })
          ?.rules;
        expect(
          resolvedRules?.[ruleName],
          `rule "${ruleId}" → "${ruleName}" not found in plugin "${pluginName}"`,
        ).toBeDefined();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Barrel-file integrity.
  //
  // The barrel (`src/index.ts`) IS the published artifact: a straight tsc of it
  // becomes `dist/src/index.js`, so locking the barrel's shape locks what ships.
  // v3.0.5 proved how this breaks silently — a scoped plugin key + a doubled
  // rule namespace passed in isolation but made every real consumer throw at
  // config load. These tests fail closed on that whole class.
  // ─────────────────────────────────────────────────────────────────────────
  describe('barrel-file integrity', () => {
    it('exports a well-formed barrel (rules, plugin, configs) with real rule modules', () => {
      expect(plugin).toBeDefined();
      expect(rules).toBe(plugin.rules);
      expect(configs['recommended']).toBeDefined();

      // Every exported rule is a real RuleModule (has a `create` function), so
      // the barrel can never export a dangling/undefined rule reference.
      for (const [name, rule] of Object.entries(plugin.rules ?? {})) {
        expect(typeof (rule as { create?: unknown })?.create, `rule "${name}" has no create()`).toBe(
          'function',
        );
      }
    });

    it('registers only the UNSCOPED bare plugin key (no @interlace, no eslint-plugin- prefix)', () => {
      for (const config of Object.values(configs)) {
        for (const key of Object.keys(config.plugins ?? {})) {
          expect(key.startsWith('@'), `plugin key "${key}" is @-scoped`).toBe(false);
          expect(
            key.startsWith('eslint-plugin-'),
            `plugin key "${key}" carries the eslint-plugin- prefix`,
          ).toBe(false);
        }
      }
      expect(Object.keys(configs['recommended'].plugins ?? {})).toEqual([PLUGIN_KEY]);
    });

    it('recommended config LOADS in real ESLint when enabled alongside another config', async () => {
      // The exact v3.0.5 failure mode: enabling the preset with a second config
      // object and running ESLint threw
      //   Could not find plugin "@interlace/operability/operability".
      // Load it for real — plugin/rule resolution errors throw inside lintText.
      const overrideConfig = [configs['recommended'], { rules: {} }] as never;
      const eslint = new ESLint({ overrideConfigFile: true, overrideConfig });
      const results = await eslint.lintText('const x = 1;\n', { filePath: 'smoke.js' });
      expect(results).toHaveLength(1);
      expect(results[0]?.messages).toBeDefined();
    });
  });
});
