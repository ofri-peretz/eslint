/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-dynamic-require
 * Detects dynamic require() calls that could lead to code injection
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  isModuleBinding,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { findVariable, makeReadsTaintSource } from '../../utils/provenance';
import {
  isClosedStringTableLookup,
  resolveConstantString,
} from '../../utils/const-value';

type MessageIds = 'unsafeDynamicRequire' | 'unsafeDynamicImport';

export interface Options {
  /**
   * Allow dynamic `import()` expressions. Default: `false` (stricter).
   *
   * `false` judges `import(x)` by exactly the same evidence as `require(x)` —
   * it is the same loader with the same consequence, and in an ESM codebase it
   * is the ONLY spelling available. It does not mean "report every dynamic
   * import": `await import(\`./locales/${locale}.json\`)` stays silent for the
   * same reason its require() twin does.
   *
   * For most of this rule's life the option was declared, schema'd, defaulted —
   * and never read. `import(req.params.name)` was silent in every
   * configuration, which the corpus caught.
   */
  allowDynamicImport?: boolean;

  /**
   * Identifier roots treated as attacker-reachable.
   * Default: `['req', 'request', 'ctx', 'event', 'process']`.
   *
   * `process` is included: `require(process.argv[2])` really is a module path
   * named from outside the program.
   */
  taintSources?: string[];

  /**
   * Report a specifier whose provenance cannot be resolved — a bare parameter,
   * an opaque helper's return value. Default: `false`.
   *
   * `true` restores the pre-inversion behaviour: report unless the argument is
   * literally a string literal. Measured on an 8-repo corpus that produced 14
   * findings, all of them build tooling resolving their own repo's files.
   */
  reportUnresolvedSpecifiers?: boolean;
}

type RuleOptions = [Options?];

/**
 * Roots an attacker can actually name a module through.
 */
const DEFAULT_TAINT_SOURCES = ['req', 'request', 'ctx', 'event', 'process'];

export const noUnsafeDynamicRequire = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-dynamic-require',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-unsafe-dynamic-require.md',
      description:
        'Prevent unsafe dynamic require() calls that could enable code injection',
      cwe: 'CWE-95',
      cvss: 9.8,
    },
    hasSuggestions: false,
    messages: {
      unsafeDynamicRequire: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dynamic require()',
        cwe: 'CWE-95',
        description: 'Dynamic require() detected',
        severity: 'CRITICAL',
        fix: 'Use allowlist: const ALLOWED = ["mod1", "mod2"]; if (!ALLOWED.includes(name)) throw Error("Not allowed")',
        documentationLink:
          'https://owasp.org/www-community/attacks/Code_Injection',
      }),
      unsafeDynamicImport: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dynamic import()',
        cwe: 'CWE-95',
        description:
          'import() resolves and EVALUATES the module it is given, exactly as require() does. This specifier is reachable from request or process input, so an attacker chooses which file executes.',
        severity: 'CRITICAL',
        fix: 'Use allowlist: const ALLOWED = { csv: "./formatters/csv" }; const specifier = ALLOWED[name]; if (!specifier) throw Error("Not allowed"); await import(specifier)',
        documentationLink:
          'https://owasp.org/www-community/attacks/Code_Injection',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowDynamicImport: {
            type: 'boolean',
            default: false,
          },
          taintSources: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_TAINT_SOURCES,
            description:
              'Identifier roots treated as attacker-reachable (default: req, request, ctx, event, process)',
          },
          reportUnresolvedSpecifiers: {
            type: 'boolean',
            default: false,
            description:
              'Report specifiers whose provenance cannot be resolved. Restores the pre-inversion "any non-literal is dangerous" behaviour.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowDynamicImport: false,
    },
  ],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let readsTaintSource: (node: TSESTree.Node) => boolean;
    let reportUnresolvedSpecifiers: boolean;
    let allowDynamicImport: boolean;
    let requireVariables: Set<TSESLint.Scope.Variable>;

    /**
     * Check if a node is a reference to require
     *
     * `module.require(x)` is the same loader reached through the module object,
     * and legacy plugin hosts use it precisely because it resolves relative to
     * themselves. Matching it is exact membership on a Node built-in, not a name
     * guess: in a CommonJS file `module` IS the module object.
     */
    const isRequireReference = (node: TSESTree.Node): boolean => {
      if (node.type === 'Identifier') {
        if (node.name === 'require') return true;
        const variable = findVariable(context.sourceCode, node);
        return variable !== null && requireVariables.has(variable);
      }
      return (
        node.type === 'MemberExpression' &&
        node.object.type === 'Identifier' &&
        node.object.name === 'module' &&
        propertyName(node) === 'require'
      );
    };

    /**
     * Is this specifier worth reporting?
     *
     * INVERTED, following `detect-non-literal-fs-filename`. The rule used to be
     *
     *     if (arg.type === 'Literal') return false;
     *     return true;   // "any non-literal is dangerous"
     *
     * which asks "can I PROVE this is constant?" and reports whenever it
     * cannot. Measured over an 8-repo corpus that produced 14 findings and zero
     * code injections. Every one was build tooling naming a file in its own
     * repo: `require(path.resolve(ROOT, 'package.json'))`,
     * `require(path.join('..', '..', 'examples', name))`,
     * `require(ROOT_DIR + '/package.json')`.
     *
     * Adding constant-recognition for each of those shapes does not fix it,
     * because the question is backwards. CWE-95 needs an attacker to NAME the
     * module, so that is what is asked now.
     *
     * Stated plainly, the trade: `require(specifier)` where `specifier` is a
     * bare parameter is now silent — that is a caller-side decision this rule
     * cannot see. `reportUnresolvedSpecifiers` restores the old sweep.
     */
    const isDangerousSpecifier = (arg: TSESTree.Expression): boolean => {
      // A string literal, a backtick string with no `${}`, and a `const` bound
      // to either are that string. (A non-string literal makes the loader
      // throw ERR_INVALID_ARG_TYPE before anything loads.)
      //
      // The `const` case matters beyond tidiness. Webpack's resolver
      // vocabulary calls a specifier a `request`, so `const request =
      // './loaders/babel-loader.js'` collides head-on with the taint ROOTS,
      // which match a name: without this the rule reported a hard-coded path
      // because of how it was spelled.
      if (resolveConstantString(context.sourceCode, arg) !== null) return false;

      // `require(ALLOWED[req.query.plugin])` with `ALLOWED` a closed table of
      // string literals is the allowlist this rule's own message recommends.
      // Whatever the key, the specifier is one the author wrote: its
      // provenance IS resolved, so even `reportUnresolvedSpecifiers` has
      // nothing to say about it.
      if (isClosedStringTableLookup(context.sourceCode, arg)) return false;

      // A bare parameter is a caller-side fact, whatever it is named. The
      // rule's own contract says so — `reportUnresolvedSpecifiers` exists to
      // restore the sweep — but the taint roots are matched by NAME, so
      // `function resolveLoader(request) { require(request) }` was reported
      // while the identical `function readMock(filePath)` was not. Same
      // evidence, opposite verdict, decided by the spelling of a parameter.
      if (arg.type === 'Identifier') {
        const variable = findVariable(context.sourceCode, arg);
        if (
          variable?.defs.length === 1 &&
          variable.defs[0].type === 'Parameter'
        ) {
          return reportUnresolvedSpecifiers;
        }
      }

      if (readsTaintSource(arg)) return true;
      return reportUnresolvedSpecifiers;
    };

    return {
      before() {
        const options = context.options[0] ?? {};
        readsTaintSource = makeReadsTaintSource(
          context.sourceCode,
          new Set(
            (options.taintSources ?? DEFAULT_TAINT_SOURCES).map((s) =>
              s.toLowerCase(),
            ),
          ),
        );
        reportUnresolvedSpecifiers =
          options.reportUnresolvedSpecifiers ?? false;
        allowDynamicImport = options.allowDynamicImport ?? false;

        /**
         * Track variables that reference require
         * Maps variable name to the node where it was assigned
         */
        requireVariables = new Set<TSESLint.Scope.Variable>();
      },
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        // Track when require is assigned to a variable
        if (node.id.type !== 'Identifier' || !node.init) return;
        const init = node.init;
        // `const requireCjs = createRequire(import.meta.url)` is the documented
        // way to reach the CJS loader from ESM — the same binding one call
        // deeper, and the shape every ESM plugin host uses. The callee has to
        // RESOLVE to `node:module`'s `createRequire` (named, renamed, the
        // `module.createRequire` default import, a require of it): a local
        // function that merely shares the name loads nothing. A
        // `createRequire` declared nowhere in the file (a snippet that elides
        // its import) cannot be such a local, so it keeps counting.
        const callee = init.type === 'CallExpression' ? init.callee : null;
        const aliasesRequire =
          (init.type === 'Identifier' && init.name === 'require') ||
          (callee !== null &&
            (isModuleBinding(
              callee,
              context.sourceCode.getScope(node),
              'module',
              ['createRequire'],
            ) ||
              (callee.type === 'Identifier' &&
                callee.name === 'createRequire' &&
                !findVariable(context.sourceCode, callee)?.defs.length)));
        if (!aliasesRequire) return;
        for (const variable of context.sourceCode.getDeclaredVariables(node)) {
          requireVariables.add(variable);
        }
      },

      /**
       * `import(x)` — the ESM spelling of the same loader.
       *
       * Judged by the same evidence as `require(x)`; `allowDynamicImport: true`
       * opts out entirely for codebases that resolve their own specifiers.
       */
      ImportExpression(node: TSESTree.ImportExpression) {
        if (allowDynamicImport) return;
        if (!isDangerousSpecifier(node.source)) return;
        context.report({ node, messageId: 'unsafeDynamicImport' });
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Check if callee is require, a variable that references require, or
        // module.require — any other callee shape is none of them.
        if (!isRequireReference(node.callee)) {
          return;
        }

        // Must have at least one argument
        if (node.arguments.length === 0) return;

        // `require(...modules)` loads `modules[0]`: the spread array is where
        // the specifier comes from, and it is judged on the same evidence.
        const firstArg = node.arguments[0];
        const specifier =
          firstArg.type === 'SpreadElement' ? firstArg.argument : firstArg;

        // Report only on evidence that an attacker names the module.
        if (!isDangerousSpecifier(specifier)) return;

        context.report({
          node,
          messageId: 'unsafeDynamicRequire',
        });
      },
    };
  },
});
