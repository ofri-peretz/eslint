/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Rule Creator - Main utility for creating well-typed ESLint rules
 *
 * Ported from typescript-eslint's ESLintUtils.RuleCreator.
 * Provides a factory function for creating rules with proper types and documentation
 *
 * ponytail: this ~40-line port is the whole reason `@typescript-eslint/utils`
 * can be an OPTIONAL peer instead of a hard dependency. `RuleCreator` was the
 * only runtime import we ever made from it, and pulling it in as a dependency
 * dragged its non-optional `typescript` peer — 24 MB of compiler — into every
 * install of every plugin built on this devkit, including plain-JS projects.
 * Types still come from the package (type-only imports cost nothing at
 * runtime); `rule-creator.parity.test.ts` diffs this implementation against
 * the upstream one on every run so the port can't silently drift.
 */
import { isGeneratedFile } from './generated-file';
import { isMinifiedFile } from './minified-file';
import type { TSESLint } from '@typescript-eslint/utils';

// The `TSESLint` import above is type-only — it is erased at compile time and
// never appears in the emitted JS. That is the whole point: the types stay,
// the runtime dependency (and its 24 MB `typescript` peer) does not.

/**
 * Documentation URL resolver function type
 */
type DocsUrl = (ruleName: string) => string;

/**
 * Check if the variable contains an object strictly rejecting arrays
 */
function isObjectNotArray(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj != null && !Array.isArray(obj);
}

/**
 * Pure function - doesn't mutate either parameter!
 * Merges two objects deeply, second overwriting first.
 */
// ponytail: upstream defaults both params to `{}`; dropped here because this
// is module-private and every call site passes two objects (both are guarded
// by `isObjectNotArray` first).
function deepMerge(
  first: Record<string, unknown>,
  second: Record<string, unknown>,
): Record<string, unknown> {
  const keys = new Set([...Object.keys(first), ...Object.keys(second)]);

  return Object.fromEntries(
    [...keys].map((key) => {
      const firstHasKey = key in first;
      const secondHasKey = key in second;
      const firstValue = first[key];
      const secondValue = second[key];

      if (firstHasKey && secondHasKey) {
        return [
          key,
          isObjectNotArray(firstValue) && isObjectNotArray(secondValue)
            ? deepMerge(firstValue, secondValue)
            : secondValue,
        ];
      }

      return [key, firstHasKey ? firstValue : secondValue];
    }),
  );
}

/**
 * Pure function - doesn't mutate either parameter!
 * Uses the default options and overrides with the options provided by the user
 */
export function applyDefault<Options extends readonly unknown[]>(
  defaultOptions: Options,
  userOptions: readonly unknown[] | null,
): Options {
  const options = structuredClone(defaultOptions) as unknown as unknown[];

  if (userOptions == null) {
    return options as unknown as Options;
  }

  options.forEach((opt, i) => {
    if (userOptions[i] !== undefined) {
      const userOpt = userOptions[i];
      options[i] =
        isObjectNotArray(userOpt) && isObjectNotArray(opt)
          ? deepMerge(opt, userOpt)
          : userOpt;
    }
  });

  return options as unknown as Options;
}

/**
 * Rule shapes, mirroring `ESLintUtils`'s own. Reconstructed from the
 * `TSESLint` type namespace so they survive `@typescript-eslint/utils` being
 * an optional peer — these are type-only and emit nothing.
 */
export type NamedCreateRuleMeta<
  MessageIds extends string,
  PluginDocs = unknown,
  Options extends readonly unknown[] = [],
> = {
  docs: PluginDocs & TSESLint.RuleMetaDataDocs;
} & Omit<TSESLint.RuleMetaData<MessageIds, PluginDocs, Options>, 'docs'>;

export interface RuleCreateAndOptions<
  Options extends readonly unknown[],
  MessageIds extends string,
> {
  create: (
    context: Readonly<TSESLint.RuleContext<MessageIds, Options>>,
    optionsWithDefault: Readonly<Options>,
  ) => TSESLint.RuleListener;
  defaultOptions?: Readonly<Options>;
  /**
   * BENCHMARK-CRITERIA.md §B1: "self-skips test files — by path and by filename
   * (`*.spec.*`, `*.test.*`), **independent of the harness**".
   *
   * Opt-in rather than default-on, deliberately. Every plugin in this monorepo
   * shares one `createRule`, so flipping the default would silently cut findings
   * for consumers of all 19 published packages on a patch bump — and it would be
   * wrong for the non-security plugins, where a naming or complexity rule
   * *should* apply to a test file.
   *
   * Set it as each rule goes through the lock protocol, alongside the test that
   * pins it.
   */
  skipTestFiles?: boolean;

  /**
   * Skip files whose header declares them machine-generated.
   *
   * The counterpart to `skipTestFiles`, and opt-in for the same reason. The
   * cases are not symmetric, though: the note above says a complexity rule
   * *should* apply to a test file, because a convoluted test is still a
   * readability cost to whoever debugs it. Generated code has no such reader.
   * It is rewritten wholesale by the next generator run, and its header
   * usually says so outright.
   *
   * Measured on the pinned 8-repository corpus: 32% of `cognitive-complexity`
   * findings and 27% of `max-parameters` findings were in generated files.
   *
   * Only for rules that give **maintainability advice**. A security rule must
   * not set this — generated code ships and runs, so an injection in it is a
   * live vulnerability regardless of what typed it.
   */
  skipGeneratedFiles?: boolean;

  /**
   * Skip machine-packed output — minified bundles and the like.
   *
   * The third member of this family, and opt-in for the same reason as the
   * other two. Decided from the file's own shape rather than its path: `dist/`,
   * `.min.js` and `vendor/` are conventions a stranger's repository is free to
   * ignore, and the single largest offender on the pinned corpus is called
   * `assets/speedscope/import.bcbb2033.js`, which announces nothing.
   *
   * Measured there: 8 files carried 2,446 of `no-magic-numbers`' findings.
   *
   * Only for rules that give MAINTAINABILITY advice. A security rule must not
   * set this — a bundle ships and runs, and a minified bundle is exactly where
   * a supply-chain problem would hide.
   */
  skipMinifiedFiles?: boolean;
}

export interface RuleWithMeta<
  Options extends readonly unknown[],
  MessageIds extends string,
  Docs = unknown,
> extends RuleCreateAndOptions<Options, MessageIds> {
  meta: TSESLint.RuleMetaData<MessageIds, Docs, Options>;
  name?: string;
}

export interface RuleWithMetaAndName<
  Options extends readonly unknown[],
  MessageIds extends string,
  Docs = unknown,
> extends RuleCreateAndOptions<Options, MessageIds> {
  meta: NamedCreateRuleMeta<MessageIds, Docs, Options>;
  name: string;
}

export type RuleModuleWithName<
  MessageIds extends string,
  Options extends readonly unknown[] = [],
  Docs = unknown,
> = TSESLint.RuleModule<MessageIds, Options, Docs> & { name: string };

/**
 * Test files, decided from the path STRUCTURE — never from a substring of the
 * whole path.
 *
 * `filename.includes('test')` makes a rule's verdict depend on where the repo is
 * checked out: the same file reports from `~/src/app` and stays silent from
 * `~/latest/app`. That has already shipped here once. So: the basename decides
 * the `*.test.*` / `*.spec.*` case, and exact SEGMENT equality decides the
 * directory case.
 *
 * `spec` is in the list because parse-server keeps its entire suite there — it
 * was the omission that invalidated a 20-repo benchmark run for both sides.
 */
const TEST_DIR_SEGMENTS = new Set([
  '__tests__',
  '__test__',
  'test',
  'tests',
  'spec',
  'specs',
  'e2e',
  '__mocks__',
  // Not underscore-wrapped: MSW and the hand-rolled predicate in
  // secure-coding/no-hardcoded-credentials both use a plain `mocks/`.
  'mocks',
  'fixtures',
  '__fixtures__',
]);
// `fixture` and `mock` are here because the rules that already hand-rolled this
// predicate included them — test data and stand-ins are as much scaffolding as
// the assertions that consume them. `e2e-spec` is Nest's own generator output
// (`app.e2e-spec.ts`); the mongodb, nestjs and jwt predicates this replaced all
// carried it, and `\.spec\.` does not match it — the char before `spec` is `-`.
// `stories` is here for the same reason as `fixture`: a Storybook story is a
// development artefact that never enters the application bundle, and its props
// are stand-ins. cds-snc/canadalogin-user-selfservice-webapp reported five
// hardcoded credentials, every one of them a `password: "TestPassword123!"` on
// a story for a user called John Doe.
const TEST_BASENAME =
  /\.(test|spec|fixture|mock|e2e-spec|stories|story)\.[cm]?[jt]sx?$/;

/**
 * A directory whose name ENDS in `-test`/`-tests`/`-spec`/`-specs`.
 *
 * The exact-segment set above misses the compound names large repositories
 * actually use, and it misses them in bulk. sentry-javascript keeps its whole
 * suite under `dev-packages/e2e-tests/`, `dev-packages/node-integration-tests/`
 * and `dev-packages/browser-integration-tests/`: across four large public
 * repositories, recognising this suffix correctly exempts 243 further findings
 * — 37% of all findings between them — spanning ten rules in five plugins.
 *
 * A hyphen is required, so `latest` and `manifest` are not directories of
 * tests.
 */
const TEST_DIR_SUFFIX = /-(tests?|specs?)$/;

/**
 * Directories of scaffolding FOR tests, rather than of tests.
 *
 * `testUtils/`, `test-utils/` and `testing/` hold the builders and fake objects
 * the suite consumes, and they were the last shape still reporting: a fake OIDC
 * user in `src/domain/auth/testUtils/userTestUtil.ts` drew CWE-338 for the
 * `Math.random()` it uses to fill a throwaway `session_state`.
 *
 * Spelled out rather than matched as a prefix, because `test` is the start of
 * `testimonials`, which the existing cases already insist is production code.
 */
const TEST_SUPPORT_DIR = /^test(?:[-_]?(?:utils?|helpers?|support|data|doubles?|factories|fixtures?|setup))$|^testing$/i;

export function isTestFilePath(filename: string): boolean {
  if (!filename || filename === '<input>' || filename === '<text>') return false;
  // Split at the last separator rather than `split(…).pop()`: `pop()` is typed
  // `string | undefined` while `split` always yields at least one element, so
  // the `?? ''` fallback it needs is unreachable — an uncoverable branch, which
  // in a repo at a 100% threshold is just a permanent hole.
  const slash = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
  if (TEST_BASENAME.test(filename.slice(slash + 1))) return true;
  if (slash < 0) return false; // a bare filename has no directory to inspect
  return filename
    .slice(0, slash)
    .split(/[\\/]/)
    .some(
      (segment) =>
        TEST_DIR_SEGMENTS.has(segment) ||
        TEST_DIR_SUFFIX.test(segment) ||
        TEST_SUPPORT_DIR.test(segment),
    );
}

function createRuleInternal<
  Options extends readonly unknown[],
  MessageIds extends string,
  Docs = unknown,
>({
  create,
  defaultOptions,
  meta,
  name,
  skipTestFiles,
  skipGeneratedFiles,
  skipMinifiedFiles,
}: Readonly<RuleWithMeta<Options, MessageIds, Docs>>): RuleModuleWithName<
  MessageIds,
  Options,
  Docs
> {
  const resolvedDefaultOptions = (defaultOptions ?? []) as Options;
  return {
    create(context) {
      // Returning an empty listener object, not `undefined`: ESLint treats a
      // rule that visits nothing as a rule with no findings, which is exactly
      // the intent, and it costs no traversal.
      if (skipTestFiles && isTestFilePath(context.filename)) return {};
      // After the filename test, which is string work, and before anything
      // that walks the AST.
      if (skipGeneratedFiles && isGeneratedFile(context.sourceCode)) return {};
      if (skipMinifiedFiles && isMinifiedFile(context.sourceCode)) return {};
      return create(
        context,
        applyDefault(resolvedDefaultOptions, context.options),
      );
    },
    defaultOptions: resolvedDefaultOptions,
    meta,
    name: name as string,
  } as RuleModuleWithName<MessageIds, Options, Docs>;
}

/**
 * Port of `ESLintUtils.RuleCreator`.
 *
 * Creates a reusable factory for rules with default options and docs URLs.
 */
export function RuleCreator<PluginDocs = unknown>(urlCreator: DocsUrl) {
  return <Options extends readonly unknown[], MessageIds extends string>({
    meta,
    name,
    ...rule
  }: Readonly<
    RuleWithMetaAndName<Options, MessageIds, PluginDocs>
  >): RuleModuleWithName<MessageIds, Options, PluginDocs> =>
    createRuleInternal<Options, MessageIds, PluginDocs>({
      meta: {
        ...meta,
        docs: { ...meta.docs, url: urlCreator(name) },
      } as unknown as TSESLint.RuleMetaData<MessageIds, PluginDocs, Options>,
      name,
      ...rule,
    });
}

RuleCreator.withoutDocs = <
  Options extends readonly unknown[],
  MessageIds extends string,
>(
  args: Readonly<RuleWithMeta<Options, MessageIds>>,
): TSESLint.RuleModule<MessageIds, Options> =>
  createRuleInternal<Options, MessageIds>(args);

/**
 * Create a rule creator with a custom documentation URL resolver
 *
 * @param urlCreator - Function that generates documentation URLs for rules
 * @returns A rule creator function with the specified URL resolver
 *
 * @example
 * ```typescript
 * const createRule = createRuleCreator(
 *   (name) => `https://github.com/my-org/eslint-plugin/docs/rules/${name}.md`
 * );
 *
 * export const myRule = createRule({
 *   name: 'my-rule',
 *   meta: { ... },
 *   defaultOptions: [],
 *   create(context) { ... }
 * });
 * ```
 */
export function createRuleCreator<PluginDocs = unknown>(urlCreator: DocsUrl) {
  return RuleCreator<PluginDocs>(urlCreator);
}

/**
 * Default rule creator with a generic documentation URL pattern
 *
 * This can be used directly if you don't need custom URL generation
 */
export const createRule = RuleCreator(
  (name) =>
    `https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin/docs/rules/${name}.md`,
);

/**
 * Drop-in replacement for the `ESLintUtils` namespace this module used to
 * re-export from `@typescript-eslint/utils`. Only `RuleCreator` was ever used
 * by this ecosystem; anything else should import `@typescript-eslint/utils`
 * directly.
 */
export const ESLintUtils = { RuleCreator, applyDefault };

export type { TSESLint };

/**
 * Canonical documentation URL for a rule on eslint.interlace.tools.
 *
 * The docs slug MUST equal the package suffix — `eslint-plugin-node-security`
 * documents at `plugin-node-security`. Verified live: any other shape 404s.
 */
export const docsUrlFor = (pluginSlug: string, ruleName: string): string =>
  `https://eslint.interlace.tools/docs/security/${pluginSlug}/rules/${ruleName}`;

/**
 * Stamp the canonical docs URL onto every rule in a plugin's export map.
 *
 * Rules built with the default {@link createRule} inherit a placeholder URL that does not
 * resolve — every "see docs" link in every IDE, CI report and SARIF file 404s. Rather than
 * rewrite the import in ~110 rule files, plugins pass their rule map through this on export.
 *
 * @param pluginSlug - docs slug, equal to the package suffix (e.g. `plugin-node-security`)
 * @param rules - the plugin's rule map, returned with `meta.docs.url` corrected
 */
export function withCanonicalDocsUrls<
  T extends Record<string, TSESLint.RuleModule<string, readonly unknown[]>>,
>(pluginSlug: string, rules: T): T {
  // `Object.entries` READS every property, and a plugin barrel's properties are
  // getters: the build defers each rule module behind one so `require('the-plugin')`
  // does not load 42 rule files a consumer never enables. Reading them all here undid
  // that completely — the build printed "deferred 42 rules behind getters" while every
  // one of the 42 still loaded at require time, which is what
  // `scripts/__tests__/lazy-rules-artifact.test.ts` measures and why it failed.
  //
  // Accessors are therefore WRAPPED, not invoked: the URL is stamped the first time the
  // rule is actually read. `require` memoises, so repeated reads return the same object
  // and re-stamping is idempotent. Plain-value properties (plugins that re-export their
  // rules and cannot be deferred) are handled exactly as before.
  for (const name of Object.keys(rules)) {
    // `Object.keys` yields own enumerable properties only, so a descriptor always
    // exists. The cast records that rather than adding a branch no input can reach.
    const descriptor = Object.getOwnPropertyDescriptor(rules, name) as PropertyDescriptor;

    const { get } = descriptor;
    if (get) {
      Object.defineProperty(rules, name, {
        ...descriptor,
        get(this: T) {
          const rule = get.call(this) as TSESLint.RuleModule<string, readonly unknown[]>;
          stampDocsUrl(pluginSlug, name, rule);
          return rule;
        },
      });
      continue;
    }

    stampDocsUrl(
      pluginSlug,
      name,
      descriptor.value as TSESLint.RuleModule<string, readonly unknown[]> | undefined,
    );
  }
  return rules;
}

function stampDocsUrl(
  pluginSlug: string,
  name: string,
  rule: TSESLint.RuleModule<string, readonly unknown[]> | undefined,
): void {
  const docs = rule?.meta?.docs as { url?: string } | undefined;
  if (docs) docs.url = docsUrlFor(pluginSlug, name);
}
