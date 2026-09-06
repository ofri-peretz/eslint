/**
 * The cross-version matrix must not die on a peer's support policy.
 *
 * ILB-Arena refuses to score a config that fails to load, deliberately: a
 * silent `[]` is indistinguishable from a plugin that genuinely finds nothing,
 * and that is how a stale import once put Interlace last at F1 0%.
 *
 * But `eslint-plugin-unicorn@74` declares `peerDependencies.eslint: ">=10.4"`.
 * On the matrix's eslint-8.x cell its config cannot load, and the refusal took
 * the whole leg down with it — issue #891, red every week since 2026-08-15,
 * while our own rules were fine on all three majors.
 *
 * So the two cases are now distinguished, and this lock pins the distinction:
 * a peer that never claimed this major is excluded; anything else still stops
 * the run.
 */
import { describe, expect, it } from 'vitest';
import {
  NPM_PACKAGE_NAMES,
  OUR_PLUGIN_NAME,
  declaresSupportFor,
  peerEslintRange,
} from '../suites/ilb-arena/peer-support.js';

describe('a peer is only excused when it never claimed the major', () => {
  it('reads a declared range through an exports map that hides package.json', () => {
    // eslint-plugin-unicorn omits "./package.json" from `exports`, so
    // require.resolve('<pkg>/package.json') throws ERR_PACKAGE_PATH_NOT_EXPORTED.
    // Resolving that to null would make every peer read as "declares nothing"
    // — which is the `true` branch, and the leg dies again.
    expect(peerEslintRange('unicorn')).toBe('>=10.4');
  });

  it('excuses unicorn on eslint 8, the cell that was failing', () => {
    expect(declaresSupportFor('unicorn', '8.57.1')).toBe(false);
  });

  it('still scores unicorn on the majors it does claim', () => {
    expect(declaresSupportFor('unicorn', '10.10.0')).toBe(true);
  });

  it('never excuses our own plugin — a load failure there is always fatal', () => {
    expect(OUR_PLUGIN_NAME).toBe('interlace');
    expect(NPM_PACKAGE_NAMES[OUR_PLUGIN_NAME]).toBe(
      'eslint-plugin-secure-coding',
    );
  });

  it('treats an undeclared range as a claim of support, so it still fails loud', () => {
    expect(peerEslintRange('no-such-plugin-anywhere')).toBeNull();
    expect(declaresSupportFor('no-such-plugin-anywhere', '8.57.1')).toBe(true);
  });
});
