/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent file access from user input
 *
 * False Positive Reduction:
 * This rule detects safe patterns including:
 * - path.basename() sanitization
 * - path.join() with validated base directories
 * - startsWith() validation guards
 * - Early-return throw patterns
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

/**
 * @vocabulary `path`, `join`, `basename` and `fs` are Node's — the module
 * names and the methods those modules export. A project cannot rename them.
 *
 * @see https://nodejs.org/api/path.html
 * @see https://nodejs.org/api/fs.html
 */
type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noArbitraryFileAccess = createRule<RuleOptions, MessageIds>({
  name: 'no-arbitrary-file-access',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-arbitrary-file-access.md',
      description: 'Prevent file access from user input',
      cwe: 'CWE-22',
      cvss: 7.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Arbitrary File Access',
        cwe: 'CWE-22',
        description: 'File path from user input - path traversal vulnerability',
        severity: 'HIGH',
        fix: 'Validate and sanitize file paths, use allowlists',
        documentationLink: 'https://cwe.mitre.org/data/definitions/22.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }

    const fsReadMethods = [
      'readFile',
      'readFileSync',
      'readdir',
      'readdirSync',
      'stat',
      'statSync',
    ];
    const fsWriteMethods = [
      'writeFile',
      'writeFileSync',
      'appendFile',
      'appendFileSync',
    ];
    const userInputSources = new Set([
      'req',
      'request',
      'params',
      'query',
      'body',
    ]);

    /**
     * `name = <expr>` bindings, so a request can be followed one hop back
     * through a local even when the local is buried inside an expression.
     */
    const bindings = new Map<string, TSESTree.Node>();

    /**
     * Does this expression read from a request?
     *
     * `req.query.file`, `request.params.id`, `body.path` — the shapes this
     * rule's own message describes.
     *
     * It used to walk ONLY a member chain, so a request that had been through
     * any expression at all was invisible. Both of the CWE-22 fixtures in
     * `benchmarks/corpus/CWE-022/vulnerable/` are that shape and both went
     * unreported: `fs.readFileSync(path.join('/uploads', userFile))` hides the
     * request inside a call argument, and `fs.readFileSync('/uploads/' +
     * userFile)` hides it behind a `+`. Path traversal is not less exploitable
     * for having been concatenated — concatenation is how it is normally
     * written.
     *
     * `depth` stops `const a = b; const b = a;` recursing forever.
     */
    function readsUserInput(node: TSESTree.Node, depth = 0): boolean {
      if (depth > 6) return false;
      switch (node.type) {
        case 'Identifier': {
          if (userInputSources.has(node.name.toLowerCase())) return true;
          const bound = bindings.get(node.name);
          return bound !== undefined && readsUserInput(bound, depth + 1);
        }
        // Walk to the root of `req.query.file` and judge the base object.
        case 'MemberExpression':
          return readsUserInput(node.object, depth + 1);
        case 'TemplateLiteral':
          return node.expressions.some((e) => readsUserInput(e, depth + 1));
        case 'BinaryExpression':
          return (
            readsUserInput(node.left as TSESTree.Node, depth + 1) ||
            readsUserInput(node.right, depth + 1)
          );
        // `path.join(base, req.query.f)` carries the request through.
        case 'CallExpression':
          return node.arguments.some(
            (arg) =>
              arg.type !== 'SpreadElement' && readsUserInput(arg, depth + 1),
          );
        default:
          return false;
      }
    }

    /** Every call in the file, so a parameter can be judged by what callers pass. */
    const allCalls: TSESTree.CallExpression[] = [];

    /**
     * The name this function is reachable by, when it has one.
     *
     * An inline callback (`files.forEach(file => …)`) has none, which is the
     * point: nothing in the file can be shown to steer its parameter.
     */
    function functionName(
      fn:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression,
    ): string | undefined {
      if (fn.type !== 'ArrowFunctionExpression' && fn.id !== null)
        return fn.id.name;
      const parent = fn.parent;
      if (
        parent.type === 'VariableDeclarator' &&
        parent.id.type === 'Identifier'
      ) {
        return parent.id.name;
      }
      if (
        parent.type === 'Property' &&
        !parent.computed &&
        parent.key.type === 'Identifier'
      ) {
        return parent.key.name;
      }
      if (
        parent.type === 'AssignmentExpression' &&
        parent.left.type === 'Identifier'
      ) {
        return parent.left.name;
      }
      return undefined;
    }

    /**
     * Does a call site in this file pass a request-derived value into
     * `name`'s parameter number `index`?
     */
    function callerPassesUserInput(name: string, index: number): boolean {
      return allCalls.some((call) => {
        const callee = call.callee;
        const calleeName =
          callee.type === 'Identifier'
            ? callee.name
            : callee.type === 'MemberExpression'
              ? // `fs['readFileSync'](p)` reads the same file `fs.readFileSync(p)`
                // does. `propertyName` resolves both spellings, and a dynamic
                // `fs[m]` still yields null, which stays undefined here.
                (propertyName(callee) ?? undefined)
              : undefined;
        if (calleeName !== name) return false;
        const arg = call.arguments[index];
        return (
          arg !== undefined &&
          arg.type !== 'SpreadElement' &&
          readsUserInput(arg)
        );
      });
    }

    /**
     * Does this variable trace back to a request?
     *
     * This rule reports "File path from user input — path traversal
     * vulnerability". It was firing on any unsanitized identifier, so it said
     * that about build scripts and config loaders where no request exists —
     * and it duplicated `detect-non-literal-fs-filename` on 25 corpus sites,
     * telling the reader twice, at two severities, about one line.
     *
     * The two rules now partition: this one reports what it can attribute to a
     * request, the generic one reports the rest. Exactly one rule owns a site.
     *
     * A bare function PARAMETER used to be treated as user input outright, on
     * the reasoning that the callee cannot see what a caller passes. That is
     * true and still leaves the claim unproven, and on real code the claim was
     * usually false: `files.forEach(file => fs.readFileSync(file))` over a
     * `globby.sync` result (okta `scripts/buildtools/maintain-banners.js:16,19`)
     * and `hashFileSync(context.filename)` (Shopify
     * `packages/eslint-plugin-cli/rules/no-inline-graphql.js:43`) are build
     * tooling with no request anywhere in the process. Both were reported as
     * "file path from user input".
     *
     * So a parameter is now attributed the same way everything else is — by
     * evidence. If a call site in this file passes a request-derived value into
     * that position, the parameter carries it; otherwise its provenance is
     * unresolved, which is `detect-non-literal-fs-filename`'s territory (and,
     * by that rule's own measured default, silent). A parameter steered from
     * another module is a caller-side fact this rule cannot see and no longer
     * asserts.
     */
    function variableTracesToUserInput(
      varName: string,
      from: TSESTree.Node,
    ): boolean {
      // The path argument IS the request object: `fs.readFileSync(req)`.
      // `readsUserInput` recognises this for `req.query.f` but never saw the
      // bare form, because a bare Identifier is routed here instead.
      if (userInputSources.has(varName.toLowerCase())) return true;

      // `Program.parent` is null, not undefined — `!= null` catches both, and
      // an `!== undefined` loop walked straight off the top of the tree.
      let scope: TSESTree.Node | undefined | null = from;
      while (scope != null) {
        if (
          scope.type === 'FunctionDeclaration' ||
          scope.type === 'FunctionExpression' ||
          scope.type === 'ArrowFunctionExpression'
        ) {
          const index = scope.params.findIndex(
            (param) => param.type === 'Identifier' && param.name === varName,
          );
          if (index !== -1) {
            const name = functionName(scope);
            return name !== undefined && callerPassesUserInput(name, index);
          }
        }
        const body =
          scope.type === 'Program' || scope.type === 'BlockStatement'
            ? scope.body
            : undefined;
        if (body !== undefined) {
          for (const stmt of body) {
            if (stmt.type !== 'VariableDeclaration') continue;
            for (const decl of stmt.declarations) {
              if (decl.id.type !== 'Identifier' || decl.id.name !== varName)
                continue;
              // A local bound to something we CAN see, and it is not a
              // request: that is the generic rule's territory, not ours.
              return decl.init != null && readsUserInput(decl.init);
            }
          }
        }
        scope = scope.parent;
      }
      // Unresolvable in this file — an import, a global. Not attributable to a
      // request, so the generic rule owns it.
      return false;
    }

    // Track variables that have been sanitized with path.basename()
    const sanitizedVariables = new Set<string>();
    // Track variables that have been validated with startsWith() guards
    const validatedVariables = new Set<string>();

    /**
     * Check if a variable is assigned from path.basename() or path.join() with basename
     */
    function checkVariableDeclaration(node: TSESTree.VariableDeclarator) {
      if (node.id.type !== 'Identifier' || !node.init) {
        return;
      }

      const varName = node.id.name;
      const init = node.init;

      bindings.set(varName, init);

      // Check for path.basename() assignment
      if (
        init.type === 'CallExpression' &&
        init.callee.type === 'MemberExpression' &&
        init.callee.object.type === 'Identifier' &&
        init.callee.object.name === 'path' &&
        propertyName(init.callee) === 'basename'
      ) {
        sanitizedVariables.add(varName);
      }

      // Check for path.join() with a sanitized variable or literal base
      if (
        init.type === 'CallExpression' &&
        init.callee.type === 'MemberExpression' &&
        init.callee.object.type === 'Identifier' &&
        init.callee.object.name === 'path' &&
        propertyName(init.callee) === 'join'
      ) {
        // Check if any argument is a sanitized variable
        const hasSanitizedArg = init.arguments.some(
          (arg: TSESTree.CallExpressionArgument) =>
            arg.type === 'Identifier' && sanitizedVariables.has(arg.name),
        );

        // Check if first arg is a safe base (literal or known safe variable)
        const firstArg = init.arguments[0];
        const hasSafeBase =
          firstArg &&
          (firstArg.type === 'Literal' ||
            (firstArg.type === 'Identifier' &&
              /^(SAFE|BASE|ROOT|UPLOAD|PUBLIC)/i.test(firstArg.name)));

        if (hasSanitizedArg && hasSafeBase) {
          sanitizedVariables.add(varName);
        }
      }
    }

    /**
     * Check if there's a startsWith() guard validation for this variable
     * Looks for patterns like:
     * if (!path.startsWith(baseDir)) { throw ... }
     * if (!path.startsWith(baseDir)) { return ... }
     */
    function hasStartsWithGuard(node: TSESTree.Node, varName: string): boolean {
      // Already validated
      if (validatedVariables.has(varName)) {
        return true;
      }

      // Walk up to find the containing block or function
      let current: TSESTree.Node | undefined = node.parent;

      while (current) {
        // If we've reached a function body or block, search its statements
        if (current.type === AST_NODE_TYPES.BlockStatement) {
          const statements = current.body;

          // Look for IF statements in this block that validate our variable
          for (const stmt of statements) {
            if (stmt.type === AST_NODE_TYPES.IfStatement) {
              const testText = sourceCode.getText(stmt.test).toLowerCase();

              // Check for startsWith() validation pattern with our variable
              if (
                testText.includes('startswith') &&
                testText.includes(varName.toLowerCase())
              ) {
                // Check if this is a guard clause (negated condition with throw/return)
                const consequent = stmt.consequent;

                // Handle block statement: if (...) { throw/return; }
                if (
                  consequent.type === AST_NODE_TYPES.BlockStatement &&
                  consequent.body.length > 0
                ) {
                  const firstStmt = consequent.body[0];
                  if (
                    firstStmt.type === AST_NODE_TYPES.ThrowStatement ||
                    firstStmt.type === AST_NODE_TYPES.ReturnStatement
                  ) {
                    validatedVariables.add(varName);
                    return true;
                  }
                }

                // Handle direct statement: if (...) throw/return;
                if (
                  consequent.type === AST_NODE_TYPES.ThrowStatement ||
                  consequent.type === AST_NODE_TYPES.ReturnStatement
                ) {
                  validatedVariables.add(varName);
                  return true;
                }
              }
            }
          }
        }

        // Also check if current IS an if statement (when node is inside the consequent)
        if (current.type === AST_NODE_TYPES.IfStatement) {
          const testText = sourceCode.getText(current.test).toLowerCase();
          if (
            testText.includes('startswith') &&
            testText.includes(varName.toLowerCase())
          ) {
            validatedVariables.add(varName);
            return true;
          }
        }

        current = current.parent;
      }

      return false;
    }

    /**
     * Check if a variable comes from a sanitized/validated source
     */
    function isVariableSafe(varName: string, node: TSESTree.Node): boolean {
      // Already tracked as sanitized
      if (sanitizedVariables.has(varName)) {
        return true;
      }

      // Has startsWith guard validation
      if (hasStartsWithGuard(node, varName)) {
        return true;
      }

      /*
       * A NAME may not overrule what the code plainly shows.
       *
       * This withheld on `/^(safe|sanitized|validated|clean)/i` unconditionally,
       * so the same CWE-22 traversal reported or not depending only on the
       * spelling of a binding:
       *
       *   const userPath      = req.query.f  ->  reported
       *   const cleanPath     = req.query.f  ->  SILENT
       *   const validatedPath = req.query.f  ->  SILENT
       *
       * Nothing was sanitized in any of them. A name that causes a REPORT
       * produces a false positive somebody complains about; a name that causes
       * SILENCE produces a false negative nobody ever sees, which is why this
       * direction needs the stricter rule.
       *
       * The convention still counts where the code says nothing — a parameter
       * named `sanitizedHtml` arriving from another function has no visible
       * initialiser, and refusing to trust it would flood the noise floor. It
       * is ignored only when the binding's own initialiser is a user-input
       * read, which is the code CONTRADICTING the name rather than being
       * silent about it.
       */
      if (/^(safe|sanitized|validated|clean)/i.test(varName)) {
        const bound = bindings.get(varName);
        if (bound === undefined) return true;
        /*
         * A CALL is where laundering happens, so it is not a contradiction.
         * `const cleanPath = sanitizePath(req.query.f)` reads user input and
         * is exactly what the name claims; treating any taint below the
         * initialiser as contradicting cost a false positive on that shape the
         * first time this was tightened. Only a DIRECT read — the request
         * expression assigned straight to the binding — says the name is wrong.
         */
        if (bound.type === AST_NODE_TYPES.CallExpression) return true;
        return !readsUserInput(bound);
      }

      return false;
    }

    return {
      // Track variable declarations for sanitization patterns
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        checkVariableDeclaration(node);
      },

      // Collected, not judged: a parameter is attributed by what callers pass,
      // and a caller further down the file is still a caller.
      CallExpression(node: TSESTree.CallExpression) {
        allCalls.push(node);
      },

      'Program:exit'() {
        for (const node of allCalls) checkFsCall(node);
      },
    };

    function checkFsCall(node: TSESTree.CallExpression) {
      // Detect fs.* with user input
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'fs' &&
        [...fsReadMethods, ...fsWriteMethods].includes(
          propertyName(node.callee) ?? '',
        )
      ) {
        const pathArg = node.arguments[0];

        // Skip if path is a literal (safe)
        if (pathArg && pathArg.type === 'Literal') {
          return;
        }

        // Check if path is a variable
        if (pathArg && pathArg.type === 'Identifier') {
          const varName = pathArg.name;

          // Skip if variable is sanitized or validated
          if (isVariableSafe(varName, node)) {
            return;
          }

          // This rule's message names user input as the cause. Without
          // evidence of a request it is both wrong and a duplicate of
          // detect-non-literal-fs-filename, which owns unattributable paths.
          if (!variableTracesToUserInput(varName, node)) {
            return;
          }

          report(node);
          return;
        }

        // Flag if path is from a member expression (user input sources)
        // `fs.readFile(req.query.file)` — the direct shape. Now walks the
        // whole chain, so `req.body.upload.path` is caught too; the old
        // check read only the immediate object and missed anything deeper.
        if (pathArg !== undefined && readsUserInput(pathArg)) {
          report(node);
        }
      }
    }
  },
});
