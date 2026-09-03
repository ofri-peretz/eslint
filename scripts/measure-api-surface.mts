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
 *   npx tsx scripts/measure-api-surface.mts
 *   npx tsx scripts/measure-api-surface.mts --plugin eslint-plugin-node-security
 *   npx tsx scripts/measure-api-surface.mts --uncovered   # list what is missing
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MANIFEST = path.join(ROOT, '.agent', 'api-surface-manifest.json');

/*
 * BOTH spellings. The usage block above documents the space-separated form,
 * and only `--plugin=` was accepted — so `--plugin eslint-plugin-node-security`
 * left `only` null and silently measured all 30 plugins, which reads exactly
 * like a run that worked.
 */
const only = ((): string | null => {
  const argv = process.argv.slice(2);
  const joined = argv.find((a) => a.startsWith('--plugin='));
  if (joined !== undefined) return joined.slice('--plugin='.length);
  const flag = argv.indexOf('--plugin');
  if (flag !== -1) {
    const next = argv[flag + 1];
    if (next !== undefined && !next.startsWith('-')) return next;
  }
  return null;
})();
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
  /**
   * Enumerate only these exported classes' prototypes, not the whole module.
   *
   * `mongodb-security` declares its surface as "Collection / Db / cursor query
   * methods". Enumerating the `mongodb` and `mongoose` packages whole gave 485,
   * which charges the plugin for every Document method Mongoose happens to
   * expose and describes a surface nobody claimed.
   */
  classRoots?: string[];
  /**
   * Or: the surface IS this list, named explicitly.
   *
   * `vercel-ai-security` declares "generateText / streamText / generateObject
   * / tools". The `ai` package exports 157 callables — error classes, chat
   * transports, 18 `experimental_` entry points. A denominator of 107 was
   * measuring the package, not the surface a security rule must cover.
   *
   * Written out rather than matched by a pattern, because the list IS the
   * claim: these are the APIs this plugin says it has an opinion about, and
   * changing it should read as a change of scope in review.
   */
  only?: string[];
};

/**
 * Narrowing for the surfaces where the whole package is not the claim.
 *
 * Everything else is derived from the plugin's own `peerDependencies`, which is
 * where each plugin already declares what it targets — a hand-written list of
 * modules beside that one was a second source of truth that could disagree with
 * it, and did: it covered 7 of 30 plugins while the peer declarations covered
 * all of them.
 */
const NARROW: Record<string, Partial<SurfaceSpec>> = {
  'eslint-plugin-postgresql-security': { prototypes: true },
  'eslint-plugin-mongodb-security': {
    modules: ['mongodb'],
    classRoots: [
      'Collection',
      'Db',
      'FindCursor',
      'AggregationCursor',
      'MongoClient',
    ],
  },
  'eslint-plugin-express-security': { prototypes: true },
  'eslint-plugin-nestjs-security': { capitalisedIsSurface: true },
  'eslint-plugin-vercel-ai-security': {
    only: [
      'generateText',
      'streamText',
      'generateObject',
      'streamObject',
      'generateImage',
      'generateSpeech',
      'embed',
      'embedMany',
      'tool',
    ],
  },
};

/**
 * What each plugin ANALYSES, read from its own `interlace.surface`.
 *
 * `peerDependencies` was the first source and it conflates two different
 * things: the SDK a plugin analyses, and a library the plugin USES.
 * `secure-coding` peers on `recheck` — a ReDoS oracle it calls at runtime —
 * so deriving the surface from peers read that plugin as "2 exports" rather
 * than the generic-JS surface it actually covers. `import-next` and
 * `maintainability` peer on `typescript` for the same reason.
 *
 * Four kinds, and the honest answer for eleven plugins is that no npm package
 * describes them:
 *
 *   npm            19  the SDK is a package and can be enumerated
 *   language        8  plain JS/TS idiom; there is no external surface
 *   web-platform    2  the DOM; no package declares it
 *   node-core       1  built-in modules, enumerable from the runtime
 *
 * A `language` plugin is not unmeasured — it is measured and the answer is
 * "not applicable", which is a different statement and the one that was
 * missing while twenty plugins sat outside the manifest with no explanation.
 */
type Kind = 'npm' | 'node-core' | 'web-platform' | 'language';

const SPECS: (SurfaceSpec & { kind: Kind; note?: string })[] = fs
  .readdirSync(path.join(ROOT, 'packages'))
  .filter((d) => d.startsWith('eslint-plugin-'))
  .sort()
  .map((dir) => {
    const pkgPath = path.join(ROOT, 'packages', dir, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      interlace?: {
        surface?: { kind: Kind; modules?: string[]; note?: string };
      };
    };
    const declared = pkg.interlace?.surface;
    if (declared === undefined) {
      console.error(`  ! ${dir}: no interlace.surface declared — not measured`);
      return null;
    }
    return {
      plugin: dir,
      modules: declared.modules ?? [],
      kind: declared.kind,
      note: declared.note,
      ...NARROW[dir],
    } as SurfaceSpec & { kind: Kind; note?: string };
  })
  .filter((s): s is SurfaceSpec & { kind: Kind; note?: string } => s !== null);

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

async function callablesOf(spec: SurfaceSpec): Promise<{
  fns: Set<string>;
  classes: Set<string>;
}> {
  const fns = new Set<string>();
  const classes = new Set<string>();
  const esmPending: string[] = [];

  const add = (name: string, value: unknown): void => {
    if (typeof value !== 'function' || isOutOfScope(name)) return;
    const cls = isClass(name) && spec.capitalisedIsSurface !== true;
    (cls ? classes : fns).add(name);
  };

  for (const specifier of spec.modules) {
    if (spec.only !== undefined) {
      const mod = require_(specifier) as Record<string, unknown>;
      for (const name of spec.only) {
        if (typeof mod[name] === 'function') fns.add(name);
        else
          console.error(
            `  ! ${spec.plugin}: ${specifier} has no export ${name}`,
          );
      }
      continue;
    }
    if (spec.classRoots !== undefined) {
      const mod = require_(specifier) as Record<string, unknown>;
      for (const root of spec.classRoots) {
        const cls = mod[root] as { prototype?: object } | undefined;
        if (typeof cls !== 'function' || cls.prototype === undefined) {
          console.error(
            `  ! ${spec.plugin}: ${specifier} has no class ${root}`,
          );
          continue;
        }
        for (const m of Object.getOwnPropertyNames(cls.prototype)) {
          try {
            add(m, (cls.prototype as Record<string, unknown>)[m]);
          } catch {
            /* getter that throws */
          }
        }
      }
      continue;
    }
    let mod: Record<string, unknown>;
    try {
      mod = require_(specifier) as Record<string, unknown>;
    } catch {
      /*
       * ESM-only packages — `@middy/*`, `@modelcontextprotocol/sdk` — cannot be
       * `require`d at all. Without this second pass a plugin whose target is
       * ESM-only read as "surface: 0", which is indistinguishable from a plugin
       * with no surface and exactly the confusion this file exists to remove.
       */
      esmPending.push(specifier);
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
  for (const specifier of esmPending) {
    try {
      const mod = (await import(specifier)) as Record<string, unknown>;
      const target = (mod['default'] ?? mod) as Record<string, unknown>;
      for (const key of Object.getOwnPropertyNames(target)) {
        try {
          add(key, target[key]);
        } catch {
          /* getter that throws */
        }
      }
    } catch {
      console.error(
        `  ! ${spec.plugin}: cannot load ${specifier} — not counted`,
      );
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

/**
 * Plugins whose surface is not an enumerable module set.
 *
 * Reported separately and by name. "Not applicable" is a MEASUREMENT — it says
 * this plugin analyses plain JS, or the DOM, and no package describes that. It
 * is a different statement from "unmeasured", and the absence of that
 * distinction is why twenty plugins sat outside the manifest for months with
 * no explanation attached to any of them.
 */
const notApplicable: { plugin: string; kind: string; note?: string }[] = [];

const rows: {
  plugin: string;
  claim: number;
  measured: number;
  gap: string[];
}[] = [];

for (const spec of SPECS) {
  if (only !== null && spec.plugin !== only) continue;
  if (spec.kind !== 'npm' && spec.kind !== 'node-core') {
    notApplicable.push({
      plugin: spec.plugin,
      kind: spec.kind,
      note: spec.note,
    });
    continue;
  }
  const { fns } = await callablesOf(spec);
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

if (notApplicable.length > 0) {
  console.log(
    `  ${notApplicable.length} plugin(s) have no enumerable module surface:\n`,
  );
  for (const n of notApplicable) {
    console.log(`    ${n.plugin.padEnd(34)} ${n.kind}`);
  }
  console.log(
    '\n  Not applicable is a MEASUREMENT, not a gap: these analyse plain JS/TS or' +
      '\n  the web platform, and no npm package describes either.\n',
  );
}

console.log(
  `  coverage: ${rows.length + notApplicable.length} of 30 plugins classified\n`,
);

if (showUncovered) {
  for (const r of rows) {
    if (r.gap.length === 0) continue;
    console.log(`  ${r.plugin} — ${r.gap.length} API(s) named nowhere:`);
    console.log(`    ${r.gap.join(', ')}\n`);
  }
}
