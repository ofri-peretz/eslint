/**
 * Static runtime-dependency gate — the CI-speed version of the clean-install sweep.
 *
 * On 2026-08-03 every published plugin threw on `require`, from two separate
 * causes: the devkit imported a runtime value from a peer marked `optional`
 * (npm does not install those), and `eslint-plugin-import-next` imported
 * `typescript` while declaring no dependency on it at all.
 *
 * Both are the same shape — **emitted JS requires a module the package does not
 * guarantee is installed** — and both are decidable by reading the build output.
 * No install, no network, no sandbox. `verify-published-install.ts` proves the
 * same thing by actually installing, but takes ~2.5 minutes, which is too slow
 * to sit in front of every push; keep it for pre-release and for what static
 * analysis cannot see, such as a dependency that is declared but broken.
 *
 * Detection lives in scripts/lib/runtime-deps.ts so it can be unit-tested —
 * see scripts/__tests__/runtime-deps.test.ts.
 *
 *   tsx scripts/verify-runtime-deps.ts
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  allRequires,
  unusedDependencies,
  violationsIn,
  type Manifest,
  type UnusedDependency,
  type Violation,
} from './lib/runtime-deps';

const PACKAGES = join(resolve(__dirname, '..'), 'packages');

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

// Written by scripts/ci-build.mts: the packages THIS runner built. Present
// only in CI. Turning "dist is absent" from a silent skip into a hard failure
// is the whole point — a sharded build means each runner legitimately holds a
// subset, and without an expected list there is no way to tell a correct subset
// apart from a build that silently produced nothing.
const expectedPath = join(resolve(__dirname, '..'), '.ci-built-packages.json');
type BuiltEntry = { name: string; dir: string; emitsDist: boolean };
const expected: BuiltEntry[] | null = existsSync(expectedPath)
  ? (JSON.parse(readFileSync(expectedPath, 'utf-8')) as BuiltEntry[])
  : null;

const violations: Violation[] = [];
const unused: UnusedDependency[] = [];
const checked: string[] = [];

/**
 * Peer sets of each package, so a dependency declared only to satisfy another
 * dependency's peer is not mistaken for dead weight. Built from the same dist
 * manifests, which is enough: every such relationship in this repo is between
 * two workspace packages (eslint-plugin-import-next -> oxc-resolver, declared
 * because eslint-devkit peers it and lazily loads it).
 */
const peerSets = new Map<string, ReadonlySet<string>>();
for (const dir of readdirSync(PACKAGES).sort()) {
  const m = join(PACKAGES, dir, 'dist', 'package.json');
  if (!existsSync(m)) continue;
  const j = JSON.parse(readFileSync(m, 'utf-8')) as Manifest;
  if (j.name)
    peerSets.set(j.name, new Set(Object.keys(j.peerDependencies ?? {})));
}

for (const dir of readdirSync(PACKAGES).sort()) {
  // `<pkg>/dist` is the publishable artifact (see scripts/build-package.ts).
  // Absent when the package is not built — on PRs turbo filters to affected
  // packages, so this checks those; main builds everything.
  const distRoot = join(PACKAGES, dir, 'dist');
  const manifestPath = join(distRoot, 'package.json');
  if (!existsSync(manifestPath)) continue;

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest;
  checked.push(manifest.name ?? dir);

  const loadedAnywhere: string[] = [];
  for (const file of emittedJs(distRoot)) {
    const source = readFileSync(file, 'utf-8');
    violations.push(
      ...violationsIn(source, manifest, file.slice(distRoot.length + 1)),
    );
    // Lazy requires count as usage even though violationsIn ignores them.
    loadedAnywhere.push(...allRequires(source));
  }

  // Only peers of THIS package's own dependencies can justify a declaration.
  const relevantPeers = new Map<string, ReadonlySet<string>>();
  for (const dep of Object.keys(manifest.dependencies ?? {})) {
    const peers = peerSets.get(dep);
    if (peers) relevantPeers.set(dep, peers);
  }
  unused.push(...unusedDependencies(manifest, loadedAnywhere, relevantPeers));
}

console.log(
  `Checked runtime requires across ${checked.length} built package(s).\n`,
);

if (expected) {
  // Only packages that actually emit a dist/ are checkable; apps and private
  // workspaces do not publish one. Intersect against what the build produced
  // rather than demanding all of them.
  // `emitsDist` comes from the build script itself, so this no longer guesses a
  // directory from the package name — that guess mapped
  // @interlace/eslint-config to packages/eslint-config (the real dir is
  // eslint-config-interlace) and demanded a dist from private, build-less
  // packages like @interlace/eslint-formatter-sarif.
  const missing = expected.filter((e) => e.emitsDist && !checked.includes(e.name)).map((e) => e.name);
  if (missing.length > 0) {
    console.error(
      `::error::These packages were built by this shard but have no dist/package.json to verify:\n` +
        missing.map((m) => `  - ${m}`).join('\n') +
        `\nThe build did not emit what it claimed to. Refusing to report success.`,
    );
    process.exit(1);
  }
}

// 0 checked is only a defect when something was supposed to be there. A build
// shard whose bucket holds no affected package legitimately produces nothing —
// it writes an empty expectation list to say so. Without that distinction this
// guard failed correct, empty shards (observed on PR #368, Build 1/4).
const expectedDistCount = expected?.filter((e) => e.emitsDist).length ?? null;
if (checked.length === 0 && expectedDistCount !== 0) {
  console.error(
    expectedDistCount === null
      ? '::error::Verified 0 packages and no build manifest was found. This gate cannot pass without inspecting at least one built artifact.'
      : `::error::Verified 0 packages, but the build claimed ${expectedDistCount} publishable package(s). The build did not emit what it claimed to.`,
  );
  process.exit(1);
}
if (checked.length === 0) {
  console.log('This shard built no publishable package — nothing to verify.');
}

if (violations.length > 0) {
  for (const v of violations) {
    console.error(
      `  ✗ ${v.pkg}\n      ${v.file} requires "${v.specifier}"\n      ${v.reason}`,
    );
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

if (unused.length > 0) {
  console.error(
    `\n${unused.length} declared dependenc(y|ies) that nothing loads:\n`,
  );
  for (const u of unused) {
    console.error(`  ✗ ${u.pkg}\n      "${u.dependency}"\n      ${u.reason}`);
  }
  console.error(
    '\n  Weight every consumer installs for nothing. Remove it, or if it exists\n' +
      '  to satisfy a peer of another dependency, that relationship should be\n' +
      "  visible in that dependency's peerDependencies.\n",
  );
  process.exit(1);
}

console.log('No package requires a module it does not guarantee is installed.');
console.log('No package declares a dependency it never loads.');
