/**
 * Toolchain helper — operationalizes roadmap item 1.14 (TS-compiler matrix).
 *
 * Every bench result MUST embed a toolchain block matching this shape so a
 * number is interpretable years later and the tsc-classic → tsc-go transition
 * is observable in the data, not invisible.
 *
 *   {
 *     node:              "20.18.1",
 *     eslint:            "9.18.0",
 *     typescript:        "5.6.3",
 *     tsCompiler:        "tsc-classic" | "tsc-go",
 *     typescriptEslint:  "8.19.1",
 *     platform:          "darwin-arm64"
 *   }
 *
 * The `tsCompiler` field distinguishes the legacy tsc (5.x and earlier) from
 * tsc-go / Project Corsa (the Go-rewritten compiler shipping in TypeScript 6).
 * Without it, perf regressions caused by switching compilers look like rule
 * regressions instead of compiler transitions.
 */

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);

function safeReadVersion(pkgName) {
  try {
    return require(`${pkgName}/package.json`).version;
  } catch {
    return null;
  }
}

function detectTsCompiler(typescriptVersion) {
  // TypeScript 6 ships tsc-go (Project Corsa). Pre-6 is tsc-classic.
  // When a v6 build also ships an opt-in flag for the legacy compiler, this
  // detection should be revisited — see roadmap item 1.14.
  if (!typescriptVersion) return 'unknown';
  const major = Number.parseInt(typescriptVersion.split('.')[0], 10);
  if (Number.isNaN(major)) return 'unknown';
  return major >= 6 ? 'tsc-go' : 'tsc-classic';
}

function detectPlatform() {
  const { platform, arch } = process;
  return `${platform}-${arch}`;
}

/**
 * Build the toolchain block for the current process.
 *
 * @param {object} [overrides] - test-only overrides for deterministic snapshots.
 * @returns {object} a toolchain block ready to embed under `result.toolchain`.
 */
export function getToolchain(overrides = {}) {
  const node = process.version.replace(/^v/, '');
  const eslint = safeReadVersion('eslint');
  const typescript = safeReadVersion('typescript');
  const typescriptEslint = safeReadVersion('@typescript-eslint/parser') ?? safeReadVersion('typescript-eslint');
  const tsCompiler = detectTsCompiler(typescript);
  const platform = detectPlatform();

  return {
    node,
    eslint,
    typescript,
    tsCompiler,
    typescriptEslint,
    platform,
    ...overrides,
  };
}

/**
 * Validate a toolchain block emitted by another process / older run. Returns
 * an array of human-readable issues (empty if valid).
 *
 * @param {object} toolchain
 * @returns {string[]}
 */
export function validateToolchain(toolchain) {
  const issues = [];
  if (!toolchain || typeof toolchain !== 'object') {
    return ['toolchain block missing or not an object'];
  }
  for (const field of ['node', 'eslint', 'typescript', 'tsCompiler', 'platform']) {
    if (!toolchain[field]) issues.push(`toolchain.${field} missing`);
  }
  if (toolchain.tsCompiler && !['tsc-classic', 'tsc-go', 'unknown'].includes(toolchain.tsCompiler)) {
    issues.push(`toolchain.tsCompiler must be "tsc-classic" | "tsc-go" | "unknown"`);
  }
  return issues;
}

/**
 * Best-effort detection of which tsc binary would actually run if invoked
 * from the current cwd. Useful when CI pins a specific compiler via
 * `npx tsc-go` vs `npx tsc`. Returns `null` if no tsc resolvable.
 */
export function resolveTscBinary() {
  try {
    const out = execSync('which tsc 2>/dev/null', { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}
