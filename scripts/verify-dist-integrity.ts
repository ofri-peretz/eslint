#!/usr/bin/env tsx

/**
 * verify-dist-integrity.ts — pre-publish ecosystem-integrity gate, run against
 * the BUILT `dist/` artifacts instead of workspace source.
 *
 * WHY THIS EXISTS
 * ---------------
 * `scripts/__tests__/ecosystem-integrity.test.ts` loads
 * every published plugin's every config preset into a real ESLint and asserts
 * the rule→plugin references resolve. But under vitest that suite runs against
 * workspace SOURCE (the vitest config aliases every `eslint-plugin-*` to its
 * `src/index.ts`). Source is always current — so it locks the source against
 * regression but can NOT catch a stale or mis-built `dist/`: exactly the
 * failure mode that shipped broken `recommended` builds of
 * `eslint-plugin-maintainability` / `-operability` to npm while their source
 * was already fixed.
 *
 * This script closes that gap. It imports each plugin from its built
 * `dist/` entry (the published tarball root IS `dist/`, with
 * `dist/package.json#main` → `dist/src/index.js`), then runs the SAME
 * assertions the vitest lock runs:
 *
 *   1. every preset loads into a real ESLint with NO throw, with a `files`
 *      matcher forcing full rule→plugin resolution (a bare `{ plugins, rules }`
 *      preset is otherwise silently "File ignored" and never resolved — see
 *      the long comment in the vitest lock);
 *   2. every rule is a well-formed RuleModule (meta + create()).
 *
 * It deliberately uses whatever `eslint` is installed in the repo, so a CI
 * matrix can run it once per supported ESLint major (8 / 9 / 10 — see
 * docs/ESLINT_VERSION_SUPPORT.md) by `npm install --no-save eslint@<major>`
 * before invoking it. The "could not find plugin" resolution error fires
 * under every supported major.
 *
 * USAGE
 *   tsx scripts/verify-dist-integrity.ts            # all plugins with a dist/
 *   tsx scripts/verify-dist-integrity.ts --require-built   # additionally FAIL
 *                                                   # if any published plugin
 *                                                   # has no dist/ (release gate)
 *
 * EXIT CODES
 *   0  every dist preset resolved + every rule well-formed
 *   1  a preset threw, a rule was malformed, or (--require-built) a published
 *      plugin had no dist/
 *   2  setup error (no plugins found, eslint not importable)
 *
 * INTENDED WIRING
 *   Run AFTER `turbo run build` and BEFORE `npm publish` in the release
 *   pipeline (.github/workflows/release.yml), as its own job between `build`
 *   and `publish`. See docs/PRE_PUBLISH_INTEGRITY_GATE.md.
 */

import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');
const PACKAGES_DIR = join(ROOT, 'packages');
// Resolve `eslint` exactly as the repo root would — picks up whatever major is
// installed (incl. a CI `npm install --no-save eslint@10`).
const repoRequire = createRequire(join(ROOT, 'package.json'));

interface PluginDistInfo {
  readonly name: string;
  readonly distDir: string;
  readonly entryPath: string;
}

interface PresetCase {
  readonly name: string;
  readonly preset: string;
  readonly config: unknown;
}

interface RuleCase {
  readonly name: string;
  readonly ruleId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly rule: any;
}

const requireBuilt = process.argv.includes('--require-built');

/** Language prefix (`markdown` in `markdown/gfm`) → package supplying it. */
const LANGUAGE_PLUGIN_PACKAGES: Readonly<Record<string, string>> = {
  markdown: '@eslint/markdown',
};

/** A concrete, lintable path matching a `files` glob (`**\/CLAUDE.md` → `CLAUDE.md`). */
function concretizeGlob(glob: string): string {
  return glob
    .replace(/^\*\*\//, '')
    .replace(/\*\*\//g, 'probe/')
    .replace(/\*/g, 'probe');
}

const PROBE_TEXT: Readonly<Record<string, string>> = {
  markdown: '# Probe\n\nA line of guidance.\n',
};

type LanguageOutcome = 'pass' | 'fail' | 'skip';

async function verifyLanguagePreset(
  name: string,
  preset: string,
  blocks: Record<string, unknown>[],
  eslintMajor: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ESLint: any,
): Promise<LanguageOutcome> {
  const where = `${name} → configs.${preset}`;
  const block = blocks.find((c) => typeof c.language === 'string') as Record<
    string,
    unknown
  >;
  const language = block.language as string;
  if (eslintMajor < 9) {
    console.log(
      `  ⏭ ${where}: SKIPPED — requires ESLint >= 9: declares language "${language}" (eslint@${eslintMajor} has no languages)`,
    );
    return 'skip';
  }
  const prefix = language.split('/')[0];
  const pkg = LANGUAGE_PLUGIN_PACKAGES[prefix];
  if (pkg === undefined) {
    console.error(
      `✗ ${where}: declares language "${language}" but this script has no plugin registered for "${prefix}" — cannot verify`,
    );
    return 'fail';
  }
  const files = (block.files ?? []) as unknown[];
  const glob = files.find((f): f is string => typeof f === 'string');
  if (glob === undefined) {
    console.error(
      `✗ ${where}: language preset has no string \`files\` — cannot pick a probe path`,
    );
    return 'fail';
  }
  try {
    const mod = await import(pathToFileURL(repoRequire.resolve(pkg)).href);
    const languagePlugin = mod.default ?? mod;
    const probePath = concretizeGlob(glob);
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [{ plugins: { [prefix]: languagePlugin } }, ...blocks],
    });
    const results = await eslint.lintText(PROBE_TEXT[prefix] ?? '', {
      filePath: probePath,
    });
    if (results.length !== 1) {
      console.error(
        `✗ ${where}: expected 1 lint result for ${probePath}, got ${results.length}`,
      );
      return 'fail';
    }
    const messages = results[0].messages as {
      ruleId: string | null;
      message: string;
      fatal?: boolean;
    }[];
    const bad = messages.find(
      (m) =>
        m.fatal === true || (m.ruleId === null && /ignored/i.test(m.message)),
    );
    if (bad !== undefined) {
      console.error(
        `✗ ${where}: probe ${probePath} was ignored or failed to parse — ${bad.message}`,
      );
      return 'fail';
    }
    const resolved = (await eslint.calculateConfigForFile(probePath)) as {
      language?: unknown;
      rules?: Record<string, unknown>;
    };
    // ESLint resolves the `prefix/name` string to the plugin's Language object.
    const expectedLanguage = languagePlugin.languages?.[language.split('/')[1]];
    if (
      expectedLanguage === undefined ||
      resolved.language !== expectedLanguage
    ) {
      console.error(
        `✗ ${where}: probe ${probePath} did not resolve language "${language}"`,
      );
      return 'fail';
    }
    const expected = blocks.flatMap((c) => Object.keys(c.rules ?? {}));
    const missing = expected.filter((r) => resolved.rules?.[r] === undefined);
    if (missing.length > 0) {
      console.error(
        `✗ ${where}: rules did not resolve for ${probePath}: ${missing.join(', ')}`,
      );
      return 'fail';
    }
    return 'pass';
  } catch (err) {
    console.error(`✗ ${where}: ${(err as Error).message.split('\n')[0]}`);
    return 'fail';
  }
}

async function main(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eslintMod: any = repoRequire('eslint');
  const eslintVersion: string = repoRequire('eslint/package.json').version;
  // ESLint 9/10 made flat config the default `ESLint` export. ESLint 8's
  // `ESLint` is still the eslintrc-based class — it rejects the flat-config
  // shaped options used below (e.g. `overrideConfigFile: true`) with
  // "Invalid Options". Under 8, use the dedicated flat-config class instead.
  const eslintMajor = Number.parseInt(eslintVersion, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ESLint: any =
    eslintMajor >= 9
      ? eslintMod.ESLint
      : repoRequire('eslint/use-at-your-own-risk').FlatESLint;
  if (!ESLint) {
    console.error(
      'verify-dist-integrity: could not load ESLint from the repo root.',
    );
    process.exit(2);
  }

  // Published, non-private plugins on disk. A directory without a local
  // package.json is a stale/manifest-less leftover, not a real package, and
  // is out of scope for this gate.
  const published: string[] = [];
  const noManifest: string[] = [];
  for (const dir of readdirSync(PACKAGES_DIR)) {
    if (!dir.startsWith('eslint-plugin-')) continue;
    const pkgJson = join(PACKAGES_DIR, dir, 'package.json');
    if (!existsSync(pkgJson)) {
      noManifest.push(dir);
      continue;
    }
    const manifest = JSON.parse(readFileSync(pkgJson, 'utf8')) as {
      private?: boolean;
    };
    if (manifest.private !== true) published.push(dir);
  }

  if (published.length === 0) {
    console.error(
      'verify-dist-integrity: no published eslint-plugin-* packages found.',
    );
    process.exit(2);
  }

  // Resolve each plugin's built dist entry.
  const built: PluginDistInfo[] = [];
  const unbuilt: string[] = [];
  for (const name of published) {
    const distDir = join(PACKAGES_DIR, name, 'dist');
    const distPkgPath = join(distDir, 'package.json');
    if (!existsSync(distPkgPath)) {
      unbuilt.push(name);
      continue;
    }
    const distPkg = JSON.parse(readFileSync(distPkgPath, 'utf8')) as {
      main?: string;
    };
    const mainRel = (distPkg.main ?? './src/index.js').replace(/^\.\//, '');
    const entryPath = join(distDir, mainRel);
    if (!existsSync(entryPath)) {
      unbuilt.push(name);
      continue;
    }
    built.push({ name, distDir, entryPath });
  }

  console.log(`verify-dist-integrity — eslint@${eslintVersion}`);
  console.log(
    `  published plugins: ${published.length}  built: ${built.length}  unbuilt: ${unbuilt.length}`,
  );
  if (noManifest.length) {
    console.log(`  manifest-less (out of scope): ${noManifest.join(', ')}`);
  }

  let failures = 0;
  let skipped = 0;

  if (unbuilt.length) {
    const msg = `  ${unbuilt.length} published plugin(s) have no built dist/: ${unbuilt.join(', ')}`;
    if (requireBuilt) {
      console.error(`✗${msg}`);
      console.error(
        '    (--require-built) every published plugin must be built before the publish gate.',
      );
      failures += 1;
    } else {
      console.warn(`⚠${msg}`);
      console.warn(
        '    Run `turbo run build` first, or pass --require-built to make this fatal.',
      );
    }
  }

  // Load every built plugin's dist entry.
  const presetCases: PresetCase[] = [];
  const ruleCases: RuleCase[] = [];
  for (const info of built) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mod: any;
    try {
      mod = await import(pathToFileURL(info.entryPath).href);
    } catch (err) {
      console.error(
        `✗ ${info.name}: dist entry failed to import — ${(err as Error).message.split('\n')[0]}`,
      );
      failures += 1;
      continue;
    }
    const plugin = mod.default ?? mod.plugin;
    const configs = (mod.configs ?? {}) as Record<string, unknown>;
    const rules = (plugin?.rules ?? mod.rules ?? {}) as Record<string, unknown>;

    if (!plugin?.meta?.name) {
      console.error(`✗ ${info.name}: dist plugin is missing meta.name`);
      failures += 1;
    }
    if (Object.keys(configs).length === 0) {
      console.error(`✗ ${info.name}: dist exports no \`configs\``);
      failures += 1;
    }
    if (configs['recommended'] === undefined) {
      console.error(
        `✗ ${info.name}: dist is missing the \`recommended\` preset`,
      );
      failures += 1;
    }

    for (const [preset, config] of Object.entries(configs)) {
      presetCases.push({ name: info.name, preset, config });
    }
    for (const [ruleId, rule] of Object.entries(rules)) {
      ruleCases.push({ name: info.name, ruleId, rule });
    }
  }

  // Assertion 1 — every preset resolves into a real ESLint without throwing.
  // The prepended `files` matcher forces ESLint to actually resolve every
  // rule→plugin reference (a bare `{ plugins, rules }` preset is otherwise
  // "File ignored" and never resolved). This is the lock that catches the
  // plugin-key ↔ rule-prefix mismatch in a BUILT artifact.
  //
  // A preset that declares a non-JS `language` (e.g. the Markdown `guidance`
  // preset) cannot be probed with JS source. It is verified on its own terms:
  // ESLint >= 9 only (languages do not exist in 8 — logged skip, never a
  // silent pass), the plugin that supplies the language is registered, and a
  // probe in that language is linted on a path matching the preset's OWN
  // `files`, which must not be ignored and must resolve every preset rule.
  for (const { name, preset, config } of presetCases) {
    const blocks = (Array.isArray(config) ? config : [config]) as Record<
      string,
      unknown
    >[];
    const languageBlock = blocks.find(
      (c) => typeof c.language === 'string' && c.language !== 'js/js',
    );
    if (languageBlock !== undefined) {
      const outcome = await verifyLanguagePreset(
        name,
        preset,
        blocks,
        eslintMajor,
        ESLint,
      );
      if (outcome === 'fail') failures += 1;
      else if (outcome === 'skip') skipped += 1;
      continue;
    }
    const presetBlocks = blocks.map((c) => {
      const { files: _files, ignores: _ignores, ...rest } = c;
      return rest;
    });
    const overrideConfig = [
      { files: ['**/*.{js,jsx,ts,tsx,cjs,mjs}'] },
      ...presetBlocks,
    ];
    try {
      const eslint = new ESLint({ overrideConfigFile: true, overrideConfig });
      const results = await eslint.lintText('const _x = 1;\n', {
        filePath: 'probe.tsx',
      });
      if (results.length !== 1) {
        console.error(
          `✗ ${name} → configs.${preset}: expected 1 lint result, got ${results.length} — resolution could not be verified`,
        );
        failures += 1;
        continue;
      }
      // Version-agnostic: ESLint 9/10's flat-config message is "no matching
      // configuration"; ESLint 8's FlatESLint says "matching ignore pattern".
      // Both are ruleId-less warnings, so match on that shape rather than
      // pinning to one major's exact wording.
      const ignored = results[0].messages.some(
        (m: { ruleId: string | null; message: string }) =>
          m.ruleId === null && /ignored/i.test(m.message),
      );
      if (ignored) {
        console.error(
          `✗ ${name} → configs.${preset}: probe file was ignored — rule→plugin resolution did not run`,
        );
        failures += 1;
      }
    } catch (err) {
      console.error(
        `✗ ${name} → configs.${preset}: ${(err as Error).message.split('\n')[0]}`,
      );
      failures += 1;
    }
  }

  // Assertion 2 — every rule is a well-formed RuleModule.
  for (const { name, ruleId, rule } of ruleCases) {
    if (typeof rule?.create !== 'function' || rule?.meta?.type === undefined) {
      console.error(
        `✗ ${name} → ${ruleId}: malformed rule (needs meta.type + create())`,
      );
      failures += 1;
    }
  }

  if (failures > 0) {
    console.error(
      `\n✗ verify-dist-integrity FAILED: ${failures} problem(s) in built dist/ under eslint@${eslintVersion}.`,
    );
    console.error(
      '  A broken/stale artifact must NOT be published. Rebuild from corrected source and re-run.',
    );
    process.exit(1);
  }

  console.log(
    `\n✅ verify-dist-integrity PASSED — ${presetCases.length} preset(s) + ${ruleCases.length} rule(s) across ${built.length} built plugin(s) under eslint@${eslintVersion}.`,
  );
}

main().catch((err) => {
  console.error('verify-dist-integrity: unexpected error');
  console.error(err);
  process.exit(2);
});
