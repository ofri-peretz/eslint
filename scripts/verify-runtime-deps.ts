/**
 * Static runtime-dependency check — the CI-speed version of the clean-install sweep.
 *
 * On 2026-08-03 every published plugin threw on `require`, from two separate
 * causes: the devkit imported a runtime value from a peer marked `optional`
 * (npm does not install those), and `eslint-plugin-import-next` imported
 * `typescript` while declaring no dependency on it at all.
 *
 * Both are the same shape — **emitted JS requires a module the package does not
 * guarantee is installed** — and both are decidable by reading the build output.
 * No install, no network, no sandbox: `verify-published-install.ts` proves the
 * same thing by actually installing, but takes ~2.5 minutes, which is too slow
 * to sit in front of every push. This runs in well under a second and belongs in
 * CI; keep the install sweep for pre-release and for anything this can't see
 * (a dependency that is declared but broken).
 *
 *   tsx scripts/verify-runtime-deps.ts
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const PACKAGES = join(ROOT, 'packages');

const BUILTINS = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

interface Violation {
  pkg: string;
  file: string;
  specifier: string;
  reason: string;
}

/** Every emitted `.js` beneath `dir`. */
function emittedJs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...emittedJs(full));
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

/**
 * The bare package name a specifier resolves to.
 * `@scope/pkg/deep` → `@scope/pkg`; `pkg/deep` → `pkg`; `./rel` → null.
 */
function packageOf(specifier: string): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
}

/**
 * Modules the package guarantees are present at runtime.
 *
 * `dependencies` are installed outright. Non-optional `peerDependencies` are
 * auto-installed by npm 7+. Anything in `peerDependenciesMeta` marked
 * `optional` is NOT — that is precisely the trap, so it is excluded here even
 * though it appears in `peerDependencies`.
 */
function guaranteed(manifest: Record<string, unknown>): Set<string> {
  const deps = Object.keys((manifest.dependencies as object) ?? {});
  const peers = Object.keys((manifest.peerDependencies as object) ?? {});
  const meta = (manifest.peerDependenciesMeta as Record<string, { optional?: boolean }>) ?? {};
  const requiredPeers = peers.filter((p) => meta[p]?.optional !== true);
  return new Set([...deps, ...requiredPeers, manifest.name as string]);
}

const violations: Violation[] = [];
const checked: string[] = [];

for (const dir of readdirSync(PACKAGES).sort()) {
  const distRoot = join(PACKAGES, dir, 'dist');
  const manifestPath = join(distRoot, 'package.json');
  if (!existsSync(manifestPath)) continue; // not built, or not a publishable package

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
  const allowed = guaranteed(manifest);
  checked.push(manifest.name as string);

  for (const file of emittedJs(distRoot)) {
    const source = readFileSync(file, 'utf-8');
    // Only EAGER requires matter — the ones that run at import time and throw
    // before a consumer can do anything about it. In tsc's CommonJS output those
    // are `const x_1 = require("…")` at column 0; a deliberate lazy load lives
    // inside a function and is therefore indented (see
    // eslint-devkit/src/resolver/resolver.ts, which try/catches a missing
    // oxc-resolver into a typed error). Flagging indented requires would fail
    // the very pattern this check tells people to adopt.
    // Anchored at column 0 = module scope. The wrapper is deliberately loose:
    // a default import compiles to `const ts_1 = __importDefault(require("ts"))`,
    // which an `= require(` anchor misses entirely — that is exactly how the
    // import-next break would have slipped through this check.
    for (const match of source.matchAll(
      /^(?:(?:const|var|let)\s+[\w$]+\s*=\s*.*?)?require\(\s*['"]([^'"]+)['"]\s*\)/gm,
    )) {
      const pkg = packageOf(match[1]!);
      if (pkg === null || BUILTINS.has(pkg) || allowed.has(pkg)) continue;

      const peers = (manifest.peerDependencies as Record<string, string>) ?? {};
      const reason =
        pkg in peers
          ? `declared only as an OPTIONAL peer — npm will not install it`
          : `not declared as a dependency or required peer`;
      violations.push({ pkg: manifest.name as string, file: file.slice(distRoot.length + 1), specifier: pkg, reason });
    }
  }
}

console.log(`Checked runtime requires across ${checked.length} built package(s).\n`);

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`  ✗ ${v.pkg}\n      ${v.file} requires "${v.specifier}"\n      ${v.reason}`);
  }
  console.error(
    `\n${violations.length} runtime require(s) that a consumer may not have.\n` +
      `A plain \`npm i -D <pkg>\` would throw Cannot find module.\n\n` +
      `Fix by one of:\n` +
      `  • import the value from a local shim (see eslint-devkit/src/ast-node-types.ts)\n` +
      `  • use \`import type\`, which is erased at compile time\n` +
      `  • load it lazily and tolerate absence (see import-next/src/utils/typescript-peer.ts)\n` +
      `  • or, if it genuinely must always be present, move it to \`dependencies\``,
  );
  process.exit(1);
}

console.log('No package requires a module it does not guarantee is installed.');
