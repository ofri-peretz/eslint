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
import { 
  formatLLMMessage, 
  MessageIcons,
  hasParserServices,
  getParserServices,
  getTypeOfNode,
  isUnionOfSafeStringLiterals,
  getStringLiteralValues,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

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
      description: 'Detects variable[key] as a left- or right-hand assignment operand',
    },
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
      allowLiterals = false,
      dangerousProperties = ['__proto__', 'prototype', 'constructor'],
    }: Options = options || {};

    // Track MemberExpressions that are part of AssignmentExpressions to avoid double-reporting
    const handledMemberExpressions = new WeakSet<TSESTree.MemberExpression>();

    // Check if TypeScript parser services are available for type-aware checking
    const hasTypeInfo = hasParserServices(context);
    const parserServices = hasTypeInfo ? getParserServices(context) : null;

    /**
     * Check if a node is a literal string (potentially safe)
     */
    const isLiteralString = (node: TSESTree.Node): boolean => {
      return node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string';
    };

    /**
     * Check if a property is part of a typed union (safe access)
     * 
     * Type-Aware Enhancement:
     * When TypeScript parser services are available, we can check if a variable
     * is typed as a union of string literals (e.g., 'name' | 'email').
     * Such accesses are safe because the values are statically constrained.
     * 
     * @example
     * // This is now detected as SAFE (no false positive):
     * const key: 'name' | 'email' = getKey();
     * obj[key] = value;
     * 
     * // This is still detected as DANGEROUS:
     * const key: string = getUserInput();
     * obj[key] = value;
     */
    const isTypedUnionAccess = (propertyNode: TSESTree.Node): boolean => {
      // Check if property is a literal string (typed access like obj['name'])
      if (isLiteralString(propertyNode)) {
        return true; // Literal strings are safe - they're typed at compile time
      }

      // Type-aware check: If we have TypeScript type information, check if the
      // property key is constrained to a union of safe string literals
      /* c8 ignore start -- TypeScript parser services often unavailable in RuleTester */
      if (parserServices && propertyNode.type === AST_NODE_TYPES.Identifier) {
        try {
          const type = getTypeOfNode(propertyNode, parserServices);
          
          // Check if the type is a union of safe string literals
          // (excludes '__proto__', 'prototype', 'constructor')
          if (isUnionOfSafeStringLiterals(type, dangerousProperties)) {
            return true; // Safe - statically constrained to safe values
          }
          
          // Also check for single string literal type (e.g., const key: 'name' = ...)
          const literalValues = getStringLiteralValues(type);
          if (literalValues && literalValues.length === 1) {
            // Single literal - safe if not dangerous
            if (!dangerousProperties.includes(literalValues[0])) {
              return true;
            }
          }
        } catch {
          // If type checking fails, fall back to treating as potentially dangerous
          // This can happen with malformed AST or missing type information
        }
      }
      /* c8 ignore stop */

      // Without type information, treat all identifiers as potentially dangerous
      return false;
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
     * Check if property access is potentially dangerous
     */
    const isDangerousPropertyAccess = (propertyNode: TSESTree.Node): boolean => {
      // SAFE: Numeric literals (array index access like items[0], items[1])
      if (propertyNode.type === AST_NODE_TYPES.Literal && typeof propertyNode.value === 'number') {
        return false;
      }

      // Check if it's a literal string first
      if (isLiteralString(propertyNode)) {
        const propName = String((propertyNode as TSESTree.Literal).value);
        
        // DANGEROUS: Literal strings that match dangerous properties (always flag these)
        // Check this BEFORE checking typed union access
        if (dangerousProperties.includes(propName)) {
          return true;
        }
        
      // SAFE: Typed union access (obj[typedKey] where typedKey is 'primary' | 'secondary')
        // Only safe if it's NOT a dangerous property
      if (isTypedUnionAccess(propertyNode)) {
        return false;
      }

        // SAFE: Literal strings that are NOT dangerous properties (if allowLiterals is true)
        if (allowLiterals) {
          return false;
        }
        
        // If allowLiterals is false, non-dangerous literal strings are still considered safe
        // (they're static and known at compile time)
        return false;
      }

      // DANGEROUS: Any untyped/dynamic property access (e.g., obj[userInput])
      return true;
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
      const sourceCode = context.sourceCode || context.sourceCode;

      let object: string;
      let property: string;
      let propertyNode: TSESTree.Node;
      let isAssignment = false;

      if (node.type === AST_NODE_TYPES.AssignmentExpression && node.left.type === AST_NODE_TYPES.MemberExpression) {
        // Assignment: obj[key] = value
        object = sourceCode.getText(node.left.object);
        property = sourceCode.getText(node.left.property);
        propertyNode = node.left.property;
        isAssignment = true;
      } else if (node.type === AST_NODE_TYPES.MemberExpression) {
        // Access: obj[key]
        object = sourceCode.getText(node.object);
        property = sourceCode.getText(node.property);
        propertyNode = node.property;
        isAssignment = false;
      } else {
        return { object: '', property: '', propertyNode: node, isAssignment: false, pattern: null };
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

      const { propertyNode } = extractPropertyAccess(node);

      // Skip if the key has been validated (e.g., includes() or hasOwnProperty check)
      if (hasPrecedingValidation(propertyNode, node)) {
        return false;
      }

      // Check for dangerous property access in assignment
      return isDangerousPropertyAccess(propertyNode);
    };

    /**
     * Determine if this is a high-risk member access
     */
    const isHighRiskMemberAccess = (node: TSESTree.MemberExpression): boolean => {
      // Only check computed member access (bracket notation)
      if (!node.computed) {
        return false;
      }

      const { propertyNode } = extractPropertyAccess(node);

      // Skip if the key has been validated (e.g., includes() or hasOwnProperty check)
      if (hasPrecedingValidation(propertyNode, node)) {
        return false;
      }

      // Check for dangerous property access
      return isDangerousPropertyAccess(propertyNode);
    };

    /**
     * Determine risk level based on the pattern and context
     */
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

      // Mark the MemberExpression as handled to avoid double-reporting
      if (node.left.type === AST_NODE_TYPES.MemberExpression) {
        handledMemberExpressions.add(node.left);
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
    const checkMemberExpression = (node: TSESTree.MemberExpression) => {
      if (!isHighRiskMemberAccess(node)) {
        return;
      }

      // Skip if this MemberExpression was already handled as part of an AssignmentExpression
      if (handledMemberExpressions.has(node)) {
        return;
      }

      // Also check parent - if it's an AssignmentExpression and this node is the left side, skip
      // (This handles cases where WeakSet check didn't work due to visitor order)
      const parent = node.parent as TSESTree.Node | undefined;
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

    return {
      AssignmentExpression: checkAssignmentExpression,
      MemberExpression: checkMemberExpression
    };
  },
});
