/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-buffer-overread
 * Detects buffer access beyond bounds (CWE-126)
 *
 * Buffer overread occurs when reading from buffers beyond their allocated
 * length, potentially leading to information disclosure, crashes, or
 * other security issues.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe buffer access patterns
 * - Bounds checking operations
 * - JSDoc annotations (@safe, @validated)
 * - Input validation functions
 */
import type { TSESLint, TSESTree, SecurityRuleOptions } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons, createSafetyChecker } from '@interlace/eslint-devkit';
import { findVariable } from '../../utils/provenance';

type MessageIds =
  | 'bufferOverread'
  | 'unsafeBufferAccess'
  | 'missingBoundsCheck'
  | 'negativeBufferIndex'
  | 'userControlledBufferIndex'
  | 'unsafeBufferSlice'
  | 'bufferLengthNotChecked'
  | 'useSafeBufferAccess'
  | 'validateBufferIndices'
  | 'checkBufferBounds'
  | 'strategyBoundsChecking'
  | 'strategyInputValidation'
  | 'strategySafeBuffers';

export interface Options extends SecurityRuleOptions {
  /** Buffer methods to check for bounds safety */
  bufferMethods?: string[];

  /** Functions that validate buffer indices */
  boundsCheckFunctions?: string[];

  /** Buffer types to monitor */
  bufferTypes?: string[];

  /** Additional function names to consider as buffer index validators */
  trustedSanitizers?: string[];

  /** Additional JSDoc annotations to consider as safe markers */
  strictMode?: boolean;

  /**
   * Report every buffer index this rule cannot prove validated, not only those
   * traceable to input. Default: `false`.
   *
   * `true` restores the pre-inversion behaviour. Measured on an 8-repo corpus
   * it produced 15 findings: two argument parsers, four loop counters in a
   * vendored keystroke recorder, one buffer WRITE, and eight in minified
   * bundles where one-letter names collide across closures.
   */
  reportUnvalidatedIndices?: boolean;
}

type RuleOptions = [Options?];

/**
 * Methods that return a VIEW over the same memory rather than reading a value.
 * Owned by the slice handler; the generic read/write handler must skip them so
 * one site yields one finding.
 */
const VIEW_METHODS: ReadonlySet<string> = new Set(['slice', 'subarray']);


export const noBufferOverread = createRule<RuleOptions, MessageIds>({
  name: 'no-buffer-overread',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-buffer-overread.md',
      description: 'Detects buffer access beyond bounds',
      cwe: 'CWE-126',
    },
    messages: {
      bufferOverread: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Buffer Overread',
        cwe: 'CWE-126',
        description: 'Buffer access beyond allocated bounds',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/126.html',
      }),
      unsafeBufferAccess: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Buffer Access',
        cwe: 'CWE-126',
        description: 'Buffer accessed without bounds validation',
        severity: 'HIGH',
        fix: 'Add bounds check before buffer access',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      missingBoundsCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Bounds Check',
        cwe: 'CWE-126',
        description: 'Buffer operation missing bounds validation',
        severity: 'MEDIUM',
        fix: 'Validate indices before buffer operations',
        documentationLink: 'https://cwe.mitre.org/data/definitions/126.html',
      }),
      negativeBufferIndex: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Negative Buffer Index',
        cwe: 'CWE-126',
        description: 'Negative index used for buffer access',
        severity: 'MEDIUM',
        fix: 'Ensure buffer indices are non-negative',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      userControlledBufferIndex: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'User Controlled Buffer Index',
        cwe: 'CWE-126',
        description: 'Buffer accessed with user-controlled index',
        severity: 'HIGH',
        fix: 'Validate user input before using as buffer index',
        documentationLink: 'https://cwe.mitre.org/data/definitions/126.html',
      }),
      unsafeBufferSlice: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Buffer Slice',
        cwe: 'CWE-126',
        description: 'Buffer slice with unvalidated indices',
        severity: 'MEDIUM',
        fix: 'Validate slice start/end indices',
        documentationLink: 'https://nodejs.org/api/buffer.html#bufslicestart-end',
      }),
      bufferLengthNotChecked: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Buffer Length Not Checked',
        cwe: 'CWE-126',
        description: 'Buffer length not validated before access',
        severity: 'MEDIUM',
        fix: 'Check buffer.length before operations',
        documentationLink: 'https://nodejs.org/api/buffer.html#buflength',
      }),
      useSafeBufferAccess: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Safe Buffer Access',
        description: 'Use bounds-checked buffer access methods',
        severity: 'LOW',
        fix: 'Use buffer.read*() with offset validation or safe wrapper functions',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      validateBufferIndices: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Buffer Indices',
        description: 'Validate buffer indices before use',
        severity: 'LOW',
        fix: 'Check 0 <= index < buffer.length',
        documentationLink: 'https://cwe.mitre.org/data/definitions/126.html',
      }),
      checkBufferBounds: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Check Buffer Bounds',
        description: 'Always check buffer bounds',
        severity: 'LOW',
        fix: 'Validate buffer operations against buffer.length',
        documentationLink: 'https://nodejs.org/api/buffer.html#buflength',
      }),
      strategyBoundsChecking: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Bounds Checking Strategy',
        description: 'Implement comprehensive bounds checking',
        severity: 'LOW',
        fix: 'Validate all buffer indices and lengths before operations',
        documentationLink: 'https://cwe.mitre.org/data/definitions/126.html',
      }),
      strategyInputValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Input Validation Strategy',
        description: 'Validate user input used as buffer indices',
        severity: 'LOW',
        fix: 'Sanitize and validate all user input before buffer operations',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      strategySafeBuffers: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Safe Buffer Strategy',
        description: 'Use safe buffer wrapper libraries',
        severity: 'LOW',
        fix: 'Use libraries that provide bounds-checked buffer operations',
        documentationLink: 'https://www.npmjs.com/package/safe-buffer',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          bufferMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['readUInt8', 'readUInt16LE', 'readUInt32LE', 'readInt8', 'readInt16LE', 'readInt32LE', 'writeUInt8', 'writeUInt16LE', 'writeUInt32LE', 'slice', 'subarray', 'copy'], description: 'Buffer read/write methods checked for bounds'
          },
          boundsCheckFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['validateIndex', 'checkBounds', 'safeIndex', 'validateBufferIndex'], description: 'Function names that count as a bounds check'
          },
          bufferTypes: {
            type: 'array',
            items: { type: 'string' },
            default: ['Buffer', 'Uint8Array', 'ArrayBuffer', 'DataView'], description: 'Constructor names treated as buffer types'
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as buffer index validators',
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
          reportUnvalidatedIndices: {
            type: 'boolean',
            default: false,
            description:
              'Report every index that cannot be proven validated. Restores the pre-inversion behaviour.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      bufferMethods: ['readUInt8', 'readUInt16LE', 'readUInt32LE', 'readInt8', 'readInt16LE', 'readInt32LE', 'writeUInt8', 'writeUInt16LE', 'writeUInt32LE', 'slice', 'subarray', 'copy'],
      boundsCheckFunctions: ['validateIndex', 'checkBounds', 'safeIndex', 'validateBufferIndex'],
      bufferTypes: ['Buffer', 'Uint8Array', 'ArrayBuffer', 'DataView'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      bufferMethods = ['readUInt8', 'readUInt16LE', 'readUInt32LE', 'readInt8', 'readInt16LE', 'readInt32LE', 'writeUInt8', 'writeUInt16LE', 'writeUInt32LE', 'slice', 'subarray', 'copy'],
      boundsCheckFunctions = ['validateIndex', 'checkBounds', 'safeIndex', 'validateBufferIndex'],
      bufferTypes = ['Buffer', 'Uint8Array', 'ArrayBuffer', 'DataView'],
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
      reportUnvalidatedIndices = false,
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

    // Pre-compute Sets for O(1) lookups (performance optimization)
    const bufferTypesSet = new Set(bufferTypes.map(t => t.toLowerCase()));
    const userControlledKeywords = new Set(['req', 'request', 'query', 'params', 'input', 'user', 'offset', 'index', 'body']);

    /**
     * Variables known to hold a buffer.
     *
     * Keyed by the resolved SCOPE VARIABLE, not by name. The set used to hold
     * bare strings, so one `const buf = Buffer.alloc(8)` anywhere in a file made
     * every unrelated `buf` in every other function a buffer — and in minified
     * bundles, where the same one-letter names are reused in dozens of
     * closures, that is most of the file. Shopify/cli's vendored speedscope
     * bundles produced 8 of the rule's 15 corpus findings that way.
     */
    const bufferVars = new Set<TSESLint.Scope.Variable>();

    /** Register a declarator's binding as a buffer, resolved through scope. */
    const addBufferVar = (id: TSESTree.Identifier): void => {
      const variable = findVariable(sourceCode, id);
      if (variable) bufferVars.add(variable);
    };

    /**
     * Check if this identifier refers to a buffer.
     *
     * Takes the NODE rather than the name so the binding can be resolved
     * through the scope chain — shadowing included.
     */
    const isBufferType = (node: TSESTree.Identifier): boolean => {
      const variable = findVariable(sourceCode, node);
      if (variable && bufferVars.has(variable)) return true;
      const lowerName = node.name.toLowerCase();
      for (const type of bufferTypesSet) {
        if (lowerName.includes(type)) return true;
      }
      // Conventional Buffer parameter names. `buf` and `bytes` are strong
      // signals for Node Buffer parameters (the original FN target). `b`
      // and `chunk` are intentionally excluded — single-char names and
      // stream-chunk array variables produce too many FPs in real code.
      if (lowerName === 'buf' || lowerName === 'bytes') return true;
      return false;
    };

    /**
     * Is this member expression being WRITTEN to rather than read?
     *
     * `buffer[i] = str.charCodeAt(i)` (`okta/okta-auth-js`
     * `lib/crypto/base64.ts:57`) is a buffer *overwrite* if it is anything —
     * CWE-787, a different weakness with a different fix. CWE-126 is about
     * reading past the end, and a rule that reports both under one id tells the
     * reader the wrong thing about what is wrong.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isWriteTarget = (node: TSESTree.Node): boolean => {
      const parent = node.parent;
      if (!parent) return false;
      if (parent.type === AST_NODE_TYPES.AssignmentExpression) return parent.left === node;
      return parent.type === AST_NODE_TYPES.UpdateExpression;
    };

    /**
     * Is this index the counter of a loop that already bounds it?
     *
     * `for (let c = 0, cl = charset.length; c < cl; ++c) charset[c]` cannot
     * overread: the loop condition IS the bounds check. The rule reported four
     * of these in `okta/okta-signin-widget`'s vendored TypingDNA recorder
     * (`typingdna.js:1206-1229`), where every access is `revs[i]` inside
     * `for (i = 0; i < revs.length; i++)`.
     *
     * Any `<`/`<=` comparison with the counter on the left counts. Proving the
     * right-hand side is the buffer's own length would be stricter, but a loop
     * bounded by *some* limit is not the unbounded read this rule is for, and
     * the stricter form would still miss `i < len` where `len` was hoisted.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isLoopBounded = (indexNode: TSESTree.Node): boolean => {
      if (indexNode.type !== AST_NODE_TYPES.Identifier) return false;
      const name = indexNode.name;
      let current: TSESTree.Node | undefined = indexNode.parent;
      while (current) {
        const test =
          current.type === AST_NODE_TYPES.ForStatement ||
          current.type === AST_NODE_TYPES.WhileStatement
            ? current.test
            : null;
        if (
          test &&
          test.type === AST_NODE_TYPES.BinaryExpression &&
          (test.operator === '<' || test.operator === '<=') &&
          test.left.type === AST_NODE_TYPES.Identifier &&
          test.left.name === name
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    };

    /**
     * Check if index is user-controlled
     * Uses Set-based keyword matching for O(1) lookups
     */
    const isUserControlledIndex = (indexNode: TSESTree.Node): boolean => {
      // Direct MemberExpression: `req.query.length`, `req.body.size`,
      // `event.queryStringParameters.limit`, etc. — walk the chain to
      // check if the root identifier is a known taint source. Closes the
      // audit FN where `buf.slice(0, req.query.length)` was bypassing
      // detection because the arg was a MemberExpression, not an
      // Identifier. See benchmarks/AUDIT_PATTERNS.md §3.6 ("taint-source
      // breadth").
      if (indexNode.type === 'MemberExpression') {
        let walker: TSESTree.Node = indexNode;
        while (walker.type === 'MemberExpression') {
          walker = walker.object;
        }
        if (walker.type === 'Identifier') {
          const root = walker.name.toLowerCase();
          // Express / Lambda / Koa / Hono taint-source roots.
          if (['req', 'request', 'event', 'ctx', 'context'].includes(root)) {
            return true;
          }
          // Generic user-controlled keyword check on root name.
          for (const keyword of userControlledKeywords) {
            if (root.includes(keyword)) return true;
          }
        }
      }

      if (indexNode.type === 'Identifier') {
        const varName = indexNode.name.toLowerCase();
        // Check each part of the variable name against keywords Set
        for (const keyword of userControlledKeywords) {
          if (varName.includes(keyword)) return true;
        }

        // Trace variable definition
        let currentScope: TSESLint.Scope.Scope | null = sourceCode.getScope(indexNode);
        let variable: TSESLint.Scope.Variable | null = null;
        while (currentScope) {
          variable = currentScope.variables.find(v => v.name === indexNode.name) || null;
          if (variable) break;
          currentScope = currentScope.upper;
        }

        if (variable && variable.defs.length > 0) {
             const def = variable.defs[0];
             if (def.type === 'Variable' && def.node.init) {
                 const init = def.node.init;
                 
                 // Check MemberExpression involving user keywords (e.g. req.body.index)
                 if (init.type === 'MemberExpression') {
                     const objectText = sourceCode.getText(init.object).toLowerCase();
                     const propertyText = sourceCode.getText(init.property).toLowerCase();
                     
                     const keywords = ['req', 'request', 'query', 'params', 'input', 'user', 'body'];
                     if (keywords.some(k => objectText.includes(k) || propertyText.includes(k))) {
                         return true;
                     }
                 }
                 
                 // Check CallExpression with user-controlled arguments (Number(req.query.index), parseInt(), etc.)
                 if (init.type === AST_NODE_TYPES.CallExpression) {
                     // Check if callee is a type conversion function
                     const typeConversionFunctions = ['number', 'parseint', 'parsefloat', 'string', 'boolean'];
                     let isTypeConversion = false;
                     
                     if (init.callee.type === AST_NODE_TYPES.Identifier) {
                         isTypeConversion = typeConversionFunctions.includes(init.callee.name.toLowerCase());
                     }
                     
                     // If it's a type conversion, check if the argument is user-controlled
                     if (isTypeConversion && init.arguments.length > 0) {
                         return isUserControlledIndex(init.arguments[0]);
                     }
                 }
                 
                 // Recursive check for Identifier assignment
                 if (init.type === 'Identifier' && init.name !== indexNode.name) {
                     return isUserControlledIndex(init);
                 }
             }
        }
      }
      
      // Check CallExpression arguments (Number(req.query.index))
      if (indexNode.type === AST_NODE_TYPES.CallExpression) {
          const typeConversionFunctions = ['Number', 'parseInt', 'parseFloat', 'String', 'Boolean'];
          if (indexNode.callee.type === AST_NODE_TYPES.Identifier &&
              typeConversionFunctions.includes(indexNode.callee.name)) {
              // Check if arguments are user-controlled
              for (const arg of indexNode.arguments) {
                  if (isUserControlledIndex(arg)) {
                      return true;
                  }
              }
          }
      }
      
      // Check MemberExpression (req.query.index)
      if (indexNode.type === AST_NODE_TYPES.MemberExpression) {
          const text = sourceCode.getText(indexNode).toLowerCase();
          const keywords = ['req.', 'request.', 'query.', 'params.', 'body.', 'input.', 'user.'];
          if (keywords.some(k => text.includes(k))) {
              return true;
          }
      }
      
      return false;
    };

    /**
     * Check if index has been validated
     */
    const isIndexValidated = (indexNode: TSESTree.Node): boolean => {
      // If it's a literal number, check if it's non-negative
      if (indexNode.type === AST_NODE_TYPES.Literal && typeof indexNode.value === 'number') {
        return indexNode.value >= 0;
      }

      // If it's an identifier, check if it comes from a bounds check function
      if (indexNode.type === AST_NODE_TYPES.Identifier) {
        let current: TSESTree.Node | undefined = indexNode;

        // Walk up the AST to find where this variable was assigned
        while (current) {
          // Check if we're in a variable declaration
          if (current.type === AST_NODE_TYPES.VariableDeclarator &&
              current.id.type === AST_NODE_TYPES.Identifier &&
              current.id.name === indexNode.name &&
              current.init) {

            const init = current.init;

            // Check if assigned from a bounds check function
            if (init.type === AST_NODE_TYPES.CallExpression &&
                init.callee.type === AST_NODE_TYPES.Identifier &&
                boundsCheckFunctions.includes(init.callee.name)) {
              return true;
            }

            // Check if assigned from Math.min/max with buffer.length
            if (init.type === AST_NODE_TYPES.CallExpression &&
                init.callee.type === AST_NODE_TYPES.MemberExpression &&
                init.callee.object.type === AST_NODE_TYPES.Identifier &&
                init.callee.object.name === 'Math' &&
                init.callee.property.type === AST_NODE_TYPES.Identifier &&
                (init.callee.property.name === 'min' || init.callee.property.name === 'max')) {
              return true;
            }

            break;
          }

          // Check if it's a parameter in a function - assume validated if it's a function param
          if (current.type === AST_NODE_TYPES.FunctionDeclaration ||
              current.type === AST_NODE_TYPES.FunctionExpression ||
              current.type === AST_NODE_TYPES.ArrowFunctionExpression) {
            const params = current.params;
            for (const param of params) {
              if (param.type === AST_NODE_TYPES.Identifier && param.name === indexNode.name) {
                return true; // Function parameters are assumed validated
              }
            }
          }

          current = current.parent as TSESTree.Node;
        }
      }

      // Check if it's a call to a bounds check function directly
      if (indexNode.type === AST_NODE_TYPES.CallExpression &&
          indexNode.callee.type === AST_NODE_TYPES.Identifier &&
          boundsCheckFunctions.includes(indexNode.callee.name)) {
        return true;
      }

      return false;
    };

    /**
     * Check if there's a bounds check in the current scope
     */
    const hasBoundsCheck = (bufferName: string, indexNode: TSESTree.Node): boolean => {
      // Look for bounds checks in the current function scope
      let current: TSESTree.Node | undefined = indexNode;

      while (current) {
        // Check if we're in a function
        if (current.type === AST_NODE_TYPES.FunctionDeclaration ||
            current.type === AST_NODE_TYPES.FunctionExpression ||
            current.type === AST_NODE_TYPES.ArrowFunctionExpression) {
          break;
        }

        // Look for if statements that check bounds
        if (current.type === AST_NODE_TYPES.IfStatement) {
          const condition = current.test;
          const conditionText = sourceCode.getText(condition).toLowerCase();

          // Check for bounds checking patterns
          if (conditionText.includes(`${bufferName}.length`) &&
              (conditionText.includes('<') || conditionText.includes('<=') ||
               conditionText.includes('>') || conditionText.includes('>=') ||
               conditionText.includes('&&') || conditionText.includes('||'))) {
            return true;
          }
        }

        // Look for variable declarations that might be bounds checks
        if (current.type === AST_NODE_TYPES.VariableDeclaration) {
          for (const declarator of current.declarations) {
            if (declarator.init) {
              const initText = sourceCode.getText(declarator.init).toLowerCase();
              if (initText.includes(`${bufferName}.length`) &&
                  (initText.includes('math.min') || initText.includes('math.max') ||
                   initText.includes('mathmin') || initText.includes('mathmax'))) {
                return true;
              }
            }
          }
        }

        // Look for return statements or early returns that might indicate bounds checking
        if (current.type === AST_NODE_TYPES.ReturnStatement && current.argument) {
          const returnText = sourceCode.getText(current.argument).toLowerCase();
          if (returnText.includes(`${bufferName}.length`)) {
            return true;
          }
        }

        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Check if index could be negative
     */
    const couldBeNegative = (indexNode: TSESTree.Node): boolean => {
      // Check for literal negative numbers
      // Check for literal negative numbers
      if (indexNode.type === AST_NODE_TYPES.Literal && typeof indexNode.value === 'number') {
        return indexNode.value < 0;
      }

      // Check for unary minus expressions like -1, -10, etc.
      if (indexNode.type === AST_NODE_TYPES.UnaryExpression &&
          indexNode.operator === '-' &&
          indexNode.argument.type === AST_NODE_TYPES.Literal &&
          typeof indexNode.argument.value === 'number') {
        return true; // -N is always negative for positive N
      }

      // Check for binary expressions that could be negative like userInput - 10
      if (indexNode.type === AST_NODE_TYPES.BinaryExpression && indexNode.operator === '-') {
        // userInput - 10 could be negative, we can't be sure statically
        return true; // Conservative: assume it could be negative
      }

      // For variables, we can't be sure, but we can check for obvious patterns
      if (indexNode.type === AST_NODE_TYPES.Identifier) {
        // Check if this variable is assigned a negative value somewhere
        // This is a simplified check - in practice we'd need more sophisticated analysis
        let current: TSESTree.Node | undefined = indexNode;

        while (current) {
          if (current.type === AST_NODE_TYPES.VariableDeclarator && current.init) {
            if (current.init.type === AST_NODE_TYPES.Literal &&
                typeof current.init.value === 'number' &&
                current.init.value < 0) {
              return true;
            }
            // Check for unary minus assignments
            if (current.init.type === AST_NODE_TYPES.UnaryExpression &&
                current.init.operator === '-' &&
                current.init.argument.type === AST_NODE_TYPES.Literal &&
                typeof current.init.argument.value === 'number') {
              return true;
            }
          }
          current = current.parent as TSESTree.Node;
        }
      }

      return false;
    };

    return {
      // Track buffer variable declarations
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type === AST_NODE_TYPES.Identifier && node.init) {
          const varName = node.id.name;

          // Check if assigned a buffer type
          if (node.init.type === AST_NODE_TYPES.NewExpression &&
              node.init.callee.type === AST_NODE_TYPES.Identifier &&
              bufferTypes.includes(node.init.callee.name)) {
            addBufferVar(node.id);
          }

          // Check if assigned from Buffer.from() or Buffer.alloc()
          if (node.init.type === AST_NODE_TYPES.CallExpression && 
              node.init.callee.type === AST_NODE_TYPES.MemberExpression &&
              node.init.callee.object.type === AST_NODE_TYPES.Identifier &&
              node.init.callee.object.name === 'Buffer' &&
              node.init.callee.property.type === AST_NODE_TYPES.Identifier &&
              ['from', 'alloc', 'allocUnsafe'].includes(node.init.callee.property.name)) {
            addBufferVar(node.id);
          }

          // Check if assigned a buffer method result.
          //
          // The RECEIVER has to be a buffer too. Without that check any
          // `.slice()` or `.copy()` made its result a buffer, so
          // `const args = process.argv.slice(2)` registered `args` — which is
          // how `const nextArg = args[patternIdx + 1]` came to be a buffer
          // overread in two Shopify/cli argument parsers.
          if (node.init.type === AST_NODE_TYPES.CallExpression) {
            const callee = node.init.callee;
            if (callee.type === AST_NODE_TYPES.MemberExpression &&
                callee.property.type === AST_NODE_TYPES.Identifier &&
                bufferMethods.includes(callee.property.name) &&
                callee.object.type === AST_NODE_TYPES.Identifier &&
                isBufferType(callee.object)) {
              addBufferVar(node.id);
            }
          }

          // Check variable name patterns
          if (bufferTypes.some(type => varName.toLowerCase().includes(type.toLowerCase()))) {
            addBufferVar(node.id);
          }
        }
      },

      // Check member expressions (buffer[index], buffer.method())
      MemberExpression(node: TSESTree.MemberExpression) {
        // Check for buffer[index] access
        if (node.computed && node.object.type === AST_NODE_TYPES.Identifier) {
          const bufferName = node.object.name;
          const indexNode = node.property;

          // A write is CWE-787, not CWE-126 — a different rule's site.
          if (isWriteTarget(node)) return;
          // A loop counter is already bounded by the loop condition.
          if (isLoopBounded(indexNode)) return;

          if (isBufferType(node.object)) {
            // Check for negative indices
            if (couldBeNegative(indexNode)) {
              context.report({
                node,
                messageId: 'negativeBufferIndex',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
              return;
            }

            // Check for user-controlled indices without validation
            if (isUserControlledIndex(indexNode) && !isIndexValidated(indexNode)) {
              // Check if there's a bounds check in scope
              if (!hasBoundsCheck(bufferName, indexNode)) {
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                context.report({
                  node,
                  messageId: 'userControlledBufferIndex',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                  },
                });
                return;
              }
            }

            // The third arm used to report `unsafeBufferAccess` for ANY index
            // this rule could not prove validated. That is the "can I prove it
            // safe?" question, and it made the finding a property of the
            // rule's own analysis depth rather than of the code: on the corpus
            // it produced `const nextArg = args[patternIdx + 1]` in two
            // argument parsers and every access in two minified vendor
            // bundles.
            //
            // It now requires the same evidence the arm above does — an index
            // that can be traced to input — and differs only in that a bounds
            // check somewhere in scope was found, which downgrades the report
            // rather than silencing it. `reportUnvalidatedIndices` restores
            // the sweep.
            if (
              reportUnvalidatedIndices &&
              !hasBoundsCheck(bufferName, indexNode) &&
              !isIndexValidated(indexNode)
            ) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node,
                messageId: 'unsafeBufferAccess',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for buffer method calls that need bounds checking
        if (node.property.type === 'Identifier' &&
            bufferMethods.includes(node.property.name) &&
            node.object.type === 'Identifier' &&
            isBufferType(node.object)) {

          // This is a parent of a CallExpression, we'll check it there
        }
      },

      // Check buffer method calls
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for buffer.slice() / buffer.subarray() calls.
        //
        // `subarray` is the non-deprecated spelling of `slice` on a Buffer and
        // returns a view over the SAME memory, so an unvalidated offset reads
        // exactly as far past the end. It was absent from the rule entirely,
        // which meant a codebase that had followed Node's own advice to migrate
        // off `slice` silently lost the check.
        if (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            VIEW_METHODS.has(callee.property.name) &&
            callee.object.type === 'Identifier' &&
            isBufferType(callee.object)) {

          const args = node.arguments;

          // Check slice arguments
          for (const arg of args) {
            if (isUserControlledIndex(arg) && !isIndexValidated(arg)) {
              if (safetyChecker.isSafe(node, context)) {
                continue;
              }

              context.report({
                node: arg,
                messageId: 'unsafeBufferSlice',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for buffer read/write methods.
        //
        // The view methods are excluded: the handler above already owns them,
        // and reporting both left `buf.slice(req.query.start)` with two
        // findings — one line, two message ids, one underlying fact.
        if (callee.type === AST_NODE_TYPES.MemberExpression &&
            callee.property.type === AST_NODE_TYPES.Identifier &&
            bufferMethods.includes(callee.property.name) &&
            !VIEW_METHODS.has(callee.property.name) &&
            callee.object.type === AST_NODE_TYPES.Identifier &&
            isBufferType(callee.object)) {

          const args = node.arguments;

          // Check offset/length arguments
          for (const arg of args) {
            if (isUserControlledIndex(arg) && !isIndexValidated(arg)) {
              if (safetyChecker.isSafe(node, context)) {
                continue;
              }

              context.report({
                node: arg,
                messageId: 'missingBoundsCheck',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }
      },

      // Check binary expressions that might involve buffer operations
      BinaryExpression(node: TSESTree.BinaryExpression) {
        // Look for patterns like buffer.length - something that might indicate bounds checking
        const leftText = sourceCode.getText(node.left);
        const rightText = sourceCode.getText(node.right);

        if (leftText.includes('.length') || rightText.includes('.length')) {
          // This might be a bounds check - we could analyze this further
        }
      }
    };
  },
});
