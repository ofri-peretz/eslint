/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-upload-size-limit
 * Flags a multer upload interceptor that sets no `limits.fileSize`.
 * CWE-770: Allocation of Resources Without Limits or Throttling
 *
 * ```ts
 * @Post('avatar')
 * @UseInterceptors(FileInterceptor('file'))            // ← reported
 * upload(@UploadedFile() file: Express.Multer.File) {}
 * ```
 *
 * multer only checks a limit that is present in `limits`; `fileSize` defaults
 * to `Infinity`. NestJS adds defaults for the field-NAME limits and the number
 * of parts (`applyDefaultLimits` in
 * `platform-express/multer/multer/multer.utils.ts`, v12.5.0) and nothing for the
 * size of a file, so the route above buffers whatever the client sends — into
 * memory with the default storage.
 *
 * ## `Infinity`, `undefined` and `null`
 *
 * `mergeMulterOptions` (same file, v12.5.0 and v11.2.10) leaves a route option
 * or limit that is `undefined` or `null` out of the merge, so it sets nothing
 * and the module's value, if there is one, stays. `Infinity` is how a route
 * lifts a limit, the module's included — reported on its own, whatever the
 * module sets. (Before those versions `undefined` lifted the module's limit
 * too; the rule reads the current behaviour.)
 *
 * Measured over 79 NestJS repositories: 77 interceptor calls in 21 of them, and
 * 34 of the 49 files that call one name no size limit anywhere in the file.
 *
 * ## What does NOT count as a limit
 *
 * `ParseFilePipe` with `MaxFileSizeValidator`. A pipe runs after the
 * interceptor, and the interceptor is what reads the body: by the time the
 * validator rejects a 4 GB file, multer has already stored all 4 GB. The
 * validator is a correctness check on the result, not a bound on the upload.
 *
 * ## What is deliberately NOT reported
 *
 * Options this file cannot read — an imported constant, a call, a spread. The
 * limit may be there, and saying it is not would be a guess. The same goes for
 * a project that sets `fileSize` in `MulterModule.register()`: those options
 * are merged under the interceptor's own, per module, and which module a
 * controller belongs to is not visible from the controller file.
 *
 * @see https://cwe.mitre.org/data/definitions/770.html
 * @see https://github.com/expressjs/multer#limits
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  propertyName,
} from '@interlace/eslint-devkit';
import { objectProperties } from '../../utils/nest-ast';
import { getProjectContext } from '../../utils/project-context';

type MessageIds = 'missingFileSizeLimit' | 'unlimitedFileSize';

/** What the options say about `limits.fileSize`; `unknown` when this file does not hold the answer. */
type FileSize = 'set' | 'unset' | 'infinite' | 'unknown';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/** The package whose interceptors wrap multer. */
const PLATFORM_EXPRESS = '@nestjs/platform-express';

/**
 * Where each interceptor takes its multer options, by position — read from the
 * v12.4.1 signatures, e.g. `FilesInterceptor(fieldName, maxCount?, localOptions?)`.
 * `NoFilesInterceptor` is absent on purpose: it rejects every file.
 */
const OPTIONS_INDEX: ReadonlyMap<string, number> = new Map([
  ['FileInterceptor', 1],
  ['FilesInterceptor', 2],
  ['FileFieldsInterceptor', 1],
  ['AnyFilesInterceptor', 0],
]);

/** `x as T` and `x satisfies T` are `x`. */
function unwrap(node: TSESTree.Node): TSESTree.Node {
  while (
    node.type === AST_NODE_TYPES.TSAsExpression ||
    node.type === AST_NODE_TYPES.TSSatisfiesExpression
  )
    node = node.expression;
  return node;
}

/** `undefined` or `null`: what `mergeMulterOptions` leaves out of the merge. */
function isNil(node: TSESTree.Node): boolean {
  node = unwrap(node);
  return (
    (node.type === AST_NODE_TYPES.Identifier && node.name === 'undefined') ||
    (node.type === AST_NODE_TYPES.Literal && node.raw === 'null')
  );
}

export const requireUploadSizeLimit = createRule<RuleOptions, MessageIds>({
  name: 'require-upload-size-limit',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/require-upload-size-limit.md',
      description: 'Requires a limits.fileSize on multer upload interceptors',
      cwe: 'CWE-770',
      cvss: 6.5,
    },
    messages: {
      missingFileSizeLimit: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unbounded File Upload',
        cwe: 'CWE-770',
        owasp: 'A04:2021',
        cvss: 6.5,
        description:
          '{{name}} sets no limits.fileSize, and multer has no default for it: the route stores however many bytes the client sends, in memory unless a storage engine is configured. A ParseFilePipe with MaxFileSizeValidator does not bound it — the pipe runs after the whole file has been received',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: "Pass the limit to the interceptor: FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }), or set limits.fileSize in MulterModule.register()",
        documentationLink: 'https://github.com/expressjs/multer#limits',
      }),
      unlimitedFileSize: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Upload Size Limit Lifted',
        cwe: 'CWE-770',
        owasp: 'A04:2021',
        cvss: 6.5,
        description:
          "{{name}} sets limits.fileSize to Infinity, which lifts the limit — a route's own value replaces one set in MulterModule.register() — so the route stores however many bytes the client sends",
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Replace Infinity with the largest size this route should accept, in bytes: limits: { fileSize: 50 * 1024 * 1024 }',
        documentationLink: 'https://github.com/expressjs/multer#limits',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: { allowInTests: { type: 'boolean', default: true } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    /** Local binding → the interceptor it was imported as. */
    let interceptors: Map<string, string>;
    /** Local names of `import * as x from '@nestjs/platform-express'`. */
    let namespaces: Set<string>;
    /** Top-level `const x = { … }` in this file. */
    let constants: Map<string, TSESTree.ObjectExpression>;

    /** An object literal, directly or through a `const` of this file. */
    function objectLiteral(
      node: TSESTree.Node,
    ): TSESTree.ObjectExpression | null {
      node = unwrap(node);
      if (node.type === AST_NODE_TYPES.Identifier)
        return constants.get(node.name) ?? null;
      return node.type === AST_NODE_TYPES.ObjectExpression ? node : null;
    }

    /** What multer options say about `limits.fileSize`. */
    function fileSize(options: TSESTree.Node | undefined): FileSize {
      if (!options || isNil(options)) return 'unset';
      const literal = objectLiteral(options);
      const props = literal && objectProperties(literal);
      if (!props) return 'unknown';
      const limits = props.get('limits');
      if (!limits || isNil(limits)) return 'unset';
      const limitsLiteral = objectLiteral(limits);
      const limitProps = limitsLiteral && objectProperties(limitsLiteral);
      if (!limitProps) return 'unknown';
      const size = limitProps.get('fileSize');
      if (!size || isNil(size)) return 'unset';
      const value = unwrap(size);
      return value.type === AST_NODE_TYPES.Identifier &&
        value.name === 'Infinity'
        ? 'infinite'
        : 'set';
    }

    /** The platform-express interceptor a callee names, or undefined. */
    function interceptorName(callee: TSESTree.Node): string | undefined {
      if (callee.type === AST_NODE_TYPES.Identifier)
        return interceptors.get(callee.name);
      // `express.FileInterceptor` and `express['FileInterceptor']` are the same
      // member. Anything but an identifier has no `name`, and the set holds none.
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        namespaces.has((callee.object as TSESTree.Identifier).name)
      )
        return propertyName(callee) ?? undefined;
      return undefined;
    }

    return {
      before() {
        const [options] = currentOptions();
        // Merged with `defaultOptions` before `create` runs.
        const { allowInTests } = options as Required<Options>;
        if (allowInTests && isTestFilePath(context.filename)) return false;

        interceptors = new Map();
        namespaces = new Set();
        constants = new Map();
        for (const statement of context.sourceCode.ast.body) {
          if (statement.type === AST_NODE_TYPES.ImportDeclaration) {
            if (statement.source.value !== PLATFORM_EXPRESS) continue;
            for (const spec of statement.specifiers) {
              if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier)
                namespaces.add(spec.local.name);
              else if (
                spec.type === AST_NODE_TYPES.ImportSpecifier &&
                spec.imported.type === AST_NODE_TYPES.Identifier
              )
                interceptors.set(spec.local.name, spec.imported.name);
            }
            continue;
          }
          const declaration =
            statement.type === AST_NODE_TYPES.ExportNamedDeclaration
              ? statement.declaration
              : statement;
          if (
            declaration?.type !== AST_NODE_TYPES.VariableDeclaration ||
            declaration.kind !== 'const'
          )
            continue;
          for (const { id, init } of declaration.declarations) {
            const value = init && unwrap(init);
            if (
              id.type === AST_NODE_TYPES.Identifier &&
              value?.type === AST_NODE_TYPES.ObjectExpression
            )
              constants.set(id.name, value);
          }
        }
        // The import is the gate: no interceptor can be named without one, and
        // a file that does not use this package does no work at all.
        return interceptors.size > 0 || namespaces.size > 0;
      },
      CallExpression(node: TSESTree.CallExpression) {
        const name = interceptorName(node.callee);
        const index = name === undefined ? undefined : OPTIONS_INDEX.get(name);
        if (index === undefined) return;
        const size = fileSize(node.arguments[index]);
        const data = { name: name as string };
        // The route's Infinity replaces whatever the module set.
        if (size === 'infinite')
          return context.report({ node, messageId: 'unlimitedFileSize', data });
        if (size !== 'unset') return;
        // Last, because it reads the project: a module that sets the limit
        // covers the interceptors of its controllers.
        if (getProjectContext(context).hasModuleUploadLimit) return;
        context.report({ node, messageId: 'missingFileSizeLimit', data });
      },
    };
  },
});
