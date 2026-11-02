/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-validation-pipe-whitelist
 * Requires `whitelist: true` on ValidationPipe.
 * CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes
 *
 * A `ValidationPipe` validates the properties a DTO declares. It does not, by
 * default, remove the ones it doesn't:
 *
 * ```ts
 * app.useGlobalPipes(new ValidationPipe());          // unknown props survive
 * app.useGlobalPipes(new ValidationPipe({ whitelist: true }));  // stripped
 * ```
 *
 * So `POST /users { "email": "…", "password": "…", "isAdmin": true }` passes
 * validation with `isAdmin` still attached, and any `save(dto)` or `{ ...dto }`
 * downstream carries it into the record. That is mass assignment, and the DTO
 * looks like it prevented it.
 *
 * `forbidNonWhitelisted: true` additionally turns the extra property into a 400
 * instead of silently dropping it. Useful, but optional — stripping is what
 * closes the hole, so only `whitelist` is required here.
 *
 * Sibling rule: `no-missing-validation-pipe` asks whether a pipe exists at all.
 * This one asks whether the pipe that exists actually strips anything.
 *
 * Deliberately NOT reported: options this rule cannot read statically, such as
 * `new ValidationPipe(validationOptions)` where the object is imported from
 * another module. Well-factored apps do exactly that, and flagging them for
 * being well-factored is how a rule gets switched off.
 *
 * @see https://cwe.mitre.org/data/definitions/915.html
 * @see https://docs.nestjs.com/techniques/validation#stripping-properties
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  objectKeyName,
} from '@interlace/eslint-devkit';

import { isModuleExport } from '../../utils/nest-ast';
import { fileUsesNestjs } from '../../utils/nestjs-evidence';

type MessageIds = 'missingWhitelist';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Also require `forbidNonWhitelisted: true`. Default: false */
  requireForbidNonWhitelisted?: boolean;
}

type RuleOptions = [Options?];

/**
 * What a boolean flag ends up as in an options object, read in order the way
 * JavaScript builds it: the last write wins.
 *
 *   - `'off'`     — absent, or a literal other than `true`, after any spread;
 *   - `'on'`      — the literal `true`, after any spread;
 *   - `'unknown'` — a spread after the last explicit write may carry it, or
 *                   the value is computed (`whitelist: cfg.strip`) and may be
 *                   `true` at runtime.
 *
 * `{ ...base, whitelist: false }` is therefore `'off'`: whatever the spread
 * carried, the explicit `false` after it overrides it.
 */
function flagState(
  object: TSESTree.ObjectExpression,
  name: string,
): 'on' | 'off' | 'unknown' {
  let state: 'on' | 'off' | 'unknown' = 'off';
  for (const prop of object.properties) {
    if (prop.type === AST_NODE_TYPES.SpreadElement) {
      state = 'unknown';
    } else if (objectKeyName(prop) === name) {
      // `objectKeyName`, not `key.name`: in `{ [whitelist]: true }` the key is a
      // variable reference, not the property name, and reading `.name` there
      // made the rule believe whitelist was set — a false negative.
      // `{ ['whitelist']: true }` does name it.
      state =
        prop.value.type !== AST_NODE_TYPES.Literal
          ? 'unknown'
          : prop.value.value === true
            ? 'on'
            : 'off';
    }
  }
  return state;
}

/** Resolve a `const x = { … }` declared in this same file, or null. */
function resolveLocalObject(
  scope: TSESLint.Scope.Scope | null,
  name: string,
): TSESTree.ObjectExpression | null {
  for (let s: TSESLint.Scope.Scope | null = scope; s; s = s.upper) {
    const variable = s.variables.find((v) => v.name === name);
    if (!variable) continue;
    // Reassignment defeats this analysis: the value at the call site may not be
    // the value at the declaration. `let o = { origin: '*' }; o = safe;` would
    // otherwise report on a binding that is safe by the time it is used. Only
    // a binding written exactly once — its initialiser — is safe to read.
    if (variable.references.filter((ref) => ref.isWrite()).length > 1)
      return null;
    for (const def of variable.defs) {
      if (def.node.type !== AST_NODE_TYPES.VariableDeclarator) continue;
      const init = def.node.init;
      if (init && init.type === AST_NODE_TYPES.ObjectExpression) return init;
    }
    return null;
  }
  return null;
}

export const requireValidationPipeWhitelist = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'require-validation-pipe-whitelist',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/require-validation-pipe-whitelist.md',
      description:
        'Requires whitelist: true on ValidationPipe so unknown properties are stripped',
      cwe: 'CWE-915',
      cvss: 7.5,
    },
    messages: {
      missingWhitelist: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Mass Assignment via ValidationPipe',
        cwe: 'CWE-915',
        owasp: 'A03:2021',
        cvss: 7.5,
        description:
          'ValidationPipe without whitelist: true validates the DTO but keeps properties the DTO never declared, so extra fields in the request body reach your service layer',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'new ValidationPipe({ whitelist: true }) — add forbidNonWhitelisted: true to reject rather than strip',
        documentationLink:
          'https://docs.nestjs.com/techniques/validation#stripping-properties',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
          requireForbidNonWhitelisted: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, requireForbidNonWhitelisted: false }],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let allowInTests: boolean;
    let requireForbidNonWhitelisted: boolean;

    return {
      before() {
        const [options] = currentOptions();
        // Registering no visitors is both the gate and the cheap path: a file
        // that does not use this SDK does no work at all.
        if (!fileUsesNestjs(context.sourceCode.ast)) return false;

        // Merged with `defaultOptions` before `create` runs.
        ({ allowInTests, requireForbidNonWhitelisted } =
          options as Required<Options>);
        if (allowInTests && isTestFilePath(context.filename)) return false;
        return true;
      },
      NewExpression(node: TSESTree.NewExpression) {
        const scope = context.sourceCode.getScope(node);
        if (
          !isModuleExport(
            node.callee,
            scope,
            '@nestjs/common',
            'ValidationPipe',
          )
        )
          return;

        const [arg] = node.arguments;

        // new ValidationPipe() — nothing is stripped.
        if (!arg) {
          context.report({ node, messageId: 'missingWhitelist' });
          return;
        }

        let optionsObject: TSESTree.ObjectExpression | null = null;
        if (arg.type === AST_NODE_TYPES.ObjectExpression) {
          optionsObject = arg;
        } else if (arg.type === AST_NODE_TYPES.Identifier) {
          // Only when declared in this file; an imported config isn't knowable.
          optionsObject = resolveLocalObject(scope, arg.name);
        }
        if (!optionsObject) return;

        // Only a flag provably off is reported. A spread may supply it, and a
        // computed value may be `true` at runtime — neither is a guess to make.
        const off =
          flagState(optionsObject, 'whitelist') === 'off' ||
          (requireForbidNonWhitelisted &&
            flagState(optionsObject, 'forbidNonWhitelisted') === 'off');
        if (off) {
          context.report({
            node: optionsObject,
            messageId: 'missingWhitelist',
          });
        }
      },
    };
  },
});
