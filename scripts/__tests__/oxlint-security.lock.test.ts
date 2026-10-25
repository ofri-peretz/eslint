/**
 * @provenBy {"file":"packages/oxlint-plugin-security/mapping.json","find":"\"version\": \"4.2.0\"","replace":"\"version\": \"4.1.0\""}
 * oxlint-plugin-security — the façade's contract, held before anything ships
 * (docs/intents/oxlint-plugin-security-drop-in, ADR-0008).
 *
 *   R4  the façade answers to EXACTLY the incumbent's rule IDs at the pinned
 *       version, and every rule it maps to exists in its plugin. A new
 *       incumbent rule is a config that fails to load on oxlint; this is where
 *       it surfaces (4.1.0 added detect-invisible-characters unnoticed).
 *   R9  `private` is the only thing standing between the package and npm, and
 *       flipping it is the act that publishes. So the ship gate is read BEFORE
 *       that act: with `private !== true`, drop-in.mjs must be green.
 *
 * R3 (object identity, pinned options) and R5 (both engines resolve every ID)
 * need built code, so they live in drop-in.mjs and verify-oxlint-aliases.mts.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '../..');
const PKG = path.join(ROOT, 'packages', 'oxlint-plugin-security');
const require = createRequire(path.join(ROOT, 'package.json'));
const mapping = JSON.parse(
  fs.readFileSync(path.join(PKG, 'mapping.json'), 'utf8'),
) as {
  incumbent: { name: string; version: string };
  rules: Record<
    string,
    { plugin?: string; rule?: string; retired?: boolean; reason?: string }
  >;
};
const manifest = JSON.parse(
  fs.readFileSync(path.join(PKG, 'package.json'), 'utf8'),
) as {
  private?: boolean;
  devDependencies?: Record<string, string>;
};

describe('oxlint-plugin-security', () => {
  it('R4: maps exactly the incumbent rule IDs at the pinned version', () => {
    const incumbentPkg = require(`${mapping.incumbent.name}/package.json`) as {
      version: string;
    };
    expect(incumbentPkg.version).toBe(mapping.incumbent.version);
    expect(manifest.devDependencies?.[mapping.incumbent.name]).toBe(
      mapping.incumbent.version,
    );
    const incumbent = require(mapping.incumbent.name) as {
      rules: Record<string, unknown>;
    };
    expect(Object.keys(mapping.rules).sort()).toEqual(
      Object.keys(incumbent.rules).sort(),
    );
  });

  it('R4: every mapped rule exists in its plugin; every retired ID says why', async () => {
    const missing: string[] = [];
    for (const [id, entry] of Object.entries(mapping.rules)) {
      if (entry.retired) {
        if (!entry.reason || entry.reason.length < 40)
          missing.push(`${id}: retired without a reason`);
        continue;
      }
      // The scripts vitest config aliases each eslint-plugin-* to its src/index.ts.
      const { rules } = (await import(`eslint-plugin-${entry.plugin}`)) as {
        rules: Record<string, unknown>;
      };
      if (!rules[entry.rule!])
        missing.push(`${id} → ${entry.plugin}/${entry.rule}`);
    }
    expect(missing).toEqual([]);
  });

  it('R9: stays private unless the drop-in gate is green', () => {
    if (manifest.private === true) return;
    const gate = spawnSync(
      'node',
      ['benchmarks/suites/ilb-competitor-parity/drop-in.mjs'],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    );
    expect(
      gate.status,
      `private was flipped while the gate is red:\n${gate.stdout}${gate.stderr}`,
    ).toBe(0);
  });
});
