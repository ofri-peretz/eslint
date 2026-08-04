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

function createRuleInternal<
  Options extends readonly unknown[],
  MessageIds extends string,
  Docs = unknown,
>({
  create,
  defaultOptions,
  meta,
  name,
}: Readonly<RuleWithMeta<Options, MessageIds, Docs>>): RuleModuleWithName<
  MessageIds,
  Options,
  Docs
> {
  const resolvedDefaultOptions = (defaultOptions ?? []) as Options;
  return {
    create(context) {
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
