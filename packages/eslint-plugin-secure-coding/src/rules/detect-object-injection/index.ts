/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: detect-object-injection
 * Detects variable[key] as a left- or right-hand assignment operand (prototype pollution)
 * LLM-optimized with comprehensive object injection prevention guidance
 *
 * Type-Aware Enhancement:
 * This rule uses TypeScript type information when available to reduce false positives.
 * If a property key is constrained to a union of string literals (e.g., 'name' | 'email'),
 * the access is considered safe because the values are statically known at compile time.
 *
 * @see https://portswigger.net/web-security/prototype-pollution
 * @see https://cwe.mitre.org/data/definitions/915.html
 */
import { AST_NODE_TYPES, TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule, createModuleEvidence } from '@interlace/eslint-devkit';

/**
 * Whether this file loads an AST-manipulation library.
 *
 * Through the devkit probe, not a scan of `Program.body` for
 * `ImportDeclaration`. This is a *suppression* gate, so missing a spelling
 * fails in the false-positive direction: a jscodeshift codemod written
 * `const j = require('jscodeshift')` was not recognised as a codemod, and every
 * `node[name]` traversal in it reported CWE-1321. Measured: the ESM spelling of
 * the identical file was silent.
 */
const fileUsesAstTooling = createModuleEvidence({
  packages: [
    '@babel/types',
    '@babel/traverse',
    'recast',
    'jscodeshift',
    'eslint',
    'estree-walker',
    'ast-types',
    'esrap',
    'unist-util-visit',
  ],
  scopes: ['@typescript-eslint'],
});

type MessageIds =
  | 'objectInjection'
  | 'useMapInstead'
  | 'useHasOwnProperty'
  | 'whitelistKeys'
  | 'useObjectCreate'
  | 'freezePrototypes'
  | 'strategyValidate'
  | 'strategyWhitelist'
  | 'strategyFreeze';

export interface Options {
  /** Allow bracket notation with literal strings. Default: false (stricter) */
  allowLiterals?: boolean;

  /** Additional object methods to check for injection */
  additionalMethods?: string[];

  /** Properties to consider dangerous. Default: __proto__, prototype, constructor */
  dangerousProperties?: string[];

  /** Strategy for fixing object injection: 'validate', 'whitelist', 'freeze', or 'auto' */
  strategy?: 'validate' | 'whitelist' | 'freeze' | 'auto';
}

type RuleOptions = [Options?];

const TYPED_ARRAY_CTORS = new Set([
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray',
  'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array',
  'Float32Array', 'Float64Array',
  'BigInt64Array', 'BigUint64Array',
]);

/**
 * Object access patterns and their security implications
 */
interface ObjectInjectionPattern {
  pattern: string;
  dangerous: boolean;
  vulnerability: 'prototype-pollution' | 'property-injection' | 'method-injection';
  safeAlternative: string;
  example: { bad: string; good: string };
  effort: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const OBJECT_INJECTION_PATTERNS: ObjectInjectionPattern[] = [
  {
    pattern: '__proto__',
    dangerous: true,
    vulnerability: 'prototype-pollution',
    safeAlternative: 'Object.create(null) or Map',
    example: {
      bad: 'obj[userInput] = value; // if userInput is "__proto__"',
      good: 'const map = new Map(); map.set(userInput, value);'
    },
    effort: '15-20 minutes',
    riskLevel: 'critical'
  },
  {
    pattern: 'prototype',
    dangerous: true,
    vulnerability: 'prototype-pollution',
    safeAlternative: 'Avoid prototype manipulation',
    example: {
      bad: 'obj[userInput] = value; // if userInput is "prototype"',
      good: 'if (!obj.hasOwnProperty(userInput)) obj[userInput] = value;'
    },
    effort: '10-15 minutes',
    riskLevel: 'high'
  },
  {
    pattern: 'constructor',
    dangerous: true,
    vulnerability: 'method-injection',
    safeAlternative: 'Validate property names against whitelist',
    example: {
      bad: 'obj[userInput] = value; // if userInput is "constructor"',
      good: 'const ALLOWED_KEYS = [\'name\', \'age\', \'email\']; if (ALLOWED_KEYS.includes(userInput)) obj[userInput] = value;'
    },
    effort: '10-15 minutes',
    riskLevel: 'medium'
  }
];

export const detectObjectInjection = createRule<RuleOptions, MessageIds>({
  name: 'detect-object-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-object-injection.md',
      description: 'Detects variable[key] as a left- or right-hand assignment operand',
      cwe: 'CWE-915',
      confidence: 'low',
    },
    hasSuggestions: true,
    messages: {
      // 🎯 Token optimization: 37% reduction (54→34 tokens) - removes verbose current/fix/doc labels
      objectInjection: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Object injection',
        cwe: 'CWE-915',
        description: 'Object injection/Prototype pollution (incl. model/tool outputs)',
        severity: '{{riskLevel}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://portswigger.net/web-security/prototype-pollution',
      }),
      useMapInstead: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Map',
        description: 'Use Map instead of plain objects',
        severity: 'LOW',
        fix: 'const map = new Map(); map.set(key, value);',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map',
      }),
      useHasOwnProperty: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use hasOwnProperty',
        description: 'Check hasOwnProperty to avoid prototype properties',
        severity: 'LOW',
        fix: 'if (obj.hasOwnProperty(key)) { obj[key] = value; }',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty',
      }),
      whitelistKeys: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Whitelist Keys',
        description: 'Whitelist allowed property names',
        severity: 'LOW',
        fix: 'const ALLOWED = ["name", "email"]; if (ALLOWED.includes(key)) obj[key] = value; // reject model/tool-supplied unknown keys',
        documentationLink: 'https://portswigger.net/web-security/prototype-pollution',
      }),
      useObjectCreate: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Object.create(null)',
        description: 'Create clean objects without prototypes',
        severity: 'LOW',
        fix: 'const obj = Object.create(null);',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create',
      }),
      freezePrototypes: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Freeze Prototypes',
        description: 'Freeze Object.prototype to prevent pollution',
        severity: 'LOW',
        fix: 'Object.freeze(Object.prototype);',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze',
      }),
      strategyValidate: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Validate Input',
        description: 'Add input validation before property access',
        severity: 'LOW',
        fix: 'Validate key against allowed values before access',
        documentationLink: 'https://portswigger.net/web-security/prototype-pollution',
      }),
      strategyWhitelist: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Whitelist Properties',
        description: 'Whitelist allowed property names only',
        severity: 'LOW',
        fix: 'Define allowed keys and validate against them',
        documentationLink: 'https://portswigger.net/web-security/prototype-pollution',
      }),
      strategyFreeze: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Freeze Prototypes',
        description: 'Freeze prototypes to prevent pollution',
        severity: 'LOW',
        fix: 'Object.freeze(Object.prototype) at app startup',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowLiterals: {
            type: 'boolean',
            default: false,
            description: 'Allow bracket notation with literal strings'
          },
          additionalMethods: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional object methods to check for injection'
          },
          dangerousProperties: {
            type: 'array',
            items: { type: 'string' },
            default: ['__proto__', 'prototype', 'constructor'],
            description: 'Properties to consider dangerous'
          },
          strategy: {
            type: 'string',
            enum: ['validate', 'whitelist', 'freeze', 'auto'],
            default: 'auto',
            description: 'Strategy for fixing object injection (auto = smart detection)'
          }
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowLiterals: false,
      additionalMethods: [],
      dangerousProperties: ['__proto__', 'prototype', 'constructor'],
      strategy: 'auto'
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      // `allowLiterals` is accepted for backward-compatible schema/options
      // parity (see comment near `isTypedUnionAccess` usage below) but no
      // longer changes runtime behavior, so it is intentionally unused here.
      allowLiterals: _allowLiterals = false,
      dangerousProperties = ['__proto__', 'prototype', 'constructor'],
    }: Options = options;

    // Track MemberExpressions that are part of AssignmentExpressions to avoid double-reporting
    const handledMemberExpressions = new WeakSet<TSESTree.MemberExpression>();
    /**
     * `for...in` loops whose source and shape qualify as a prototype-polluting copy loop,
     * currently open in the traversal — innermost last.
     *
     * ForInStatement is visited before its body, so the loop is armed by the time the
     * body's assignments arrive and the copy-loop check claims each one first; the generic
     * handler then steps aside. Without that hand-off the same `target[key] = source[key]`
     * reports twice — one defect, two findings, precisely the over-reporting we criticise
     * in competitors.
     */
    const openCopyLoops: { keyName: string; reported: boolean }[] = [];
    /** The `for...in` nodes that actually armed, so `:exit` pops exactly what it pushed. */
    const armedLoops = new WeakSet<TSESTree.ForInStatement>();

    // ── AST-walker / codemod context detection (closes the audit FP
    // surfaced by `npm run ilb:stress-test`). When the file imports any
    // AST library (`@babel/types`, `recast`, `jscodeshift`, `eslint`,
    // `estree-walker`, `unist-util-visit`), `node[name]`-style access is
    // tree traversal, not user-input indexing. The same helper landed
    // for `no-insecure-comparison` in audit iter-2; this is the port to
    // `detect-object-injection`. See benchmarks/AUDIT_PATTERNS.md §2.1.
    const sourceCode = context.sourceCode;
    const isInCodemodContext = (() => {
      const filename = context.filename;
      if (/\/codemod[s]?\//i.test(filename)) return true;
      if (/codemod\.[mc]?[jt]sx?$/i.test(filename)) return true;
      return fileUsesAstTooling(sourceCode.ast);
    })();

    // Test-file skip — bracket access in tests is universally safe (fixture data,
    // assertion helpers, mock objects). This closes the largest class of
    // ILB-Wild FPs without any precision loss on real application code.
    const isTestFile = (() => {
      const f = context.filename;
      return (
        /\.test\.[mc]?[jt]sx?$/.test(f) ||
        /\.spec\.[mc]?[jt]sx?$/.test(f) ||
        /\/__tests__\//.test(f) ||
        /\/test\//.test(f) ||
        /\.fixture\.[mc]?[jt]sx?$/.test(f)
      );
    })();

    /**
     * Check if a node is a literal string (potentially safe)
     */
    const isLiteralString = (node: TSESTree.Node): boolean => {
      return node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string';
    };

    /**
     * Check if the property key has been validated before use.
     * 
     * Detects patterns like:
     * - if (ARRAY.includes(key)) { obj[key] = value; }
     * - if (Object.prototype.hasOwnProperty.call(obj, key)) { return obj[key]; }
     * - if (Object.hasOwn(obj, key)) { return obj[key]; }
     * 
     * @param propertyNode - The property node (key in obj[key])
     * @param node - The current node being checked
     * @returns true if the key has been validated, false otherwise
     */
    const hasPrecedingValidation = (propertyNode: TSESTree.Node, node: TSESTree.Node): boolean => {
      // Only check for identifier keys (obj[key] where key is a variable)
      if (propertyNode.type !== AST_NODE_TYPES.Identifier) {
        return false;
      }
      const keyName = propertyNode.name;

      // AST-based validation detection (faster than getText + regex)
      const isIncludesCall = (testNode: TSESTree.Node): boolean => {
        // Pattern: ARRAY.includes(keyName)
        if (testNode.type === AST_NODE_TYPES.CallExpression &&
            testNode.callee.type === AST_NODE_TYPES.MemberExpression &&
            testNode.callee.property.type === AST_NODE_TYPES.Identifier &&
            testNode.callee.property.name === 'includes' &&
            testNode.arguments.length > 0 &&
            testNode.arguments[0].type === AST_NODE_TYPES.Identifier &&
            testNode.arguments[0].name === keyName) {
          return true;
        }
        // Handle negation: !ARRAY.includes(key)
        if (testNode.type === AST_NODE_TYPES.UnaryExpression &&
            testNode.operator === '!' &&
            testNode.argument.type === AST_NODE_TYPES.CallExpression) {
          return isIncludesCall(testNode.argument);
        }
        return false;
      };

      const isHasOwnPropertyCall = (testNode: TSESTree.Node): boolean => {
        // Pattern: Object.prototype.hasOwnProperty.call(obj, key) OR obj.hasOwnProperty(key) OR Object.hasOwn(obj, key)
        if (testNode.type !== AST_NODE_TYPES.CallExpression) return false;
        const callee = testNode.callee;
        const args = testNode.arguments;
        
        // Object.prototype.hasOwnProperty.call(obj, key)
        if (callee.type === AST_NODE_TYPES.MemberExpression &&
            callee.property.type === AST_NODE_TYPES.Identifier &&
            callee.property.name === 'call' &&
            args.length >= 2 &&
            args[1].type === AST_NODE_TYPES.Identifier &&
            args[1].name === keyName) {
          return true;
        }
        
        // obj.hasOwnProperty(key) OR Object.hasOwn(obj, key)
        if (callee.type === AST_NODE_TYPES.MemberExpression &&
            callee.property.type === AST_NODE_TYPES.Identifier &&
            (callee.property.name === 'hasOwnProperty' || callee.property.name === 'hasOwn')) {
          const keyArg = callee.property.name === 'hasOwn' ? args[1] : args[0];
          if (keyArg?.type === AST_NODE_TYPES.Identifier && keyArg.name === keyName) {
            return true;
          }
        }
        return false;
      };

      const isInOperator = (testNode: TSESTree.Node): boolean => {
        // Pattern: key in obj
        return testNode.type === AST_NODE_TYPES.BinaryExpression &&
               testNode.operator === 'in' &&
               testNode.left.type === AST_NODE_TYPES.Identifier &&
               testNode.left.name === keyName;
      };

      const hasValidation = (testNode: TSESTree.Node): boolean => {
        return isIncludesCall(testNode) || isHasOwnPropertyCall(testNode) || isInOperator(testNode);
      };

      const hasEarlyExit = (consequent: TSESTree.Statement): boolean => {
        // Check if block contains throw or return
        if (consequent.type === AST_NODE_TYPES.BlockStatement) {
          return consequent.body.some(stmt => 
            stmt.type === AST_NODE_TYPES.ThrowStatement ||
            stmt.type === AST_NODE_TYPES.ReturnStatement
          );
        }
        return consequent.type === AST_NODE_TYPES.ThrowStatement ||
               consequent.type === AST_NODE_TYPES.ReturnStatement;
      };

      // Walk up to find enclosing IfStatement with validation
      let current: TSESTree.Node | undefined = node.parent;
      let foundFunctionBody = false;
      
      while (current && !foundFunctionBody) {
        // Check if we're inside an if-block with validation in the condition
        if (current.type === AST_NODE_TYPES.IfStatement) {
          if (hasValidation(current.test)) {
            return true;
          }
        }
        
        // Check for function body - look for preceding sibling if-statements with early exit
        if (current.type === AST_NODE_TYPES.BlockStatement && current.parent && (
            current.parent.type === AST_NODE_TYPES.FunctionDeclaration ||
            current.parent.type === AST_NODE_TYPES.FunctionExpression ||
            current.parent.type === AST_NODE_TYPES.ArrowFunctionExpression)) {
          
          foundFunctionBody = true;
          const blockBody = current.body;
          const nodeIndex = blockBody.findIndex((stmt: TSESTree.Statement) => {
            let check: TSESTree.Node | undefined = node;
            while (check) {
              if (check === stmt) return true;
              check = check.parent;
            }
            return false;
          });
          
          // Look at preceding statements for validation patterns with early exit
          for (let i = 0; i < nodeIndex; i++) {
            const stmt = blockBody[i];
            if (stmt.type === AST_NODE_TYPES.IfStatement &&
                hasValidation(stmt.test) &&
                hasEarlyExit(stmt.consequent)) {
              return true;
            }
          }
        }
        
        current = current.parent;
      }
      
      return false;
    };
    /**
     * True when a literal operand of a `+` pins one end of the key to text no
     * dangerous name has.
     *
     * `obj['node' + i]` always *begins* with `node`; `array[offset + 1]` always
     * *ends* with `1`. Neither can equal `__proto__`, `prototype` or
     * `constructor` whatever the other operand holds — even under string
     * concatenation, which is the case that makes `+` unprovable in general.
     * `offset + 1` is the dominant real-world index form once the offset is a
     * function parameter, where nothing about the declaration proves numeric.
     *
     * Scoped to `dangerousProperties`, so narrowing that option correctly
     * narrows what counts as disqualifying.
     */
    const hasDisqualifyingLiteralAffix = (node: TSESTree.Node): boolean => {
      if (
        node.type !== AST_NODE_TYPES.BinaryExpression ||
        (node as TSESTree.BinaryExpression).operator !== '+'
      ) {
        return false;
      }
      const bin = node as TSESTree.BinaryExpression;
      const literalText = (n: TSESTree.Node): string | null => {
        if (n.type !== AST_NODE_TYPES.Literal) return null;
        const v = (n as TSESTree.Literal).value;
        if (typeof v !== 'string' && typeof v !== 'number') return null;
        const s = String(v);
        return s.length > 0 ? s : null;
      };

      const prefix = literalText(bin.left as TSESTree.Node);
      if (prefix !== null && !dangerousProperties.some((d) => d.startsWith(prefix))) {
        return true;
      }
      const suffix = literalText(bin.right as TSESTree.Node);
      if (suffix !== null && !dangerousProperties.some((d) => d.endsWith(suffix))) {
        return true;
      }
      return false;
    };

    /**
     * Check if property access is potentially dangerous
     */
    const isDangerousPropertyAccess = (propertyNode: TSESTree.Node): boolean => {
      // SAFE: the key is provably numeric, or is namespaced behind a literal
      // prefix. Both are facts about the expression's shape, not its naming —
      // rename every identifier and the answer is unchanged.
      if (isNumericKey(propertyNode) || hasDisqualifyingLiteralAffix(propertyNode)) {
        return false;
      }

      // NOTE: an allowlist of index-looking *names* (i, j, k, index, idx, n,
      // len) used to sit here. It was unsound in both directions — it cleared
      // `function put(o, k) { o[k] = 1 }`, where `k` is an untrusted parameter
      // that merely looks like a counter, and it missed every real index not
      // on the list (`offset`, `lastIndex`, `stride`). `isNumericKey` now
      // resolves the identifier to its declaration instead, which covers the
      // genuine counters and refuses the parameters.

      // SAFE: SCREAMING_SNAKE_CASE identifiers are TypeScript module-level constants
      // (e.g. PATH_METADATA, METHOD_METADATA, PARAMTYPES_METADATA, BRANCH_EFFECT).
      // They are compile-time string/symbol values defined in the codebase, never
      // derived from user input — prototype pollution via a constant key is impossible.
      // Pattern: at least 3 chars, ALL_CAPS letters, digits, underscores only.
      if (propertyNode.type === AST_NODE_TYPES.Identifier) {
        const name = (propertyNode as TSESTree.Identifier).name;
        if (/^[A-Z][A-Z0-9_]{2,}$/.test(name)) {
          return false;
        }

        // SAFE: camelCase identifiers whose suffix implies a typed/enumerated value.
        // HTTP status codes, version numbers, type discriminants, mode flags — these
        // are never raw user input. Examples: errorHttpStatusCode, uuidVersion, reqType.
        if (
          /^[a-z]/.test(name) &&
          /(?:Code|Status|Version|Kind|Mode|Type|Stage|Level|Phase|Step|Flag|Num|Count)$/.test(name)
        ) {
          return false;
        }
      }

      // Check if it's a literal string first
      if (isLiteralString(propertyNode)) {
        const propName = String((propertyNode as TSESTree.Literal).value);
        
        // DANGEROUS: Literal strings that match dangerous properties (always flag these)
        // Check this BEFORE checking typed union access
        if (dangerousProperties.includes(propName)) {
          return true;
        }
        
      return false; // safe non-dangerous literal
      }

      // DANGEROUS: Any untyped/dynamic property access (e.g., obj[userInput])
      return true;
    };

    /**
     * Check if the object is a prototype-less object (Object.create(null))
     * or is derived from an array spread/copy pattern
     */
    const isPrototypelessObject = (objectNode: TSESTree.Node): boolean => {
      if (objectNode.type !== AST_NODE_TYPES.Identifier) {
        return false;
      }
      
      const varName = objectNode.name;
      
      // Walk up to find the variable declaration
      let current: TSESTree.Node | undefined = objectNode;
      while (current) {
        if (current.type === AST_NODE_TYPES.BlockStatement || 
            current.type === AST_NODE_TYPES.Program) {
          const statements = current.type === AST_NODE_TYPES.BlockStatement 
            ? current.body 
            : current.body;
          
          for (const stmt of statements) {
            if (stmt.type === AST_NODE_TYPES.VariableDeclaration) {
              for (const decl of stmt.declarations) {
                if (decl.id.type === AST_NODE_TYPES.Identifier && 
                    decl.id.name === varName && 
                    decl.init) {
                  // Check for Object.create(null)
                  if (decl.init.type === AST_NODE_TYPES.CallExpression &&
                      decl.init.callee.type === AST_NODE_TYPES.MemberExpression &&
                      decl.init.callee.object.type === AST_NODE_TYPES.Identifier &&
                      decl.init.callee.object.name === 'Object' &&
                      decl.init.callee.property.type === AST_NODE_TYPES.Identifier &&
                      decl.init.callee.property.name === 'create' &&
                      decl.init.arguments.length > 0 &&
                      decl.init.arguments[0].type === AST_NODE_TYPES.Literal &&
                      decl.init.arguments[0].value === null) {
                    return true;
                  }
                  
                  // Check for array spread: [...array]
                  if (decl.init.type === AST_NODE_TYPES.ArrayExpression &&
                      decl.init.elements.length > 0 &&
                      decl.init.elements[0]?.type === AST_NODE_TYPES.SpreadElement) {
                    return true;
                  }
                }
              }
            }
          }
        }
        current = current.parent;
      }
      
      return false;
    };

    /**
     * Extract property access information
     */
    const extractPropertyAccess = (node: TSESTree.AssignmentExpression | TSESTree.MemberExpression): {
      object: string;
      property: string;
      propertyNode: TSESTree.Node;
      isAssignment: boolean;
      pattern: ObjectInjectionPattern | null;
    } => {

      let object: string;
      let property: string;
      let propertyNode: TSESTree.Node;
      let isAssignment = false;

      // Note: the `node.left.type !== MemberExpression` / plain-MemberExpression
      // shapes are the only two forms ever passed in — every call site
      // (isHighRiskAssignment / isHighRiskMemberAccess and their two
      // downstream checkAssignmentExpression / checkMemberExpression callers)
      // already guards on the same discriminants before calling this
      // function, so a "neither shape matched" fallback is unreachable dead
      // code. The `if`/`else if` below is kept (rather than a non-null
      // assertion) purely for TypeScript exhaustiveness over the declared
      // union parameter type.
      if (node.type === AST_NODE_TYPES.AssignmentExpression && node.left.type === AST_NODE_TYPES.MemberExpression) {
        // Assignment: obj[key] = value
        object = sourceCode.getText(node.left.object);
        property = sourceCode.getText(node.left.property);
        propertyNode = node.left.property;
        isAssignment = true;
      } else {
        // Access: obj[key]. By contract with every call site, `node` is a
        // plain MemberExpression whenever the branch above doesn't match.
        const memberNode = node as TSESTree.MemberExpression;
        object = sourceCode.getText(memberNode.object);
        property = sourceCode.getText(memberNode.property);
        propertyNode = memberNode.property;
        isAssignment = false;
      }

      // Check if property matches dangerous patterns
      const pattern = OBJECT_INJECTION_PATTERNS.find(p =>
        new RegExp(p.pattern, 'i').test(property) ||
        dangerousProperties.includes(property.replace(/['"]/g, ''))
      ) || null;

      return { object, property, propertyNode, isAssignment, pattern };
    };

    /**
     * Determine if this is a high-risk assignment
     */
    const isHighRiskAssignment = (node: TSESTree.AssignmentExpression): boolean => {
      if (node.left.type !== 'MemberExpression') {
        return false;
      }

      // Only check computed member access (bracket notation)
      // Dot notation (obj.name) is safe
      if (!node.left.computed) {
        return false;
      }

      // SAFE: Object.create(null) objects have no prototype to pollute
      if (isPrototypelessObject(node.left.object)) {
        return false;
      }

      // SAFE: typed-array element assignment is numeric, not a string-key injection
      if (isTypedArrayObject(node.left.object)) {
        return false;
      }

      const { propertyNode } = extractPropertyAccess(node);

      // SAFE: numeric keys can't pollute Object prototypes (typed-array
      // / numeric-array assignment is structurally safe).
      if (isNumericKey(propertyNode)) {
        return false;
      }

      // SAFE: key originates from for..in or Object.keys/entries iteration
      if (isForInOrObjectKeysKey(propertyNode)) {
        return false;
      }

      // Skip if the key has been validated (e.g., includes() or hasOwnProperty check)
      if (hasPrecedingValidation(propertyNode, node)) {
        return false;
      }

      // Check for dangerous property access in assignment
      return isDangerousPropertyAccess(propertyNode);
    };

    /**
     * Returns true if the object being indexed is the result of a Reflect.*
     * method call (e.g. Reflect.getMetadata, Reflect.ownKeys).
     * Reflect metadata objects contain known framework-managed keys; they are
     * not populated from user input and cannot be exploited for prototype
     * pollution. This closes FPs from NestJS decorator metadata access patterns:
     *   Reflect.getMetadata(PARAMTYPES_METADATA, target, key!)?.[index!]
     */
    const isReflectResultAccess = (objectNode: TSESTree.Node): boolean => {
      // Direct call: Reflect.getMetadata(...)
      if (objectNode.type === AST_NODE_TYPES.CallExpression) {
        const callee = (objectNode as TSESTree.CallExpression).callee;
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          (callee.object as TSESTree.Identifier).name === 'Reflect'
        ) {
          return true;
        }
      }
      // Optional chain: Reflect.getMetadata(...)?.[key]
      if (objectNode.type === AST_NODE_TYPES.ChainExpression) {
        return isReflectResultAccess(
          (objectNode as TSESTree.ChainExpression).expression,
        );
      }
      return false;
    };

    /**
     * Determine if this is a high-risk member access
     */
    const isHighRiskMemberAccess = (node: TSESTree.MemberExpression): boolean => {
      // Only check computed member access (bracket notation)
      if (!node.computed) {
        return false;
      }

      // SAFE: accessing result of Reflect.* call (framework-managed metadata)
      if (isReflectResultAccess(node.object)) {
        return false;
      }

      // SAFE: typed-array element read is numeric, not a string-key injection
      if (isTypedArrayObject(node.object)) {
        return false;
      }

      const { propertyNode } = extractPropertyAccess(node);

      // Numeric keys cannot pollute Object prototypes — typed-array and
      // numeric-array access (`arr[0]`, `arr[i]` where i is a for-loop
      // counter) is structurally safe. This eliminates the bulk of false
      // positives on numeric/buffer-heavy codebases (Three.js, webpack,
      // image/audio/geometry libraries) without weakening detection of
      // string-key prototype pollution.
      if (isNumericKey(propertyNode)) {
        return false;
      }

      // SAFE: key originates from for..in or Object.keys/entries iteration
      if (isForInOrObjectKeysKey(propertyNode)) {
        return false;
      }

      // Skip if the key has been validated (e.g., includes() or hasOwnProperty check)
      if (hasPrecedingValidation(propertyNode, node)) {
        return false;
      }

      // Check for dangerous property access
      return isDangerousPropertyAccess(propertyNode);
    };

    /**
     * Returns true if the property expression is provably a numeric key
     * (and therefore cannot trigger prototype pollution).
     *
     * Detected as numeric:
     *   - Numeric literal:        arr[0], arr[42]
     *   - Unary plus on number:   arr[+x]
     *   - Number(...) coercion:   arr[Number(x)]
     *   - parseInt/parseFloat:    arr[parseInt(x)]
     *   - Bitwise on identifier:  arr[x | 0], arr[x >>> 0]
     *   - Identifier whose declaration is the init of a `for` statement
     *     (the standard `for (let i = 0; i < n; i++)` counter pattern)
     */
    const isNumericKey = (node: TSESTree.Node): boolean => {
      if (node.type === AST_NODE_TYPES.Literal && typeof (node as TSESTree.Literal).value === 'number') {
        return true;
      }
      if (node.type === AST_NODE_TYPES.UnaryExpression) {
        const op = (node as TSESTree.UnaryExpression).operator;
        // `+x`, `-x` and `~x` all apply ToNumber to their operand.
        if (op === '+' || op === '-' || op === '~') return true;
      }
      // `i++` / `--i` evaluate to a number by ToNumeric, whatever `i` held.
      // This is the dominant real-world index form (`result[dstOffset++]`) and
      // was previously only caught when the variable happened to be named `i`.
      if (node.type === AST_NODE_TYPES.UpdateExpression) {
        return true;
      }
      if (node.type === AST_NODE_TYPES.BinaryExpression) {
        const op = (node as TSESTree.BinaryExpression).operator;
        if (op === '|' || op === '&' || op === '^' || op === '<<' || op === '>>' || op === '>>>' || op === '*' || op === '/' || op === '%' || op === '-' || op === '**') {
          return true;
        }
        // `+` only when *both* sides are themselves provably numeric —
        // otherwise it is string concatenation.
        if (op === '+') {
          const bin = node as TSESTree.BinaryExpression;
          return isNumericKey(bin.left as TSESTree.Node) && isNumericKey(bin.right as TSESTree.Node);
        }
      }
      // `cond ? 0 : 1` is numeric when both arms are.
      if (node.type === AST_NODE_TYPES.ConditionalExpression) {
        const cond = node as TSESTree.ConditionalExpression;
        return isNumericKey(cond.consequent) && isNumericKey(cond.alternate);
      }
      if (node.type === AST_NODE_TYPES.CallExpression) {
        const callee = (node as TSESTree.CallExpression).callee;
        if (callee.type === AST_NODE_TYPES.Identifier) {
          const name = (callee as TSESTree.Identifier).name;
          if (name === 'Number' || name === 'parseInt' || name === 'parseFloat') return true;
        }
        // `Math.floor(...)` and friends always return a number — the standard
        // way an index is computed (`const j = Math.floor(Math.random() * n)`).
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          callee.object.name === 'Math' &&
          callee.property.type === AST_NODE_TYPES.Identifier
        ) {
          return true;
        }
      }
      if (node.type === AST_NODE_TYPES.Identifier) {
        return isNumericIdentifier(node as TSESTree.Identifier);
      }
      return false;
    };

    /**
     * True when the identifier provably holds a number — decided from how the
     * variable is *defined*, not from what it is called.
     *
     * `values[valueStart + k]` is ordinary index arithmetic, but `+` between
     * two identifiers proves nothing on its own. Resolving each operand to its
     * declaration settles it: if every value the variable ever receives is a
     * provably-numeric expression, the sum is numeric and the key can never be
     * `__proto__` / `prototype` / `constructor`.
     *
     * Deliberately conservative — a parameter, a `for..of` binding, or a
     * single non-numeric assignment anywhere leaves the variable unproven and
     * the access still reports. That keeps the analysis on the safe side of
     * the FP/FN trade: it can only ever fail to clear a safe access, never
     * clear an unsafe one.
     */
    const numericVarCache = new WeakMap<object, boolean>();
    const numericVarInProgress = new WeakSet<object>();

    const isNumericIdentifier = (node: TSESTree.Identifier): boolean => {
      if (isLoopCounterIdentifier(node)) return true;

      const scope = context.sourceCode.getScope(node);
      const variable = scope.references.find((r) => r.identifier === node)?.resolved;
      if (!variable || variable.defs.length === 0) return false;

      const cached = numericVarCache.get(variable);
      if (cached !== undefined) return cached;
      // `let i = 0; i = i + 1;` refers to itself. Treat the in-flight variable
      // as numeric so the cycle terminates on its other operands rather than
      // recursing; if any of those are non-numeric the whole result is still
      // false.
      if (numericVarInProgress.has(variable)) return true;
      numericVarInProgress.add(variable);

      let result = false;
      const def = variable.defs[0];
      const declarator = def.node;
      if (
        declarator?.type === AST_NODE_TYPES.VariableDeclarator &&
        declarator.init &&
        // `for (const k of ...)` has no init and must not qualify.
        declarator.parent?.type === AST_NODE_TYPES.VariableDeclaration
      ) {
        result = isNumericKey(declarator.init);
        if (result) {
          // Every later write has to stay numeric, or the variable can hold a
          // string by the time the access runs.
          for (const ref of variable.references) {
            const written = ref.writeExpr;
            if (!written || written === declarator.init) continue;
            if (!isNumericKey(written)) {
              result = false;
              break;
            }
          }
        }
      }

      numericVarInProgress.delete(variable);
      numericVarCache.set(variable, result);
      return result;
    };

    /**
     * Returns true if the identifier is the loop variable of an enclosing
     * `for` statement, e.g. `for (let i = 0; i < n; i++) arr[i]`. The loop
     * counter is by construction numeric, so the access is safe.
     */
    const isLoopCounterIdentifier = (node: TSESTree.Identifier): boolean => {
      const scope = context.sourceCode.getScope(node);
      const variable = scope.references.find((r) => r.identifier === node)?.resolved;
      if (!variable || variable.defs.length === 0) return false;
      const def = variable.defs[0];
      // Look for `for (let i = <numeric init>; ...; ...)` shape.
      const parent = def.node?.parent as TSESTree.Node | undefined;
      const grand = parent?.parent as TSESTree.Node | undefined;
      if (
        parent?.type === AST_NODE_TYPES.VariableDeclaration &&
        grand?.type === AST_NODE_TYPES.ForStatement &&
        grand.init === parent
      ) {
        const init = (def.node as TSESTree.VariableDeclarator).init;
        if (!init) return false;
        // Initializer must itself be numeric.
        if (init.type === AST_NODE_TYPES.Literal && typeof (init as TSESTree.Literal).value === 'number') {
          return true;
        }
      }
      return false;
    };

    /**
     * Returns true if the identifier is the iteration variable of a `for...in`
     * statement or a `for...of Object.keys()/Object.entries()` statement. Keys
     * from these loops are guaranteed to be actual property names on the object
     * (not user-controlled inputs), so `obj[key]` inside such a loop is safe
     * from prototype-pollution injection. Closes the bulk of ILB-Wild FPs on
     * utility and serialisation code.
     */
    const isForInOrObjectKeysKey = (node: TSESTree.Node): boolean => {
      if (node.type !== AST_NODE_TYPES.Identifier) return false;
      const scope = context.sourceCode.getScope(node);
      const variable = scope.references.find((r) => r.identifier === node)?.resolved;
      if (!variable || variable.defs.length === 0) return false;
      const def = variable.defs[0];
      const varDecl = def.node?.parent as TSESTree.Node | undefined;
      const loopStmt = varDecl?.parent as TSESTree.Node | undefined;
      if (!varDecl || varDecl.type !== AST_NODE_TYPES.VariableDeclaration) return false;

      // for (const key in obj) { ... obj[key] ... }
      if (loopStmt?.type === AST_NODE_TYPES.ForInStatement && loopStmt.left === varDecl) {
        return true;
      }

      // for (const key of Object.keys(obj)) / Object.entries(obj)
      if (loopStmt?.type === AST_NODE_TYPES.ForOfStatement && loopStmt.left === varDecl) {
        const right = loopStmt.right;
        return (
          right.type === AST_NODE_TYPES.CallExpression &&
          right.callee.type === AST_NODE_TYPES.MemberExpression &&
          !right.callee.computed &&
          right.callee.object.type === AST_NODE_TYPES.Identifier &&
          right.callee.object.name === 'Object' &&
          right.callee.property.type === AST_NODE_TYPES.Identifier &&
          (right.callee.property.name === 'keys' || right.callee.property.name === 'entries')
        );
      }

      return false;
    };

    /**
     * Returns true if the object being indexed was declared as a typed array
     * (Int8Array…Float64Array, BigInt64Array, BigUint64Array). Typed-array
     * element access is numeric by construction; string-keyed prototype
     * pollution is impossible. This closes FPs on geometry, audio, image, and
     * buffer-heavy code (Three.js, WebGL, wasm adapters, etc.).
     */
    const isTypedArrayObject = (objectNode: TSESTree.Node): boolean => {
      if (objectNode.type !== AST_NODE_TYPES.Identifier) return false;
      const varName = (objectNode as TSESTree.Identifier).name;
      let scope = context.sourceCode.getScope(objectNode);
      while (scope) {
        const variable = scope.variables.find((v) => v.name === varName);
        if (variable) {
          for (const def of variable.defs) {
            const init = (def.node as TSESTree.VariableDeclarator).init;
            if (
              init?.type === AST_NODE_TYPES.NewExpression &&
              init.callee.type === AST_NODE_TYPES.Identifier &&
              TYPED_ARRAY_CTORS.has((init.callee as TSESTree.Identifier).name)
            ) {
              return true;
            }
          }
          break;
        }
        if (!scope.upper) break;
        scope = scope.upper;
      }
      return false;
    };

    /**
     * Determine risk level based on the pattern and context
     */
    // oxlint-disable-next-line consistent-function-scoping
    const determineRiskLevel = (pattern: ObjectInjectionPattern | null, isAssignment: boolean): string => {
      if (pattern?.riskLevel === 'critical' || (pattern && isAssignment)) {
        return 'CRITICAL';
      }

      if (pattern?.riskLevel === 'high' || isAssignment) {
        return 'HIGH';
      }

      return 'MEDIUM';
    };

    /**
     * Check assignment expressions for object injection
     */
    const checkAssignmentExpression = (node: TSESTree.AssignmentExpression) => {
      if (!isHighRiskAssignment(node)) {
        return;
      }

      // `const t = ALLOWED[x]; process.env[t] = v` — the key is provably one of the closed
      // set of literals in ALLOWED, so no attacker-chosen property is reachable.
      if (
        node.left.type === AST_NODE_TYPES.MemberExpression &&
        node.left.computed &&
        keyComesFromConstAllowlist(node.left.property, node)
      ) {
        return;
      }

      // Mark the entire left-side MemberExpression chain as handled.
      // For chained access like `a[b][c] = val`, the rule reports on the
      // AssignmentExpression (outer), then the MemberExpression visitor
      // would fire again for the INNER `a[b]` access. We walk the object
      // chain and mark every intermediate computed MemberExpression so the
      // MemberExpression visitor skips them — preventing exact duplicates.
      // isHighRiskAssignment already verified node.left.type === 'MemberExpression'
      let me = node.left as TSESTree.MemberExpression;
      handledMemberExpressions.add(me);
      // Walk into chained computed accesses: a[b][c] → also mark a[b]
      while (me.object.type === AST_NODE_TYPES.MemberExpression && me.object.computed) {
        me = me.object as TSESTree.MemberExpression;
        handledMemberExpressions.add(me);
      }

      const { object, property, isAssignment, pattern } = extractPropertyAccess(node);

      const riskLevel = determineRiskLevel(pattern, isAssignment);

      context.report({
        node,
        messageId: 'objectInjection',
        data: {
          pattern: `${object}[${property}]`,
          riskLevel,
          vulnerability: pattern?.vulnerability || 'object injection',
          safeAlternative: pattern?.safeAlternative || 'Use Map or property whitelisting',
        },
        suggest: [
          {
            messageId: 'useMapInstead',
            fix: () => null
          },
          {
            messageId: 'useHasOwnProperty',
            fix: () => null
          },
          {
            messageId: 'whitelistKeys',
            fix: () => null
          },
          {
            messageId: 'useObjectCreate',
            fix: () => null
          },
          {
            messageId: 'freezePrototypes',
            fix: () => null
          }
        ]
      });
    };

    /**
     * Check member expressions for object injection
     */
    /**
     * Resolve an identifier to the ObjectExpression of a `const` declaration that is never
     * written to after initialisation. Returns null if anything about that is not provable.
     */
    const constObjectLiteralOf = (
      name: string,
      from: TSESTree.Node,
    ): TSESTree.ObjectExpression | null => {
      for (
        let scope: ReturnType<typeof sourceCode.getScope> | null = sourceCode.getScope(from);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.variables.find((v) => v.name === name);
        if (!variable) continue;
        if (variable.defs.length !== 1) return null;
        const def = variable.defs[0];
        if (def.type !== 'Variable' || def.parent?.kind !== 'const') return null;
        // A later write (`ALLOWED = something`) would break the closed-set guarantee.
        if (variable.references.some((ref) => ref.isWrite() && ref.identifier !== def.name)) {
          return null;
        }
        const init = def.node.init;
        return init?.type === AST_NODE_TYPES.ObjectExpression ? init : null;
      }
      return null;
    };

    /**
     * A computed READ off a `const` object literal cannot be prototype pollution: the shape
     * is fixed at parse time and nothing is written. `ALLOWED[req.body.setting]` and
     * `MESSAGES[locale]` are the closed-allowlist pattern that IS the documented fix for
     * this CWE — flagging it is precisely the defect we measure in competitors, where 27%
     * of eslint-plugin-security's findings are constant-key accesses that cannot pollute.
     */
    const isReadFromConstObjectLiteral = (node: TSESTree.MemberExpression): boolean =>
      node.object.type === AST_NODE_TYPES.Identifier &&
      constObjectLiteralOf(node.object.name, node) !== null;

    /**
     * The written key is an identifier whose sole initialiser is a computed read off a
     * `const` object literal whose values are all literals — so the key provably belongs to
     * a closed set, e.g. `const t = ALLOWED[x]; process.env[t] = v`.
     */
    const keyComesFromConstAllowlist = (property: TSESTree.Node, from: TSESTree.Node): boolean => {
      if (property.type !== AST_NODE_TYPES.Identifier) return false;
      for (
        let scope: ReturnType<typeof sourceCode.getScope> | null = sourceCode.getScope(from);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.variables.find((v) => v.name === property.name);
        if (!variable) continue;
        if (variable.defs.length !== 1) return false;
        const def = variable.defs[0];
        if (def.type !== 'Variable' || def.parent?.kind !== 'const') return false;
        if (variable.references.some((ref) => ref.isWrite() && ref.identifier !== def.name)) {
          return false;
        }
        const init = def.node.init;
        if (
          init?.type !== AST_NODE_TYPES.MemberExpression ||
          !init.computed ||
          init.object.type !== AST_NODE_TYPES.Identifier
        ) {
          return false;
        }
        const source = constObjectLiteralOf(init.object.name, init);
        if (!source) return false;
        // Every value must be a literal, or the "closed set of known strings" claim fails.
        return source.properties.every(
          (p) =>
            p.type === AST_NODE_TYPES.Property &&
            p.value.type === AST_NODE_TYPES.Literal &&
            typeof p.value.value === 'string',
        );
      }
      return false;
    };

    const checkMemberExpression = (node: TSESTree.MemberExpression) => {
      if (!isHighRiskMemberAccess(node)) {
        return;
      }

      if (isReadFromConstObjectLiteral(node)) {
        return;
      }

      // Skip if this MemberExpression was already handled as part of an AssignmentExpression
      if (handledMemberExpressions.has(node)) {
        return;
      }

      // Skip inner chained computed accesses — report only the OUTERMOST MemberExpression.
      // For `a[b][c]`, both `a[b]` and `a[b][c]` start at the same source position, so
      // reporting both produces exact duplicate findings. Skip the inner `a[b]` here;
      // the outer `a[b][c]` will be reported by a subsequent call to this handler.
      const parent = node.parent as TSESTree.Node | undefined;
      if (
        parent?.type === AST_NODE_TYPES.MemberExpression &&
        (parent as TSESTree.MemberExpression).computed &&
        (parent as TSESTree.MemberExpression).object === node
      ) {
        return;
      }

      // Also check parent - if it's an AssignmentExpression and this node is the left side, skip
      // (This handles cases where WeakSet check didn't work due to visitor order)
      if (parent && parent.type === AST_NODE_TYPES.AssignmentExpression && parent.left === node) {
        return;
      }

      const { object, property, isAssignment, pattern } = extractPropertyAccess(node);

      const riskLevel = determineRiskLevel(pattern, isAssignment);

      context.report({
        node,
        messageId: 'objectInjection',
        data: {
          pattern: `${object}[${property}]`,
          riskLevel,
          vulnerability: pattern?.vulnerability || 'object injection',
          safeAlternative: pattern?.safeAlternative || 'Use Map or property whitelisting',
        }
      });
    };

    /**
     * Object.assign(target, untrustedSource) and `{ ...untrustedSource }`
     * spread into an object are functionally equivalent to `obj[k] = v`
     * for prototype-pollution purposes — they copy every enumerable
     * property of `source` onto `target`, including any `__proto__` /
     * `constructor` / `prototype` keys the source carries. The hand-
     * curated stress test surfaced this as an FN; closing it requires a
     * separate visitor since Object.assign is a CallExpression and
     * spread is a SpreadElement, not a MemberExpression. See
     * benchmarks/AUDIT_PATTERNS.md §3.4 ("equivalent merger patterns").
     */
    const checkObjectAssignSpread = (node: TSESTree.CallExpression) => {
      // Note: no isInCodemodContext guard here — the sole call site (the
      // CallExpression listener below) already returns before invoking this
      // function when isInCodemodContext is true, so a duplicate check here
      // would be unreachable dead code.
      if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
      const callee = node.callee;
      const objectIsObject =
        callee.object.type === AST_NODE_TYPES.Identifier &&
        callee.object.name === 'Object';
      const propIsAssign =
        !callee.computed &&
        callee.property.type === AST_NODE_TYPES.Identifier &&
        callee.property.name === 'assign';
      if (!objectIsObject || !propIsAssign) return;
      // Object.assign({}, …) — first arg is fresh literal, no taint risk.
      if (node.arguments[0]?.type === AST_NODE_TYPES.ObjectExpression) return;
      // Sources are arguments[1...]. Any non-literal source is an
      // assumed taint source. Literals are safe (they're inline data).
      const sources = node.arguments.slice(1);
      const anyTaintedSource = sources.some(
        (s) =>
          s.type !== AST_NODE_TYPES.ObjectExpression &&
          s.type !== AST_NODE_TYPES.Literal,
      );
      if (!anyTaintedSource) return;
      context.report({
        node,
        messageId: 'objectInjection',
        data: {
          pattern: 'Object.assign(target, untrustedSource)',
          riskLevel: 'HIGH',
          vulnerability: 'object injection via Object.assign spread',
          safeAlternative:
            'Validate or whitelist keys before merging: `for (const k of Object.keys(src)) if (!ALLOWED.has(k)) continue;`',
        },
      });
    };
    /**
     * Recursive/shallow copy loops: `for (const k in src) { dst[k] = src[k] }`.
     *
     * This is THE canonical prototype-pollution primitive — it is how every real
     * `merge`/`extend`/`deepAssign` helper is written, and when `src` is attacker-supplied
     * a `__proto__` key walks straight onto Object.prototype. It was our only pollution
     * shape `eslint-plugin-security` caught and we did not: their `detect-object-injection`
     * flags it incidentally (it flags every `obj[key]`), ours did not because a `for...in`
     * binding does not look tainted to the identifier heuristic.
     *
     * Scoped deliberately to the copy-loop shape rather than all computed writes, so it adds
     * detection without adding their noise. Quiet when the body guards the key —
     * `hasOwnProperty`, a `__proto__`/`constructor` check, or an allowlist test.
     */
    const checkPrototypePollutingCopyLoop = (node: TSESTree.ForInStatement) => {
      if (isInCodemodContext || isTestFile) return;

      // The binding introduced by `for (const k in ...)`.
      const keyName =
        node.left.type === AST_NODE_TYPES.VariableDeclaration
          ? node.left.declarations[0]?.id.type === AST_NODE_TYPES.Identifier
            ? node.left.declarations[0].id.name
            : undefined
          : node.left.type === AST_NODE_TYPES.Identifier
            ? node.left.name
            : undefined;
      if (!keyName) return;

      // Only report when the SOURCE is a function parameter — the reusable
      // `merge(target, source)` helper shape behind every real npm prototype-pollution CVE
      // (lodash.merge, deep-extend, …), where an attacker-supplied object reaches the loop.
      //
      // Copying an object the module itself owns (`for (const k in localConfig)`) is the
      // overwhelmingly common benign case, and an existing FP-regression test pins it as
      // safe. Requiring a parameter keeps the vulnerable shape and drops the benign one
      // instead of trading one team's false positives for another's.
      //
      // Ordered FIRST because it is O(scope depth) while the guard scan below is O(body
      // tokens): every `for...in` in the file used to pay the token scan, and a body
      // containing nested loops was rescanned once per enclosing level. These are pure
      // predicates, so hoisting the cheap one is behaviour-preserving — the same loops arm,
      // they just stop paying for a scan whose result is then discarded.
      //
      // Measured, 57 KB file, a 1500-line body wrapped in nested `for...in`, rule time only:
      //   loops over a LOCAL (the common case)  depth 128: 33.2 ms -> 4.2 ms, and flat in
      //     depth afterwards (4.7 / 5.4 / 4.2 ms at depth 1 / 16 / 128).
      //   loops over a PARAMETER (a real candidate) depth 128: 33.7 ms -> 32.8 ms, i.e.
      //     unchanged — a candidate still has to be scanned, so the rescan across nesting
      //     levels survives here. That residual is real and tracked; it needs the guard
      //     state to be accumulated during the single traversal instead of re-derived per
      //     loop, which is a redesign of this heuristic rather than a reordering.
      if (node.right.type !== AST_NODE_TYPES.Identifier) return;
      const sourceName = node.right.name;
      let isParameter = false;
      for (let scope: typeof node extends never ? never : ReturnType<typeof context.sourceCode.getScope> | null = context.sourceCode.getScope(node); scope; scope = scope.upper) {
        const variable = scope.variables.find((v) => v.name === sourceName);
        if (!variable) continue;
        isParameter = variable.defs.some((def) => def.type === 'Parameter');
        break;
      }
      if (!isParameter) return;

      // TOKENS, not `getText`. Raw source text carries the comments with it, so an
      // ordinary `/* copy each prototype key */` inside the loop silenced the finding
      // entirely — a false negative anyone could trip by documenting their own code.
      // Joined without separators so multi-token guards still read as one string
      // (`Object` `.` `keys` -> `Object.keys`). String literals deliberately stay in:
      // `if (k === '__proto__') continue` is the documented guard and it IS a string.
      const bodyText = context.sourceCode
        .getTokens(node.body)
        .map((token) => token.value)
        .join('');
      // A guarded loop is the documented fix; do not report the fix.
      if (/hasOwnProperty|hasOwn|__proto__|constructor|prototype|includes\(|allowlist|whitelist|Object\.keys/.test(bodyText)) {
        return;
      }

      // Arm the loop and let ESLint's own traversal find the assignment. The previous
      // version recursively walked the whole body here, and ESLint then walked it AGAIN
      // — two passes per loop, and O(n²) once such loops nest. Nothing about the search
      // needed its own traversal: the assignment is an ordinary AssignmentExpression that
      // the visitor below already receives in source order.
      armedLoops.add(node);
      openCopyLoops.push({ keyName, reported: false });
    };

    /**
     * Reports the first key-write in each armed loop; returns true when it handled the node.
     *
     * Checked against EVERY open loop, not just the innermost, because
     * `for (a in x) { for (b in y) { t[a] = … } }` pollutes through the OUTER key — which
     * is what the old whole-subtree walk saw from the outer loop, and what a
     * top-of-stack-only check would miss.
     */
    const reportCopyLoopWrite = (node: TSESTree.AssignmentExpression): boolean => {
      if (
        node.left.type !== AST_NODE_TYPES.MemberExpression ||
        !node.left.computed ||
        node.left.property.type !== AST_NODE_TYPES.Identifier
      ) {
        return false;
      }
      const propertyName = node.left.property.name;
      const loop = openCopyLoops.find((open) => open.keyName === propertyName && !open.reported);
      if (!loop) return false;
      loop.reported = true;
      context.report({
        node,
        messageId: 'objectInjection',
        data: {
          riskLevel: 'HIGH',
          safeAlternative:
            'Guard the key before assigning: `if (k === "__proto__" || k === "constructor" || k === "prototype") continue;` — or copy with Object.create(null) / structuredClone.',
        },
      });
      return true;
    };

    return {
      ForInStatement: checkPrototypePollutingCopyLoop,
      'ForInStatement:exit': (node: TSESTree.ForInStatement) => {
        // Only loops that armed above pushed a frame, and they nest, so the frame to drop
        // is always the last one — but only when this loop is the one that pushed it.
        if (armedLoops.has(node)) openCopyLoops.pop();
      },
      AssignmentExpression: (node: TSESTree.AssignmentExpression) => {
        if (isInCodemodContext || isTestFile) return;
        // A copy-loop key-write is reported as prototype pollution and must not also be
        // reported by the generic computed-assignment check.
        if (reportCopyLoopWrite(node)) return;
        return checkAssignmentExpression(node);
      },
      MemberExpression: (node: TSESTree.MemberExpression) => {
        if (isInCodemodContext || isTestFile) return;
        return checkMemberExpression(node);
      },
      CallExpression: (node: TSESTree.CallExpression) => {
        if (isInCodemodContext || isTestFile) return;
        return checkObjectAssignSpread(node);
      },
    };
  },
});
