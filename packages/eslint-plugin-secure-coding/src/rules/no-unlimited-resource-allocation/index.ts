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
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  isInsideLoop,
  isUserInputExpression,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'unlimitedResourceAllocation'
  | 'unlimitedBufferAllocation'
  | 'unlimitedFileOperations'
  | 'unlimitedNetworkConnections'
  | 'unlimitedMemoryAllocation'
  | 'userControlledResourceSize'
  | 'missingResourceLimits'
  | 'resourceAllocationInLoop'
  | 'implementResourceLimits'
  | 'validateResourceSize'
  | 'useResourcePools'
  | 'strategyResourceManagement'
  | 'strategyRateLimiting'
  | 'strategyResourceCleanup';

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
      unlimitedResourceAllocation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited Resource Allocation',
        cwe: 'CWE-770',
        description: 'Resource allocation without limits',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
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
      unlimitedNetworkConnections: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unlimited Network Connections',
        cwe: 'CWE-770',
        description: 'Network connections without limits',
        severity: 'MEDIUM',
        fix: 'Limit concurrent connections',
        documentationLink: 'https://nodejs.org/api/http.html',
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
      missingResourceLimits: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Resource Limits',
        cwe: 'CWE-770',
        description: 'Resource allocation lacks proper limits',
        severity: 'MEDIUM',
        fix: 'Implement resource size validation',
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
      implementResourceLimits: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Implement Resource Limits',
        description: 'Add limits to resource allocation',
        severity: 'LOW',
        fix: 'const limitedSize = Math.min(userSize, MAX_SIZE);',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
      validateResourceSize: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Resource Size',
        description: 'Validate resource size before allocation',
        severity: 'LOW',
        fix: 'if (size > MAX_SIZE) throw new Error("Size too large");',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
      useResourcePools: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Resource Pools',
        description: 'Use resource pools for better control',
        severity: 'LOW',
        fix: 'Implement connection pooling and resource reuse',
        documentationLink: 'https://en.wikipedia.org/wiki/Object_pool_pattern',
      }),
      strategyResourceManagement: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Resource Management Strategy',
        description: 'Implement comprehensive resource management',
        severity: 'LOW',
        fix: 'Use resource pools, limits, and cleanup mechanisms',
        documentationLink: 'https://cwe.mitre.org/data/definitions/770.html',
      }),
      strategyRateLimiting: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Rate Limiting Strategy',
        description: 'Implement rate limiting for resource allocation',
        severity: 'LOW',
        fix: 'Use rate limiters to prevent resource exhaustion',
        documentationLink: 'https://en.wikipedia.org/wiki/Rate_limiting',
      }),
      strategyResourceCleanup: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Resource Cleanup Strategy',
        description: 'Ensure proper resource cleanup',
        severity: 'LOW',
        fix: 'Implement try-finally blocks and resource disposal',
        documentationLink: 'https://en.wikipedia.org/wiki/Resource_management_(computing)',
      })
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

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        for (const spec of node.specifiers) {
          if (spec.type === 'ImportDefaultSpecifier' || spec.type === 'ImportNamespaceSpecifier') {
            noteArchiveBinding(spec.local.name, String(node.source.value));
          }
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
            
            // SAFE: Static path construction with path.join(__dirname, ...literals)
            // This is a common pattern that doesn't involve user input
            if (pathArg.type === 'CallExpression' &&
                pathArg.callee.type === 'MemberExpression' &&
                pathArg.callee.object.type === 'Identifier' &&
                pathArg.callee.object.name === 'path' &&
                pathArg.callee.property.type === 'Identifier' &&
                (pathArg.callee.property.name === 'join' || pathArg.callee.property.name === 'resolve')) {
              // Check if first arg is __dirname and all subsequent args are literals
              const pathArgs = pathArg.arguments;
              if (pathArgs.length > 0 &&
                  pathArgs[0].type === 'Identifier' &&
                  pathArgs[0].name === '__dirname' &&
                  pathArgs.slice(1).every(arg => arg.type === 'Literal')) {
                // Safe: path.join(__dirname, 'static', 'path')
                return;
              }
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

        if (isDecompression()) {
          context.report({
            node,
            messageId: 'unlimitedFileOperations',
            data: {
              filePath: filename,
              line: String(node.loc.start.line),
            },
          });
        }

        // XML expansion attack detection
        if (calleeText.includes('xml2js') || calleeText.includes('parseString')) {
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

        // Check for recursive data structure processing
        if (calleeText.includes('map') || calleeText.includes('forEach')) {
          const args = node.arguments;
          if (args.length > 0) {
            const callbackArg = args[0];
            const callbackText = sourceCode.getText(callbackArg);
            // Detect patterns that create arrays from nested object properties
            if (callbackText.includes('Object.keys') && callbackText.includes('map')) {
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

        // Check for resource allocation inside loops
        if (isInsideLoop(node)) {
          // Check if this allocates resources
          if (calleeText.includes('alloc') ||
              calleeText.includes('Array') ||
              calleeText.includes('Buffer') ||
              calleeText.includes('readFile') ||
              calleeText.includes('writeFile')) {

            // SAFE: Array.isArray / Array.from / Array.of are not allocation hazards.
            if (calleeText === 'Array.isArray' ||
                calleeText === 'Array.from' ||
                calleeText === 'Array.of') {
              // Array.from / Array.of are fine; allocation comes from their args, not size
            } else {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              // SAFE: first arg is a numeric literal — size is statically bounded.
              const firstArg = node.arguments[0];
              if (firstArg?.type === 'Literal' && typeof firstArg.value === 'number') {
                return;
              }

              // Skip if this is an assignment to an array element (pre-allocated pattern)
              const parent = node.parent;
              if (parent && parent.type === 'AssignmentExpression' &&
                  parent.left.type === 'MemberExpression' &&
                  parent.left.object.type === 'Identifier') {
                return;
              }

              // Report resourceAllocationInLoop - this can be in addition to user input errors
              context.report({
                node,
                messageId: 'resourceAllocationInLoop',
                data: {
                  filePath: filename,
                  line: String(node.loc.start.line),
                },
              });
            }
          }
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

        // Check for resource allocation inside loops
        if (isInsideLoop(node)) {
          const newCalleeText = sourceCode.getText(callee);
          if (newCalleeText.includes('Buffer') ||
              newCalleeText.includes('Array') ||
              newCalleeText.includes('Map') ||
              newCalleeText.includes('Set')) {

            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            // SAFE: first arg is a numeric literal — size is statically bounded.
            const firstArg = node.arguments[0];
            if (firstArg?.type === 'Literal' && typeof firstArg.value === 'number') {
              return;
            }

            context.report({
              node,
              messageId: 'resourceAllocationInLoop',
              data: {
                filePath: filename,
                line: String(node.loc.start.line),
              },
            });
          }
        }
      }
    };
  },
});
