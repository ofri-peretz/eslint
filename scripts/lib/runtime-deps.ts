/**
 * Detection logic for the runtime-dependency gate.
 *
 * Lives apart from the CLI so it can be unit-tested: these three functions are
 * the entire reason two production breaks are now catchable, and a plausible
 * "tidy-up" of any of them silently disarms the gate. Specifically, tightening
 * `.*?` in the eager-require pattern to `= ` reintroduces the exact miss that
 * let the import-next break through, and inverting the optional-peer test turns
 * the devkit trap back into a pass.
 *
 * See scripts/__tests__/runtime-deps.test.ts for the locks.
 */
import { builtinModules } from 'node:module';

/** Node builtins, bare and `node:`-prefixed. */
export const BUILTINS: ReadonlySet<string> = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]);

/**
 * The bare package a specifier resolves to.
 * `@scope/pkg/deep` → `@scope/pkg`; `pkg/deep` → `pkg`; relative/absolute → null.
 */
export function packageOf(specifier: string): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : (parts[0] ?? null);
}

export interface Manifest {
  name?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

/**
 * Modules the package guarantees exist at runtime.
 *
 * `dependencies` are installed outright, and npm 7+ auto-installs non-optional
 * `peerDependencies`. Peers marked `optional` are deliberately NOT included —
 * npm skips those, which is precisely how every published plugin ended up
 * throwing `Cannot find module '@typescript-eslint/utils'`.
 */
export function guaranteed(manifest: Manifest): Set<string> {
  const meta = manifest.peerDependenciesMeta ?? {};
  const requiredPeers = Object.keys(manifest.peerDependencies ?? {}).filter(
    (p) => meta[p]?.optional !== true,
  );
  const names = [...Object.keys(manifest.dependencies ?? {}), ...requiredPeers];
  if (manifest.name !== undefined) names.push(manifest.name);
  return new Set(names);
}

/**
 * Specifiers `require`d at module scope in emitted CommonJS.
 *
 * Only column-0 requires count. A require indented inside a function is a
 * deliberate lazy load that tolerates absence (see
 * `eslint-devkit/src/resolver/resolver.ts` and
 * `eslint-plugin-import-next/src/utils/typescript-peer.ts`, both of which
 * try/catch a missing optional peer into a typed result) — flagging those would
 * fail the very pattern this gate tells people to adopt.
 *
 * The binding prefix is optional and loose on purpose. tsc emits several forms:
 *
 *   const x_1 = require("pkg");                             // named import
 *   const x_1 = tslib_1.__importDefault(require("pkg"));    // default import
 *   const { a } = require("pkg");                           // destructured
 *   require("pkg");                                         // side-effect only
 *
 * An anchor of `= require(` matches only the first, and that gap is not
 * hypothetical: it let the `import ts from 'typescript'` break pass unnoticed.
 */
export function eagerRequires(source: string): string[] {
  const pattern = /^(?:(?:const|var|let)\s+(?:[\w$]+|\{[^}]*\}|\[[^\]]*\])\s*=\s*.*?)?require\(\s*['"]([^'"]+)['"]\s*\)/gm;
  return [...source.matchAll(pattern)].map((m) => m[1]!);
}

/** A require of something the package does not guarantee is installed. */
export interface Violation {
  pkg: string;
  file: string;
  specifier: string;
  reason: string;
}

/** Violations in one emitted file, given its owning manifest. */
export function violationsIn(source: string, manifest: Manifest, file: string): Violation[] {
  const allowed = guaranteed(manifest);
  const peers = manifest.peerDependencies ?? {};
  const out: Violation[] = [];
  for (const specifier of eagerRequires(source)) {
    const pkg = packageOf(specifier);
    if (pkg === null || BUILTINS.has(pkg) || allowed.has(pkg)) continue;
    out.push({
      pkg: manifest.name ?? '(unnamed)',
      file,
      specifier: pkg,
      reason:
        pkg in peers
          ? 'declared only as an OPTIONAL peer — npm will not install it'
          : 'not declared as a dependency or required peer',
    });
  }
  return out;
}
