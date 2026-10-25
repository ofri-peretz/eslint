/**
 * Every rule test, on both engines.
 *
 * Each plugin's vitest config aliases `@typescript-eslint/rule-tester` here, so
 * the 771 test files keep their one import and gain a second engine: `run()`
 * hands the cases to the real ESLint `RuleTester` first, then — for a rule
 * whose `meta.interop.runtimes` includes `oxlint` — to oxlint's own
 * `RuleTester` (`oxlint/plugins-dev`), which loads the rule through
 * `createOnce`, the way oxlint and Vite+ do. A rule that claims oxlint and
 * diverges there fails its own suite.
 *
 * Translation is mechanical, in `eslintCompat` mode (oxlint's switch for
 * ESLint-shaped cases: 1-based columns, `sourceType: module`):
 *   - the parser becomes `parserOptions.lang` (ts/tsx/js/jsx); a filename's
 *     extension still wins, as it does in oxlint;
 *   - type-aware cases (`parserOptions.project` / `projectService`) stay
 *     ESLint-only: oxlint has no parser services;
 *   - a case with no filename gets typescript-eslint's default (`file.ts`,
 *     `react.tsx` with JSX), so filename-sensitive rules see the same name;
 *   - exact duplicate cases run once (oxlint's tester rejects duplicates);
 *   - a case oxc refuses to parse is SKIPPED, visibly, not passed: input
 *     oxlint cannot parse is linted by no rule at all, so it says nothing
 *     about the rule (duplicate exports, a spec early error ESLint's parsers
 *     accept, for one);
 *   - ESLint-only case fields (`type` on errors, a numeric `suggestions`
 *     count, `skip`, `dependencyConstraints`) are dropped, and skipped cases
 *     are not run.
 *
 * `DUAL_ENGINE_SURVEY=<file>` runs oxlint for EVERY rule without failing,
 * appending each rule's failures to <file> as JSON lines: the evidence
 * `meta.interop.runtimes` is set from (scripts/survey-oxlint-runtimes.mts).
 *
 * See docs/intents/oxlint-native-plugin-names/design.md (R10, R11).
 */
import { appendFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterAll, describe, it } from 'vitest';
import { RuleTester as OxlintRuleTester } from 'oxlint/plugins-dev';
import type * as TSRuleTesterModule from '@typescript-eslint/rule-tester';

// `require`, not `import`: the vitest alias that points the package here would
// otherwise point this file at itself.
const real = createRequire(import.meta.url)(
  '@typescript-eslint/rule-tester',
) as typeof TSRuleTesterModule;

type Dict = Record<string, unknown>;
type Case = string | Dict;
type Tests = { valid: Case[]; invalid: Dict[] };

const SURVEY = process.env.DUAL_ENGINE_SURVEY;

/**
 * Survey only: rule object → its ID in this package's rule map, so a failure
 * is recorded against `<package>/<rule>` whatever name the test passed.
 * vitest runs each package from its own directory.
 */
const ruleIds = new Map<unknown, string[]>(); // a rule may be exported under legacy aliases too
if (SURVEY) {
  try {
    const index = (await import(`${process.cwd()}/src/index.ts`)) as {
      rules?: Record<string, unknown>;
    };
    for (const [id, rule] of Object.entries(index.rules ?? {}))
      ruleIds.set(rule, [...(ruleIds.get(rule) ?? []), id]);
  } catch {
    // The devkit has no rule map; its factory tests are recorded by name.
  }
}

function lang(languageOptions: Dict | undefined, fallback: string): string {
  const parserOptions = (languageOptions?.parserOptions ?? {}) as Dict;
  const jsx = (parserOptions.ecmaFeatures as Dict | undefined)?.jsx === true;
  const parser = languageOptions?.parser as Dict | undefined;
  const isTs =
    parser === undefined
      ? fallback.startsWith('ts')
      : /typescript-eslint/.test(
          String((parser.meta as Dict | undefined)?.name ?? ''),
        ) || typeof parser.parseForESLint === 'function';
  return `${isTs ? 'ts' : 'js'}${jsx ? 'x' : ''}`;
}

function isTypeAware(languageOptions: Dict | undefined): boolean {
  const parserOptions = (languageOptions?.parserOptions ?? {}) as Dict;
  return Boolean(parserOptions.project || parserOptions.projectService);
}

function oxlintLanguageOptions(
  languageOptions: Dict | undefined,
  fallback: string,
): Dict {
  const out: Dict = {
    parserOptions: { lang: lang(languageOptions, fallback) },
  };
  if (
    languageOptions?.sourceType &&
    languageOptions.sourceType !== 'unambiguous'
  ) {
    out.sourceType = languageOptions.sourceType;
  }
  if (languageOptions?.globals) out.globals = languageOptions.globals;
  return out;
}

function convertCase(
  raw: Case,
  defaults: Dict | undefined,
  fallback: string,
): Dict | null {
  const item: Dict = typeof raw === 'string' ? { code: raw } : { ...raw };
  if (item.skip) return null;
  const merged = {
    ...(defaults ?? {}),
    ...((item.languageOptions as Dict | undefined) ?? {}),
    parserOptions: {
      ...((defaults?.parserOptions as Dict | undefined) ?? {}),
      ...(((item.languageOptions as Dict | undefined)?.parserOptions as
        Dict | undefined) ?? {}),
    },
  } as Dict;
  if (isTypeAware(merged)) return null;
  delete item.skip;
  delete item.dependencyConstraints;
  delete item.only;
  if ('output' in item && item.output === undefined) delete item.output;
  // typescript-eslint takes one output per fix pass; oxlint takes the final
  // output plus the number of extra passes that produce it.
  if (Array.isArray(item.output)) {
    item.recursive = item.output.length - 1;
    item.output = item.output[item.output.length - 1];
  }
  const languageOptions = oxlintLanguageOptions(merged, fallback);
  item.languageOptions = languageOptions;
  if (item.filename === undefined) {
    const lang = (languageOptions.parserOptions as { lang: string }).lang;
    if (lang === 'ts') item.filename = 'file.ts';
    if (lang === 'tsx') item.filename = 'react.tsx';
  }
  if (Array.isArray(item.errors)) {
    item.errors = item.errors.map((error: unknown) => {
      if (typeof error !== 'object' || error === null) return error;
      const { type: _type, ...rest } = error as Dict;
      // typescript-eslint accepts a suggestion COUNT; oxlint wants the full
      // suggestion objects. The count stays checked on the ESLint run.
      if (typeof rest.suggestions === 'number') delete rest.suggestions;
      return rest;
    });
  }
  return item;
}

/** JSON with object keys sorted at every level. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Dict)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

/**
 * oxlint's tester rejects duplicate cases, comparing everything except
 * `name`, `errors` and `output`; run each such case once.
 */
function unique(cases: (Dict | null)[], seen: Set<string>): Dict[] {
  return cases.filter((c): c is Dict => {
    if (!c) return false;
    const { name: _n, errors: _e, output: _o, ...identity } = c;
    // Key order must not matter: oxlint compares with a stable stringify.
    const key = stableStringify(identity);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const unparseable = (error: unknown) =>
  String((error as Error | undefined)?.message).startsWith('Parsing failed');

function runtimesOf(rule: unknown): readonly string[] | undefined {
  return (rule as { meta?: { interop?: { runtimes?: string[] } } }).meta
    ?.interop?.runtimes;
}

export class RuleTester extends real.RuleTester {
  readonly #config: Dict;

  constructor(config?: Dict) {
    super(config as never);
    this.#config = config ?? {};
  }

  override run(name: string, rule: never, tests: never): void {
    super.run(name, rule, tests);

    const runtimes = runtimesOf(rule);
    // Published rules all declare runtimes (interop-runtimes lock); a test's ad-hoc
    // rule that declares none stays on ESLint.
    const claimsOxlint = runtimes?.includes('oxlint') ?? false;
    if (!claimsOxlint && !SURVEY) return;
    if (
      typeof (rule as { createOnce?: unknown }).createOnce !== 'function' &&
      typeof (rule as { create?: unknown }).create !== 'function'
    )
      return;

    const defaults = this.#config.languageOptions as Dict | undefined;
    // typescript-eslint's RuleTester parses TypeScript unless told otherwise.
    const fallback =
      defaults?.parser === undefined ? 'ts' : lang(defaults, 'ts');
    const { valid, invalid } = tests as Tests;
    const seen = new Set<string>();
    const oxValid = unique(
      valid.map((c) => convertCase(c, defaults, fallback)),
      seen,
    );
    const oxInvalid = unique(
      invalid.map((c) => convertCase(c, defaults, fallback)),
      seen,
    );
    if (oxValid.length === 0 && oxInvalid.length === 0) return;

    const tester = new OxlintRuleTester({ eslintCompat: true });
    if (SURVEY) {
      // Inside real vitest tests, so the suite's beforeAll/beforeEach fixtures
      // (temp dirs, lock files) exist exactly as they do on the ESLint run;
      // each case's outcome is recorded instead of failing.
      const failures: string[] = [];
      let unparsed = 0;
      const total = oxValid.length + oxInvalid.length;
      describe(`${name} (oxlint survey)`, () => {
        OxlintRuleTester.describe = describe;
        OxlintRuleTester.it = ((text: string, fn: () => void) =>
          it(text, () => {
            try {
              fn();
            } catch (error) {
              if (unparseable(error)) unparsed++;
              else
                failures.push(
                  `${text}: ${String((error as Error).message).split('\n')[0]}`,
                );
            }
          })) as typeof OxlintRuleTester.it;
        try {
          tester.run(name, rule, {
            valid: oxValid,
            invalid: oxInvalid,
          } as never);
        } catch (error) {
          failures.push(
            `(load) ${String((error as Error).message).split('\n')[0]}`,
          );
        }
        afterAll(() => {
          appendFileSync(
            SURVEY,
            JSON.stringify({
              package: process.cwd().split('/').pop(),
              rules: ruleIds.get(rule) ?? [],
              testName: name,
              cases: total - unparsed,
              unparsed,
              failures,
            }) + '\n',
          );
        });
      });
      return;
    }

    OxlintRuleTester.describe = describe;
    OxlintRuleTester.it = ((text: string, fn: () => void) =>
      it(text, (ctx) => {
        try {
          fn();
        } catch (error) {
          // oxc cannot parse this input, so no rule ever sees it: skipped,
          // visibly, rather than counted as a pass or a rule failure.
          if (unparseable(error)) ctx.skip();
          throw error;
        }
      })) as typeof OxlintRuleTester.it;
    describe(`${name} (oxlint)`, () => {
      tester.run(name, rule, { valid: oxValid, invalid: oxInvalid } as never);
    });
  }
}

export const { noFormat } = real;
