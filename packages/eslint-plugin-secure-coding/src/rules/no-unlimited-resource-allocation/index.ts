/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unlimited-resource-allocation
 * Detects unlimited resource allocation vulnerabilities (CWE-770)
 *
 * Unlimited resource allocation can cause denial of service by exhausting
 * system resources like memory, file handles, or network connections.
 * This rule detects patterns where resources are allocated without limits.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe resource allocation patterns
 * - Proper resource limits
 * - JSDoc annotations (@limited-resource, @safe-allocation)
 * - Resource cleanup patterns
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, isStaticExpression } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  isInsideLoop,
  isUserInputExpression,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'unlimitedBufferAllocation'
  | 'unlimitedFileOperations'
  | 'unlimitedMemoryAllocation'
  | 'userControlledResourceSize'
  | 'resourceAllocationInLoop';

export interface Options extends SecurityRuleOptions {
  /** Maximum allowed resource size for static analysis */
  maxResourceSize?: number;

  /** Variables that contain user input */
  userInputVariables?: string[];

  /** Safe resource allocation functions */
  safeResourceFunctions?: string[];

  /** Require resource validation */
  requireResourceValidation?: boolean;
}

type RuleOptions = [Options?];

export const noUnlimitedResourceAllocation = createRule<RuleOptions, MessageIds>({
  name: 'no-unlimited-resource-allocation',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unlimited-resource-allocation.md',
      description: 'Detects unlimited resource allocation that could cause DoS',
      cwe: 'CWE-770',
    },
    messages: {
      unlimitedBufferAllocation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited Buffer Allocation',
        cwe: 'CWE-770',
        description: 'Buffer allocated without size limits',
        severity: 'HIGH',
        fix: 'Set maximum buffer size limits',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      unlimitedFileOperations: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited File Operations',
        cwe: 'CWE-770',
        description: 'File operations without size limits',
        severity: 'MEDIUM',
        fix: 'Validate file size before operations',
        documentationLink: 'https://nodejs.org/api/fs.html',
      }),
      unlimitedMemoryAllocation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited Memory Allocation',
        cwe: 'CWE-770',
        description: 'Memory allocated without limits',
        severity: 'MEDIUM',
        fix: 'Set memory allocation limits',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      userControlledResourceSize: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'User Controlled Resource Size',
        cwe: 'CWE-770',
        description: 'Resource size controlled by user input',
        severity: 'HIGH',
        fix: 'Validate and limit user-controlled resource sizes',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
      resourceAllocationInLoop: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Resource Allocation in Loop',
        cwe: 'CWE-770',
        description: 'Resource allocation inside loop without limits',
        severity: 'HIGH',
        fix: 'Move resource allocation outside loop or add iteration limits',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxResourceSize: {
            type: 'number',
            minimum: 1024,
            default: 1048576, // 1MB
            description: 'Allocation size in bytes above which a call is reported',
          },
          userInputVariables: {
            type: 'array',
            items: { type: 'string' },
            default: ['req', 'request', 'body', 'query', 'params', 'input', 'data'], description: 'Variable names treated as user-controlled input'
          },
          safeResourceFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['validateSize', 'checkLimits', 'limitResource', 'safeAlloc'], description: 'Function names that bound an allocation'
          },
          requireResourceValidation: {
            type: 'boolean',
            default: true, description: 'Require an explicit size check before allocating'
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as resource validators',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional JSDoc annotations to consider as safe markers',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      maxResourceSize: 1048576, // 1MB
      userInputVariables: ['req', 'request', 'body', 'query', 'params', 'input', 'data'],
      safeResourceFunctions: ['validateSize', 'checkLimits', 'limitResource', 'safeAlloc'],
      requireResourceValidation: true,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      maxResourceSize = 1048576,
      userInputVariables = ['req', 'request', 'body', 'query', 'params', 'input', 'data'],
      safeResourceFunctions = ['validateSize', 'checkLimits', 'limitResource', 'safeAlloc'],
      requireResourceValidation = true,
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode;
    const filename = context.filename;

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    /**
     * Check if an expression contains user input - using shared utility
     */
    const isUserInput = (expression: TSESTree.Expression): boolean => 
      isUserInputExpression(expression, sourceCode, userInputVariables);

    /**
     * Check if resource allocation has size validation
     */
    // All call sites invoke this only after already confirming `args.length > 0`,
    // so the "no arguments" case is unreachable and intentionally not handled here.
    const hasSizeValidation = (node: TSESTree.CallExpression | TSESTree.NewExpression): boolean => {
      const args = node.arguments;

      // Check if size argument is a validated expression
      const sizeArg = args[0];
      const sizeText = sourceCode.getText(sizeArg);

      // Look for validation patterns
      return sizeText.includes('Math.min(') ||
             sizeText.includes('Math.max(') ||
             sizeText.includes('Math.clamp(') ||
             safeResourceFunctions.some(func => sizeText.includes(func));
    };

    /**
     * Estimate resource size from static analysis
     */
    const estimateResourceSize = (sizeExpression: TSESTree.Expression): number | null => {
      if (sizeExpression.type === 'Literal' && typeof sizeExpression.value === 'number') {
        return sizeExpression.value;
      }

      // Handle binary expressions like 1024 * 1024 * 100
      if (sizeExpression.type === 'BinaryExpression') {
        const left = estimateResourceSize(sizeExpression.left as TSESTree.Expression);
        const right = estimateResourceSize(sizeExpression.right as TSESTree.Expression);

        if (left !== null && right !== null) {
          switch (sizeExpression.operator) {
            case '*':
              return left * right;
            case '+':
              return left + right;
            case '-':
              return left - right;
            case '/':
              return right !== 0 ? left / right : null;
            default:
              return null;
          }
        }
      }

      return null;
    };

    /**
     * Local names bound to a decompression module. Populated from imports and
     * requires so an aliased binding (`const unzip = require('unzipper')`)
     * resolves, while an unrelated identifier that merely reads like one does
     * not.
     */
    const ARCHIVE_MODULES = /^(unzipper|tar|tar-stream|yauzl|adm-zip|node:zlib|zlib)$/;
    const archiveBindings = new Set<string>(['zlib']);

    const noteArchiveBinding = (local: string, source: string): void => {
      if (ARCHIVE_MODULES.test(source)) archiveBindings.add(local);
    };

    /**
     * Local names bound to an XML parser, tracked for the same reason as
     * {@link archiveBindings}: the entity-expansion check used to fire on any
     * callee whose printed text contained 'parseString'.
     */
    const XML_MODULES = /^(xml2js|fast-xml-parser|xmldom|@xmldom\/xmldom|libxmljs|libxmljs2)$/;
    const XML_PARSE_METHODS: ReadonlySet<string> = new Set([
      'parseString', 'parseStringPromise',
    ]);
    const xmlBindings = new Set<string>();

    const noteXmlBinding = (local: string, source: string): void => {
      if (XML_MODULES.test(source)) xmlBindings.add(local);
    };


    /**
     * A call that actually allocates, sized by something non-constant, inside a
     * loop BODY.
     *
     * Three separate requirements, each of which the old substring heuristic
     * lacked:
     *
     * 1. The callee is an allocation, matched exactly — not text that contains
     *    'Array'. `Buffer.byteLength` and `Array.isArray` are not allocations.
     * 2. There is a size argument and it is not a numeric literal. A zero-arg
     *    `new Set()` allocates a constant, and `Buffer.alloc(512)` is bounded.
     * 3. It is in the loop's BODY, not its init. `for (var e = Array(t), u = 0; …)`
     *    runs once, however dynamic `t` is.
     *
     * @protocol-constant Every entry is a built-in global: the ECMAScript
     * collection constructors (`Array`, `Map`, `Set`, `WeakMap`, `WeakSet`) and
     * Node's `Buffer` allocation API (`Buffer.alloc`, `Buffer.allocUnsafe`,
     * `Buffer.allocUnsafeSlow`, and `Buffer` itself). Those are the only calls
     * in the language that take a size argument and reserve memory for it, so
     * the set is closed by the platform rather than curated from a domain — a
     * consumer's own allocator is a wrapper around one of these, and the
     * wrapped call is where the loop bound is missing. Making it editable would
     * let a consumer delete `Buffer.allocUnsafe` and silence CWE-770 on exactly
     * the unbounded per-iteration allocation the rule exists to find, or add an
     * ordinary factory and report every `new Thing(n)` inside a loop.
     */
    const ALLOCATORS: ReadonlySet<string> = new Set([
      'Buffer.alloc', 'Buffer.allocUnsafe', 'Buffer.allocUnsafeSlow',
      'Buffer', 'Array', 'Map', 'Set', 'WeakMap', 'WeakSet',
    ]);

    const isAllocationInLoopBody = (
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ): boolean => {
      const callee = node.callee;
      let name: string | undefined;
      if (callee.type === 'Identifier') {
        name = callee.name;
      } else if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.property.type === 'Identifier'
      ) {
        name = `${callee.object.name}.${callee.property.name}`;
      }
      if (name === undefined || !ALLOCATORS.has(name)) return false;

      const sizeArg = node.arguments[0];
      if (sizeArg === undefined) return false;
      if (sizeArg.type === 'Literal' && typeof sizeArg.value === 'number') return false;

      if (!isInsideLoop(node)) return false;

      // `buffers[i] = Buffer.alloc(n)` fills a container the caller already
      // sized; the loop bound is the allocation bound. Preserved from the
      // predicate this replaced.
      const parent = node.parent;
      if (
        parent?.type === 'AssignmentExpression' &&
        parent.left.type === 'MemberExpression'
      ) {
        return false;
      }

      // Walk out to the loop and reject anything reached through its init.
      let current: TSESTree.Node | undefined = node;
      let child: TSESTree.Node | undefined;
      while (current != null) {
        if (current.type === 'ForStatement' && child !== undefined && current.init === child) {
          return false;
        }
        child = current;
        current = current.parent;
      }
      return true;
    };

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        for (const spec of node.specifiers) {
          if (spec.type === 'ImportDefaultSpecifier' || spec.type === 'ImportNamespaceSpecifier') {
            noteArchiveBinding(spec.local.name, String(node.source.value));
          }
          // `import { parseString } from 'xml2js'` binds the parser directly.
          noteXmlBinding(spec.local.name, String(node.source.value));
        }
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.id.type === 'Identifier' &&
          node.init?.type === 'CallExpression' &&
          node.init.callee.type === 'Identifier' &&
          node.init.callee.name === 'require' &&
          node.init.arguments[0]?.type === 'Literal'
        ) {
          noteArchiveBinding(node.id.name, String(node.init.arguments[0].value));
          noteXmlBinding(node.id.name, String(node.init.arguments[0].value));
        }

        // `const parser = new xml2js.Parser()` — the instance carries the
        // parser, and `parser.parseString(xml)` is the billion-laughs sink.
        // Without this the binding chain stops at the module.
        if (
          node.id.type === 'Identifier' &&
          node.init?.type === 'NewExpression'
        ) {
          const constructor = node.init.callee;
          const fromXmlModule =
            (constructor.type === 'Identifier' && xmlBindings.has(constructor.name)) ||
            (constructor.type === 'MemberExpression' &&
              constructor.object.type === 'Identifier' &&
              xmlBindings.has(constructor.object.name));
          if (fromXmlModule) xmlBindings.add(node.id.name);
        }
      },

      // Check Buffer allocation
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        const calleeText = sourceCode.getText(callee);

        // Check for Buffer.alloc(), Buffer.allocUnsafe() or new Buffer()
        const isBufferAlloc =
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Buffer' &&
          callee.property.type === 'Identifier' &&
          (callee.property.name === 'alloc' || callee.property.name === 'allocUnsafe');

        const isNewBuffer =
          callee.type === 'NewExpression' &&
          callee.callee.type === 'Identifier' &&
          callee.callee.name === 'Buffer';

        if (isBufferAlloc || isNewBuffer) {

          const args = node.arguments;
          if (args.length > 0) {
            const sizeArg = args[0];

            // Check if size comes from user input (but skip if validated).
            // When `requireResourceValidation` is disabled, callers have opted
            // out of the "must call a validator" requirement entirely, so this
            // branch is skipped regardless of whether validation is present.
            if (
              requireResourceValidation &&
              sizeArg.type !== 'SpreadElement' &&
              isUserInput(sizeArg) &&
              !hasSizeValidation(node)
            ) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'userControlledResourceSize',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
              return;
            }

            // Check if size exceeds limits
            const estimatedSize = sizeArg.type === 'SpreadElement' ? null : estimateResourceSize(sizeArg);
            if (estimatedSize && estimatedSize > maxResourceSize) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'unlimitedBufferAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
              return;
            }

            // NOTE: a `missingResourceLimits` check previously lived here for
            // "non-literal, user-input sizes with no validation" — but that
            // condition is a strict subset of the userControlledResourceSize
            // check above (same `isUserInput(sizeArg) && !hasSizeValidation(node)`
            // predicate), which already reports and returns first. It was
            // therefore unreachable dead code and has been removed
            // (behavior-neutral: no observable path changes).
          }
        }

        // Check for multer configuration without limits
        if (callee.type === 'Identifier' && callee.name === 'multer') {
          const args = node.arguments;
          if (args.length > 0 && args[0].type === 'ObjectExpression') {
            const props = args[0].properties as TSESTree.ObjectLiteralElement[];
            
            // Check for valid limits definition
            const hasValidLimits = props.some((prop: TSESTree.ObjectLiteralElement): boolean => {
              if (prop.type !== 'Property' || prop.key.type !== 'Identifier') {
                return false;
              }

              // Direct fileSize (not standard but maybe used?)
              if (prop.key.name === 'fileSize') return true;

              // Limits object
              if (prop.key.name === 'limits' && prop.value.type === 'ObjectExpression') {
                return prop.value.properties.some(
                  (limitProp: TSESTree.ObjectLiteralElement): limitProp is TSESTree.Property =>
                    limitProp.type === 'Property' &&
                    limitProp.key.type === 'Identifier' &&
                    limitProp.key.name === 'fileSize'
                );
              }

              return false;
            });

            if (!hasValidLimits) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node,
                messageId: 'unlimitedFileOperations',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
            }
          }
          return;
        }

        // Check for fs operations
        if (callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'fs' &&
            callee.property.type === 'Identifier' &&
            ['readFile', 'writeFile', 'readFileSync', 'writeFileSync'].includes(callee.property.name)) {

          const args = node.arguments;
          if (args.length > 0) {
            // Check if file path comes from user input (potential for large files)
            const pathArg = args[0];
            
            // A path nothing can steer cannot open a file of attacker-chosen size.
            // This was a bespoke `path.join(__dirname, ...literals)` special case, so
            // `path.resolve`, a `const` holding the path, and
            // `require.resolve('eslint/package.json')` all fell through to the
            // user-input check and reported. `isStaticExpression` covers all of them,
            // and every rule in the ecosystem shares the same answer.
            if (
              pathArg.type !== 'SpreadElement' &&
              isStaticExpression({ node: pathArg, scope: context.sourceCode.getScope(pathArg) })
            ) {
              return;
            }

            if (pathArg.type !== 'SpreadElement' && isUserInput(pathArg)) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: pathArg,
                messageId: 'unlimitedFileOperations',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
            }
          }
        }

        // Check for Array constructor with user input
        if (callee.type === 'Identifier' && callee.name === 'Array') {
          const args = node.arguments;
          if (args.length === 1) {
            const sizeArg = args[0];
            if (sizeArg.type !== 'SpreadElement' && isUserInput(sizeArg)) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'unlimitedMemoryAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
            }
          }
        }

        // ZIP bomb detection — unlimited decompression.
        //
        // This was `calleeText.includes('unzipper') || calleeText.includes('Extract')`
        // over the callee's printed text, reporting unconditionally. The bare
        // substring 'Extract' matched passport-jwt's standard configuration —
        //
        //   jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
        //
        // — so four separate repos in the wild corpus were told their bearer
        // token extractor was an unbounded decompression. Nine findings, none
        // of them touching an archive.
        //
        // Match the decompression APIs on the AST instead: the receiver must
        // be a known archive library, or the callee a known stream factory.
        const isDecompression = (): boolean => {
          if (callee.type !== 'MemberExpression') return false;
          const member = callee as TSESTree.MemberExpression;
          const receiver =
            member.object.type === 'Identifier' ? member.object.name : '';
          // Resolve the receiver to what it was imported from, not to what it
          // is called. `const unzip = require('unzipper')` is the ordinary
          // spelling, and matching the variable name would miss it — the same
          // names-are-not-evidence mistake this fix exists to correct.
          if (!archiveBindings.has(receiver)) return false;
          const method =
            member.property.type === 'Identifier' ? member.property.name : '';
          return /^(Extract|Parse|extract|createGunzip|createUnzip|createInflate|open)$/.test(
            method,
          );
        };

        /**
         * `zlib.createGunzip({ maxOutputLength: 50 * 1024 * 1024 })` is the
         * fix this report asks for, so a call that already carries it must
         * stop reporting — otherwise the only remedy on offer is the one the
         * author already applied.
         */
        const hasDecompressionLimit = (): boolean =>
          node.arguments.some(
            (argument) =>
              argument.type === 'ObjectExpression' &&
              argument.properties.some(
                (property) =>
                  property.type === 'Property' &&
                  property.key.type === 'Identifier' &&
                  ['maxOutputLength', 'maxSize', 'limit'].includes(property.key.name),
              ),
          );

        if (isDecompression() && !hasDecompressionLimit()) {
          context.report({
            node,
            messageId: 'unlimitedFileOperations',
            data: {
              filePath: filename,
              line: String(node.loc.start.line),
            },
          });
        }

        // XML expansion attack detection (billion laughs).
        //
        // `calleeText.includes('parseString')` matched ioredis's
        //
        //   const token = parseStringArgument(args[i])
        //       redis/ioredis lib/utils/argumentParsers.ts:77
        //
        // — a helper that reads one Redis command token and touches no XML at
        // all. Match the API on the AST instead: `xml2js.parseString(…)`,
        // `parser.parseString(…)` where `parser` came from an XML module, or a
        // bare `parseString` imported from one.
        const isXmlExpansion = (): boolean => {
          if (callee.type === 'Identifier') {
            return xmlBindings.has(callee.name) && XML_PARSE_METHODS.has(callee.name);
          }
          if (
            callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.property.type === 'Identifier'
          ) {
            return (
              xmlBindings.has(callee.object.name) &&
              XML_PARSE_METHODS.has(callee.property.name)
            );
          }
          return false;
        };

        if (isXmlExpansion()) {
          context.report({
            node,
            messageId: 'unlimitedMemoryAllocation',
            data: {
              filePath: filename,
              line: String(node.loc.start.line),
            },
          });
        }



        // Check for cache with unlimited growth
        if (calleeText.includes('set') && sourceCode.getText(node).includes('Buffer.alloc')) {
          // Detect cache patterns that allocate buffers without limits
          const args = node.arguments;
          if (args.length >= 2) {
            const valueArg = args[1];
            const valueText = sourceCode.getText(valueArg);
            if (valueText.includes('Buffer.alloc') && valueText.includes('length')) {
              context.report({
                node,
                messageId: 'unlimitedMemoryAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
            }
          }
        }

        // A "recursive data structure processing" check used to live here. It
        // reported any call whose printed callee text contained 'map' or
        // 'forEach' when the printed text of its first argument contained both
        // 'Object.keys' and 'map':
        //
        //   inputsFromRemediation.forEach(inputFromRemediation => { … })
        //       okta-auth-js lib/idx/remediators/Base/Remediator.ts:170
        //   return errors.map((error) => { … })
        //       Shopify CLI packages/cli-kit/src/public/node/json-schema.ts:136
        //
        // Two of this rule's four wild-corpus findings, both on ordinary array
        // iteration over a value the program itself produced.
        //
        // It was substring matching over printed source twice over — the
        // callee text of `remediationMap.forEach` contains 'map' before
        // 'forEach' is even considered, and the callback text is scanned
        // through comments and string literals. Worse, it asserted an impact
        // it never established: iterating an array is not an unbounded
        // allocation unless something unbounded is being iterated, and the
        // check never looked at where the array came from.
        //
        // Removed rather than narrowed. `arr.map(cb)` is the single most
        // common expression in JavaScript; there is no version of "your map
        // callback looks recursive" that is actionable. Unbounded allocation
        // driven by user input is already covered by the
        // `userControlledResourceSize` and `resourceAllocationInLoop` paths,
        // which do establish both the size and the source.

        // Allocation in a loop, judged by WHAT is allocated rather than by
        // whether the printed callee text happens to contain 'Buffer'.
        //
        // The previous form asked: is this inside any loop, and does
        // `sourceCode.getText(callee)` contain 'alloc' / 'Array' / 'Buffer' /
        // 'Map' / 'Set' / 'readFile' / 'writeFile'? On an 8-repo corpus that was
        // 37 of this rule's 43 findings, every one false:
        //
        //   Buffer.byteLength(arg)         a read-only size PROBE, allocates nothing
        //   this.#decodeArrayItems.bind()  matched via '.bind' containing 'Array'
        //   new Set()                      zero args, so the numeric-literal escape
        //                                  could never apply — every `new Set()` in
        //                                  any loop reported
        //   stringArray.push(x)            matched on the VARIABLE name
        //   for (var e = Array(t), u = 0; …)   the allocation is in the for-INIT and
        //                                  runs once
        //
        // The sharpest one: `system.ts:437` flagged the size cap itself — the next
        // lines throw `Stdin input exceeded the maximum allowed size`. The rule
        // reported the mitigation for its own finding.
        if (isAllocationInLoopBody(node)) {
          if (safetyChecker.isSafe(node, context)) {
            return;
          }
          context.report({
            node,
            messageId: 'resourceAllocationInLoop',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
      },

      // Check new expressions for resource allocation
      NewExpression(node: TSESTree.NewExpression) {
        const callee = node.callee;

        // Check for new Buffer() with user input
        if (callee.type === 'Identifier' && callee.name === 'Buffer') {
          const args = node.arguments;
          if (args.length > 0) {
            const sizeArg = args[0];

            // Check if size comes from user input (but skip if validated).
            // Disabling `requireResourceValidation` opts out of this check
            // entirely, mirroring the CallExpression Buffer.alloc() branch.
            if (
              requireResourceValidation &&
              sizeArg.type !== 'SpreadElement' &&
              isUserInput(sizeArg) &&
              !hasSizeValidation(node)
            ) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'userControlledResourceSize',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
              return;
            }

            // Check if size exceeds limits
            const estimatedSize = sizeArg.type === 'SpreadElement' ? null : estimateResourceSize(sizeArg);
            if (estimatedSize && estimatedSize > maxResourceSize) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'unlimitedBufferAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
              return;
            }

            // NOTE: same unreachable `missingResourceLimits` pattern as the
            // CallExpression Buffer.alloc handler above — removed for the
            // identical reason (subset of the userControlledResourceSize
            // check, which already reports and returns first).
          }
        }

        // Check for new Array() with user input
        if (callee.type === 'Identifier' && callee.name === 'Array') {
          const args = node.arguments;
          if (args.length === 1) {
            const sizeArg = args[0];
            if (sizeArg.type !== 'SpreadElement' && isUserInput(sizeArg)) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: sizeArg,
                messageId: 'unlimitedMemoryAllocation',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
            }
          }
        }


        // Same allocation-in-loop check as the CallExpression path — `new
        // Array(n)` and `new Set(x)` are the constructor spellings of it.
        if (isAllocationInLoopBody(node)) {
          if (safetyChecker.isSafe(node, context)) {
            return;
          }
          context.report({
            node,
            messageId: 'resourceAllocationInLoop',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
      }
    };
  },
});
