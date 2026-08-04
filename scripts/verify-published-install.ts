/**
 * Clean-install smoke test: can a consumer actually `require` what we publish?
 *
 * Every other check in this repo runs inside the workspace, where every
 * dependency is already on disk. That is not what a consumer has. On
 * 2026-08-03 every published plugin threw
 * `Cannot find module '@typescript-eslint/utils'` on a plain
 * `npm i -D eslint-plugin-<name>`, because the devkit imported a runtime value
 * from a peer marked `optional: true` — which npm does not install. Nothing in
 * CI noticed, because nothing in CI installs the way a user does.
 *
 * This packs each plugin exactly as `npm publish` would, installs the tarball
 * into an empty project whose only other dependency is `eslint`, and requires
 * it. A missing runtime dependency fails here and nowhere else.
 *
 *   tsx scripts/verify-published-install.ts            # every plugin
 *   tsx scripts/verify-published-install.ts pg jwt     # a subset
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const PACKAGES = join(ROOT, 'packages');

interface Result {
  pkg: string;
  ok: boolean;
  rules?: number;
  error?: string;
}

/** Workspace directories that publish an `eslint-plugin-*` package. */
function pluginDirs(filter: readonly string[]): string[] {
  return readdirSync(PACKAGES)
    .filter((d) => d.startsWith('eslint-plugin-'))
    .filter((d) => filter.length === 0 || filter.some((f) => d.includes(f)))
    .sort();
}

function run(cmd: string, args: string[], cwd: string): string {
  return execFileSync(cmd, args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * Pack every plugin plus the devkit, install them together into one throwaway
 * project whose only other dependency is `eslint`, then require each.
 *
 * One install rather than one per plugin: 26 sequential `npm install` runs blew
 * past ten minutes, which is too slow to sit in front of every push. A shared
 * sandbox cannot prove per-plugin dependency isolation, but it does prove the
 * thing that actually broke — a runtime dependency missing from what we publish.
 */
function verifyAll(dirs: readonly string[]): Result[] {
  const sandbox = mkdtempSync(join(tmpdir(), 'interlace-install-'));
  try {
    writeFileSync(join(sandbox, 'package.json'), '{"name":"smoke","private":true}');

    const pack = (dir: string): string =>
      run('npm', ['pack', dir, '--pack-destination', sandbox], sandbox).trim().split('\n').pop()!;

    // `<pkg>/dist` is the publishable artifact (see scripts/build-package.ts);
    // packing the package root would ship raw .ts and test nothing.
    // The devkit is packed from this tree too — installing only the plugins
    // makes npm fetch it from the registry, so the test would grade the *last
    // release* instead of the code about to be published.
    const tarballs = [
      pack(join(PACKAGES, 'eslint-devkit', 'dist')),
      ...dirs.map((d) => pack(join(PACKAGES, d, 'dist'))),
    ].map((t) => join(sandbox, t));

    run('npm', ['install', '--no-audit', '--no-fund', 'eslint', ...tarballs], sandbox);

    return dirs.map((dir) => {
      const name: string = JSON.parse(
        run('node', ['-p', 'JSON.stringify(require("./package.json").name)'], join(PACKAGES, dir, 'dist')),
      );
      try {
        const out = run(
          'node',
          [
            '-e',
            `const p = require(${JSON.stringify(name)});` +
              `const r = p.rules ?? p.default?.rules ?? {};` +
              `process.stdout.write(String(Object.keys(r).length));`,
          ],
          sandbox,
        );
        const rules = Number(out.trim());
        if (!Number.isFinite(rules) || rules === 0) {
          return { pkg: name, ok: false, error: `loaded but exposed ${out.trim() || 'no'} rules` };
        }
        return { pkg: name, ok: true, rules };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const missing = /Cannot find module '([^']+)'/.exec(message)?.[1];
        return {
          pkg: name,
          ok: false,
          error: missing ? `missing runtime dependency: ${missing}` : message.split('\n')[0],
        };
      }
    });
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

const filter = process.argv.slice(2);
const dirs = pluginDirs(filter);
console.log(`Verifying a clean install of ${dirs.length} published package(s)…\n`);

const results = verifyAll(dirs);
for (const r of results) {
  console.log(r.ok ? `  \u2713 ${r.pkg}  (${r.rules} rules)` : `  \u2717 ${r.pkg}  ${r.error}`);
}

const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error(
    `\n${failed.length} of ${results.length} package(s) cannot be required after a clean install.\n` +
      `A consumer running \`npm i -D <pkg>\` gets exactly this.\n` +
      `Usual cause: a runtime value imported from a peer marked optional in\n` +
      `peerDependenciesMeta — npm does not install those. Import the value from a\n` +
      `local shim, or use \`import type\` if only the type is needed.`,
  );
  process.exit(1);
}
console.log(`\nAll ${results.length} package(s) load cleanly.`);
