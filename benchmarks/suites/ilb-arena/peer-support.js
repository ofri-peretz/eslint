/**
 * Which ESLint majors a benchmarked peer says it supports.
 *
 * Split out of run.js so it can be asserted directly. The arena refuses to
 * score a config that fails to load — a silent `[]` is indistinguishable from
 * a plugin that genuinely finds nothing, and that is how a stale import once
 * put Interlace last at F1 0%. But a peer that never claimed to run on the
 * ESLint major under test is a different fact: excluding it is honest,
 * crashing the whole matrix leg over someone else's support policy is not.
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import semver from 'semver';

const require = createRequire(import.meta.url);

export const NPM_PACKAGE_NAMES = {
  'eslint-plugin-security': 'eslint-plugin-security',
  sonarjs: 'eslint-plugin-sonarjs',
  'microsoft-sdl': '@microsoft/eslint-plugin-sdl',
  'no-secrets': 'eslint-plugin-no-secrets',
  unicorn: 'eslint-plugin-unicorn',
  react: 'eslint-plugin-react',
  'jsx-a11y': 'eslint-plugin-jsx-a11y',
  'eslint-plugin-n': 'eslint-plugin-n',
  import: 'eslint-plugin-import',
  promise: 'eslint-plugin-promise',
  regexp: 'eslint-plugin-regexp',
  'no-unsanitized': 'eslint-plugin-no-unsanitized',
  jsdoc: 'eslint-plugin-jsdoc',
  jest: 'eslint-plugin-jest',
  vue: 'eslint-plugin-vue',
  angular: '@angular-eslint/eslint-plugin',
  'security-node': 'eslint-plugin-security-node',
  interlace: 'eslint-plugin-secure-coding',
};

/** Our own entry. A load failure here is always fatal — never "unsupported". */
export const OUR_PLUGIN_NAME = 'interlace';

/**
 * The peer's declared `peerDependencies.eslint`, or null if it declares none.
 *
 * Resolves the entrypoint and walks up, rather than requiring
 * `<pkg>/package.json` directly — several peers (eslint-plugin-unicorn among
 * them) omit `./package.json` from their `exports` map, so the direct form
 * throws ERR_PACKAGE_PATH_NOT_EXPORTED and every peer silently reads as
 * "declares nothing". Same walk as getInstalledVersion, for the same reason.
 */
export function peerEslintRange(pluginName) {
  const pkgName = NPM_PACKAGE_NAMES[pluginName] || pluginName;
  try {
    let dir = path.dirname(require.resolve(pkgName));
    for (let i = 0; i < 5; i++) {
      const candidate = path.join(dir, 'package.json');
      if (fs.existsSync(candidate)) {
        const pkg = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
        if (pkg.name === pkgName) return pkg.peerDependencies?.eslint ?? null;
      }
      dir = path.dirname(dir);
    }
    return null;
  } catch {
    return null;
  }
}

/*
 * A peer's own declared ESLint support, from its package.json.
 *
 * Used only to interpret a config that FAILED to load. A plugin that does not
 * claim support for the ESLint major under test is a fact about that plugin's
 * compatibility, not a defect in this harness — recording it as `unsupported`
 * keeps the other cells scoring. A plugin that DOES claim support and still
 * fails to load is a real break, and still stops the run.
 */
export function declaresSupportFor(pluginName, eslintVersion) {
  const range = peerEslintRange(pluginName);
  // No declared range = no claim either way. Treat as claiming support, so an
  // unannotated peer breaking is still surfaced rather than swallowed.
  if (!range) return true;
  try {
    return semver.satisfies(semver.coerce(eslintVersion), range, {
      includePrerelease: true,
    });
  } catch {
    return true;
  }
}

/** Sentinel: the peer cannot run here and must be excluded, not scored. */
export const UNSUPPORTED = Symbol('unsupported-on-this-eslint');

/**
 * A peer that DECLARES support for this ESLint and throws anyway.
 *
 * Distinct from UNSUPPORTED, which is a peer honestly saying it does not run
 * here. This is an upstream defect, and it is data about that plugin — but it
 * is not a score. The old code returned `[]`, which scored as "found nothing";
 * #891 replaced that with `process.exit(3)`, which is honest but means one
 * peer's bug leaves the whole matrix unmeasured. Neither is right: a crash is
 * its own state, recorded and reported, never scored, and never fatal for
 * somebody else's code.
 *
 * Our own plugin is exempt — if Interlace cannot run, that is our bug and it
 * must stop the run.
 */
export const CRASHED = Symbol('crashed-at-runtime');

/** Wrap a runtime failure so the caller can tell it from a result array. */
export const crash = (message) => ({ [CRASHED]: message });

/** The failure message, or null when `value` is a normal result. */
export const crashMessage = (value) =>
  value !== null && typeof value === 'object' && CRASHED in value
    ? value[CRASHED]
    : null;
