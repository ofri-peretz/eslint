/**
 * BENCHMARK-CRITERIA.md §B1: a rule "self-skips test files — by path and by
 * filename (`*.spec.*`, `*.test.*`), **independent of the harness**".
 *
 * ## Why this is a rule's job and not the config's
 *
 * A consumer decides what gets linted. If they lint their tests — many do, to
 * catch unused imports and floating promises — a security rule firing on
 * `expect(() => obj[key]).toThrow()` is noise they can never act on, and noise
 * is what gets a plugin disabled.
 *
 * The measurement side of this repo made the same omission and paid for it:
 * `ilb-real-source` excluded test *directories* but not `src/config.test.ts`,
 * and the §A2 sampler's first run handed back `no-http-urls` firing on an
 * `expect(isOriginAllowed('http://foo.example.com', …))` assertion.
 *
 * ## The trap in the implementation
 *
 * `filename.includes('test')` is the obvious version and it is wrong: it makes
 * the verdict depend on where the repo is checked out, so the same file reports
 * from `~/src/app` and stays silent from `~/latest/app`. That shipped here once.
 * Hence segment equality for directories and a basename regex for filenames —
 * pinned below by the `latest/` and `contest-entry` cases, which must NOT skip.
 *
 * ## Opt-in, deliberately
 *
 * Every plugin in this monorepo shares one `createRule`. Defaulting the skip to
 * ON would silently cut findings for consumers of all 19 published packages on a
 * patch bump, and would be wrong for the non-security plugins where a naming or
 * complexity rule *should* apply to a test file. The `skipTestFiles=false` half
 * of the gate test below is the control that keeps this honest.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import { createRule, isTestFilePath } from './rule-creator';

describe('isTestFilePath', () => {
  it.each([
    'src/handler.test.ts',
    'src/handler.spec.js',
    'src/handler.test.tsx',
    'src/handler.spec.mts',
    'src/__tests__/handler.ts',
    'src/__mocks__/fs.ts',
    'test/handler.ts',
    'tests/handler.ts',
    // parse-server keeps its entire suite in `spec/`. Omitting it invalidated a
    // 20-repo benchmark run for both sides.
    'spec/handler.ts',
    'e2e/checkout.ts',
    'C:\\proj\\src\\__tests__\\handler.ts',
    // Kept from the hand-rolled predicates this replaced: test data and stand-ins
    // are scaffolding too. `detect-object-injection` carried `.fixture.`, and
    // `no-hardcoded-credentials` carried both.
    'src/users.fixture.ts',
    'src/fs.mock.ts',
    'src/fixtures/users.ts',
    // Nest's own e2e generator output, and the plain `mocks/` directory — both
    // carried by the hand-rolled predicates this replaced (mongodb/nestjs/jwt
    // and secure-coding respectively). `\.spec\.` does not match `e2e-spec`.
    'test/app.e2e-spec.ts',
    'src/app.e2e-spec.ts',
    'src/mocks/handlers.ts',
    // Compound directory names, which is how large repositories actually spell
    // it. sentry-javascript keeps its whole suite under these three; between
    // them they carried 243 findings that the exact-segment set alone missed.
    'dev-packages/e2e-tests/test-applications/express/src/app.mjs',
    'dev-packages/node-integration-tests/suites/express/server.mjs',
    'dev-packages/browser-integration-tests/suites/breadcrumbs/subject.js',
    'packages/core/unit-tests/index.ts',
    // Scaffolding FOR tests, which is scaffolding all the same.
    'src/domain/auth/testUtils/userTestUtil.ts',
    'src/test-utils/render.tsx',
    'packages/testing/src/index.ts',
    'src/testHelpers/build.ts',
    'src/test_data/users.ts',
    'apps/api/integration-test/login.ts',
    'src/acceptance-specs/checkout.ts',
    // No directory at all — the bare-filename path, which the separator split
    // has to handle without inventing an empty segment.
    'handler.test.ts',
  ])('treats %s as a test file', (f) => {
    expect(isTestFilePath(f)).toBe(true);
  });

  it.each([
    'src/handler.ts',
    // The cwd trap. A substring check on 'test' skips both of these, and the
    // first one means the rule's verdict depends on the checkout directory.
    '/Users/me/latest/src/handler.ts',
    'src/contest-entry.ts',
    'src/protest.ts',
    // Carried over from the nestjs predicate this replaced: a production
    // directory whose name merely contains a test word.
    'src/testimonials/testimonials.controller.ts',
    'src/specifications/index.ts',
    // `testing-library` is a dependency name, not a test directory of ours.
    'node_modules/@testing-library/react/index.js',
    // A file merely NAMED test, without the `.test.` infix, is source. Same for
    // the two additions above: the leading `.` is required, and `mocks` counts
    // as a directory segment only.
    'src/test.ts',
    'src/e2e-spec.ts',
    'src/mocks.ts',
    // The suffix rule requires a hyphen, so these production directories stay
    // production: without it, `latest` and `manifest` would both read as
    // directories of tests.
    'src/latest/index.ts',
    'src/manifest/build.ts',
    'src/greatest-hits/index.ts',
    // `test` starts `testimonials`; the support-directory pattern is spelled
    // out precisely so that prefix cannot leak into production code.
    'src/testimonials/index.ts',
    'src/tester/index.ts',
    // Bare filename, not a test — the other half of the no-directory path.
    'handler.ts',
    // Linter gives these when there is no file on disk; neither is a test file.
    '<input>',
    '<text>',
    '',
  ])('treats %s as source', (f) => {
    expect(isTestFilePath(f)).toBe(false);
  });
});

describe('createRule skipTestFiles gate', () => {
  const mk = (skipTestFiles: boolean) =>
    createRule<[], 'hit'>({
      name: 'probe',
      meta: { type: 'problem', docs: { description: 'probe' }, schema: [], messages: { hit: 'hit' } },
      skipTestFiles,
      defaultOptions: [],
      create: (context) => ({
        Identifier: (node) => context.report({ node, messageId: 'hit' }),
      }),
    });

  const run = (probe: unknown, filename: string) =>
    new Linter({ configType: 'flat' })
      .verify(
        'const x = 1;',
        [
          {
            // NOT `**/*`. A flat config whose only pattern is universal does not
            // apply, and ESLint answers with a `ruleId: null` "No matching
            // configuration found" message that a naive probe counts as a
            // finding — which is exactly how this gate was first mis-measured.
            files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'],
            plugins: { p: { rules: { probe } } },
            rules: { 'p/probe': 'error' },
          },
        ] as never,
        filename,
      )
      .filter((m) => m.ruleId).length;

  it('suppresses in test files when opted in', () => {
    const probe = mk(true);
    expect(run(probe, 'src/a.test.ts')).toBe(0);
    expect(run(probe, 'src/__tests__/a.ts')).toBe(0);
  });

  it('still reports in source files when opted in', () => {
    // Without this, "suppresses in test files" also passes on a rule that
    // suppresses everywhere.
    expect(run(mk(true), 'src/a.ts')).toBe(1);
  });

  it('CONTROL: reports in test files when NOT opted in', () => {
    // The mutation check. If this ever returns 0 the flag has become a no-op and
    // the two assertions above would pass on a rule that never had the gate.
    const probe = mk(false);
    expect(run(probe, 'src/a.test.ts')).toBe(1);
    expect(run(probe, 'src/__tests__/a.ts')).toBe(1);
  });
});
