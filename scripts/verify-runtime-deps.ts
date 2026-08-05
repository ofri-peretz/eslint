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
