/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * How much of each plugin's target API surface do its rules actually name?
 *
 * ## Why this exists beside `audit-api-surface.ts`
 *
 * That script reads `.agent/api-surface-manifest.json` and checks the numbers
 * in it are internally consistent and above a floor. It never looks at a rule,
 * and it never looks at the API surface — every figure in the published table
 * was typed by hand. `eslint-plugin-node-security` declared its surface as
 * "fs, child_process, crypto, vm, dns, http(s)" and its size as 47 callable
 * APIs. Those modules export 227 callables on node@24. The number was not
 * wrong by a rounding error; it was not a measurement.
 *
 * A hand-maintained coverage percentage is the same defect as a hand-maintained
 * inventory or a probe that prints its verdict and exits 0: it reports health
 * while nothing checks it, and the number moves only when someone edits it. So
 * "drive the table to 100%" is, against that instrument, a text edit.
 *
 * ## What this measures, and what it cannot
 *
 * For every module in a plugin's surface it enumerates the callable exports at
 * the installed version, then asks which of those names appear anywhere in the
 * plugin's rule sources.
 *
 * Naming an API is NECESSARY for a rule to act on it and not SUFFICIENT — a
 * name can appear in a comment, or in a list the rule never reaches. So the
 * result is an UPPER BOUND: coverage is at most this. That is the safe
 * direction for a claim about a security product, and it is still enormously
 * more informative than a typed constant, because an API that appears nowhere
 * in the sources is provably uncovered.
 *
 * Turning the bound into an exact figure means probing each API with a real
 * misuse snippet, which cannot be generated mechanically. That is the honest
 * ceiling of automation here, and it is recorded rather than papered over.
 *
 *   npx tsx scripts/measure-api-surface.ts
 *   npx tsx scripts/measure-api-surface.ts --plugin eslint-plugin-node-security
 *   npx tsx scripts/measure-api-surface.ts --uncovered   # list what is missing
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MANIFEST = path.join(ROOT, '.agent', 'api-surface-manifest.json');

const only =
  process.argv
    .find((a) => a.startsWith('--plugin='))
    ?.slice('--plugin='.length) ?? null;
const showUncovered = process.argv.includes('--uncovered');

/**
 * Where each plugin's surface actually comes from.
 *
 * Kept beside the measurement rather than in the manifest until the numbers
 * are trusted: the manifest is the thing under suspicion, and a spec living
 * inside it could be edited to make the measurement agree with the claim.
 *
 * `prototypes` matters for the driver packages. `pg`'s misuse surface is
 * `client.query(...)`, which is `Client.prototype.query` — the module's own
 * exports are nine constructors and say nothing about what a rule must catch.
 */
type SurfaceSpec = {
  plugin: string;
  /** Node core or npm module specifiers to enumerate. */
  modules: string[];
  /** Also walk the prototypes of exported classes. */
  prototypes?: boolean;
  /**
   * Count capitalised exports as surface rather than as classes.
   *
   * The class heuristic below is right for Node — `Cipheriv` is a constructor,
   * `createCipheriv` is the call a rule watches — and exactly wrong for NestJS,
   * whose ENTIRE misuse surface is capitalised decorators: `@Controller`,
   * `@Body`, `@Catch`, `@UseGuards`. Applied globally it scored that plugin
   * "0% of 7" by discarding all 99 of the APIs its rules exist to read.
   */
  capitalisedIsSurface?: boolean;
};

const SPECS: SurfaceSpec[] = [
  {
    plugin: 'eslint-plugin-node-security',
    modules: [
      'node:fs',
      'node:fs/promises',
      'node:child_process',
      'node:crypto',
      'node:vm',
      'node:dns',
      'node:http',
      'node:https',
      'node:tls',
    ],
  },
  {
    plugin: 'eslint-plugin-postgresql-security',
    modules: ['pg'],
    prototypes: true,
  },
  {
    plugin: 'eslint-plugin-mongodb-security',
    modules: ['mongodb', 'mongoose'],
    prototypes: true,
  },
  { plugin: 'eslint-plugin-jwt-security', modules: ['jsonwebtoken'] },
  {
    plugin: 'eslint-plugin-express-security',
    modules: ['express'],
    prototypes: true,
  },
  { plugin: 'eslint-plugin-vercel-ai-security', modules: ['ai'] },
  {
    plugin: 'eslint-plugin-nestjs-security',
    modules: ['@nestjs/common'],
    capitalisedIsSurface: true,
  },
];

/**
 * Names that are not a misuse surface, whatever module they come from.
 *
 * An underscore prefix is Node's and npm's convention for "internal, not part
 * of the contract" — `_forkChild`, `_connectionListener`, `_handleAuthSASL`.
 * A rule that fired on those would be reporting on the library's own guts.
 * `constructor` is an artefact of walking a prototype.
 */
const isOutOfScope = (name: string): boolean =>
  name.startsWith('_') || name === 'constructor';

/**
 * A capitalised export is a class, and a class is a different rule shape:
 * `new Cipheriv(...)` rather than `crypto.createCipheriv(...)`. Counting them
 * in the denominator would charge every plugin for a surface its rules were
 * never meant to address, so they are reported separately rather than hidden.
 */
const isClass = (name: string): boolean => /^[A-Z]/.test(name);

function callablesOf(spec: SurfaceSpec): {
  fns: Set<string>;
  classes: Set<string>;
} {
  const fns = new Set<string>();
  const classes = new Set<string>();

  const add = (name: string, value: unknown): void => {
    if (typeof value !== 'function' || isOutOfScope(name)) return;
    const cls = isClass(name) && spec.capitalisedIsSurface !== true;
    (cls ? classes : fns).add(name);
  };

  for (const specifier of spec.modules) {
    let mod: Record<string, unknown>;
    try {
      mod = require_(specifier) as Record<string, unknown>;
    } catch {
      console.error(
        `  ! ${spec.plugin}: cannot resolve ${specifier} — skipped`,
      );
      continue;
    }
    for (const key of Object.getOwnPropertyNames(mod)) {
      let value: unknown;
      try {
        value = mod[key];
      } catch {
        continue; // a deprecated getter that throws on read
      }
      add(key, value);
      if (spec.prototypes && typeof value === 'function') {
        const proto = (value as { prototype?: object }).prototype;
        if (proto === undefined || proto === null) continue;
        for (const m of Object.getOwnPropertyNames(proto)) {
          try {
            add(m, (proto as Record<string, unknown>)[m]);
          } catch {
            /* getter that throws */
          }
        }
      }
    }
  }
  return { fns, classes };
}

/** Every identifier-like token in a plugin's rule sources, tests excluded. */
function tokensOf(plugin: string): Set<string> {
  const said = new Set<string>();
  const src = path.join(ROOT, 'packages', plugin, 'src');
  if (!fs.existsSync(src)) return said;
  const walk = (dir: string): void => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.ts') && !e.name.includes('.test.')) {
        for (const w of fs.readFileSync(p, 'utf8').match(/[A-Za-z_$][\w$]*/g) ??
          [])
          said.add(w);
      }
    }
  };
  walk(src);
  return said;
}

type Claim = {
  plugin: string;
  callableApis_total: number;
  coverage_pct: number;
};
const claimed = new Map<string, Claim>(
  (
    JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as { plugins: Claim[] }
  ).plugins.map((p) => [p.plugin, p]),
);

console.log(
  '\n  plugin                              claimed        measured (upper bound)',
);
console.log(
  '  ----------------------------------  -------------  ----------------------',
);

const rows: {
  plugin: string;
  claim: number;
  measured: number;
  gap: string[];
}[] = [];

for (const spec of SPECS) {
  if (only !== null && spec.plugin !== only) continue;
  const { fns } = callablesOf(spec);
  const said = tokensOf(spec.plugin);
  const named = [...fns].filter((a) => said.has(a));
  const unnamed = [...fns].filter((a) => !said.has(a)).sort();
  const pct = fns.size === 0 ? 0 : Math.round((named.length / fns.size) * 100);
  const c = claimed.get(spec.plugin);

  console.log(
    `  ${spec.plugin.padEnd(34)}  ${String(c?.coverage_pct ?? '?').padStart(3)}% of ${String(
      c?.callableApis_total ?? '?',
    ).padStart(
      3,
    )}   ≤${String(pct).padStart(3)}% of ${String(fns.size).padStart(3)}`,
  );
  rows.push({
    plugin: spec.plugin,
    claim: c?.coverage_pct ?? 0,
    measured: pct,
    gap: unnamed,
  });
}

console.log(
  '\n  "claimed" is a hand-typed constant. "measured" enumerates the modules at their',
);
console.log(
  '  installed version and asks which names appear in the rule sources at all —',
);
console.log(
  '  necessary for coverage, not sufficient, hence an upper bound.\n',
);

if (showUncovered) {
  for (const r of rows) {
    if (r.gap.length === 0) continue;
    console.log(`  ${r.plugin} — ${r.gap.length} API(s) named nowhere:`);
    console.log(`    ${r.gap.join(', ')}\n`);
  }
}
