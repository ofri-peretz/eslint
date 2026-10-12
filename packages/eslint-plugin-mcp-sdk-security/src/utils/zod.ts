/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Is this receiver a Zod schema, and which of its keys are a
 * closed set?
 *
 * The low-level `Server` hands a handler `request.params.arguments` untyped,
 * and the dominant way to read it is to parse it first:
 *
 *     const { path } = ReadFileArgs.parse(request.params.arguments);
 *     const parsed = ReadFileArgs.safeParse(args); … parsed.data.path
 *
 * Parsing checks the SHAPE. The text inside is still whatever the model sent,
 * so the parse result carries the arguments on. A key the schema restricts to
 * `z.enum` / `z.literal` / `z.nativeEnum` is the allowlist, exactly as in an
 * `inputSchema`.
 *
 * A receiver is a Zod schema when it is built by a call into the `zod`
 * package (`z.object(...)`, chained `.strict()` / `.extend()` …), followed
 * through `const` bindings and relative imports. `lookup.parse(x)` on
 * anything else — `JSON`, a URL parser, a local object — is not.
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import { resolveModuleBinding } from '@interlace/eslint-devkit';
import {
  resolveValue,
  scopeAt,
  unwrapTypeOnly,
  type Site,
} from './module-resolver';
import { isClosedSetSchema, schemaFields } from './tool-registration';

/** Schema methods whose result is the parsed input. */
export const ZOD_PARSERS: ReadonlySet<string> = new Set([
  'parse',
  'parseAsync',
]);

/** Schema methods whose result holds the parsed input under `data`. */
export const ZOD_SAFE_PARSERS: ReadonlySet<string> = new Set([
  'safeParse',
  'safeParseAsync',
  'spa',
]);

/** How many bindings / chained calls one question may follow. */
const MAX_ZOD_DEPTH = 8;

/** `zod`, `zod/v4`, `zod/v3`, `zod/mini`. */
function isZodModule(module: string): boolean {
  return module === 'zod' || module.startsWith('zod/');
}

export interface ZodSchema {
  /** Top-level keys restricted to a fixed set of values. */
  closed: ReadonlySet<string>;
  /** The schema itself is a closed set (`z.enum([...]).parse(x)`). */
  closedValue: boolean;
}

/** The closed-set facts of a schema expression read where it is written. */
function closedFacts(
  node: TSESTree.Node,
  site: Site,
  parser: unknown,
): ZodSchema {
  const closed = new Set<string>();
  for (const [key, value] of schemaFields(node)?.fields ?? []) {
    const resolved = resolveValue(value, site, { parser, depth: 0 });
    const field = resolved.kind === 'value' ? resolved.node : value;
    if (isClosedSetSchema(field)) closed.add(key);
  }
  return { closed, closedValue: isClosedSetSchema(node) };
}

/**
 * The schema `node` denotes when it is a Zod schema, or `undefined`. A node
 * read out of a relative module is scoped through that module's scope tree.
 */
export function zodSchemaOf(
  node: TSESTree.Node,
  site: Site,
  parser: unknown,
  depth = 0,
): ZodSchema | undefined {
  const value = unwrapTypeOnly(node);
  if (depth > MAX_ZOD_DEPTH) return undefined;
  if (value.type === 'Identifier' || value.type === 'MemberExpression') {
    const resolved = resolveValue(value, site, { parser, depth: 0 });
    if (resolved.kind !== 'value' || resolved.node === value) return undefined;
    return zodSchemaOf(resolved.node, resolved.site, parser, depth + 1);
  }
  if (value.type !== 'CallExpression') return undefined;
  const binding = resolveModuleBinding(
    value.callee,
    scopeAt(site.scope, value),
  );
  const isZod =
    binding !== undefined
      ? isZodModule(binding.module)
      : value.callee.type === 'MemberExpression' &&
        zodSchemaOf(value.callee.object, site, parser, depth + 1) !== undefined;
  return isZod ? closedFacts(value, site, parser) : undefined;
}
