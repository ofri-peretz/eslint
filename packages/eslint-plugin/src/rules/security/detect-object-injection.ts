/**
 * ESLint Rule: detect-object-injection
 * Detects variable[key] as a left- or right-hand assignment operand (prototype pollution)
 * LLM-optimized with comprehensive object injection prevention guidance
 *
 * @see https://portswigger.net/web-security/prototype-pollution
 * @see https://cwe.mitre.org/data/definitions/915.html
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { generateLLMContext } from '../../utils/llm-context';

type MessageIds =
  | 'objectInjection'
  | 'useMapInstead'
  | 'useHasOwnProperty'
  | 'whitelistKeys'
  | 'useObjectCreate'
  | 'freezePrototypes';

export interface Options {
  /** Allow bracket notation with literal strings (false = stricter) */
  allowLiterals?: boolean;
  /** Additional object methods to check for injection */
  additionalMethods?: string[];
  /** Properties to consider dangerous (default: __proto__, prototype, constructor) */
  dangerousProperties?: string[];
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
      objectInjection:
        '⚠️ Object injection (CWE-915: Prototype Pollution) | {{riskLevel}}\n' +
        '   ❌ Current: obj[{{pattern}}] = value\n' +
        '   ✅ Fix: {{safeAlternative}}\n' +
        '   📚 https://portswigger.net/web-security/prototype-pollution',
      useMapInstead: '✅ Use Map instead of plain objects for key-value storage',
      useHasOwnProperty: '✅ Use hasOwnProperty() check to avoid prototype properties',
      whitelistKeys: '✅ Whitelist allowed property names',
      useObjectCreate: '✅ Use Object.create(null) for clean objects without prototypes',
      freezePrototypes: '✅ Freeze Object.prototype to prevent pollution'
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
      dangerousProperties: ['__proto__', 'prototype', 'constructor']
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      allowLiterals = false,
      additionalMethods = [],
      dangerousProperties = ['__proto__', 'prototype', 'constructor']
    } = options;

    /**
     * Check if a node is a literal string (potentially safe)
     */
    const isLiteralString = (node: TSESTree.Node): boolean => {
      return node.type === 'Literal' && typeof node.value === 'string';
    };

    /**
     * Check if property access is potentially dangerous
     */
    const isDangerousPropertyAccess = (propertyNode: TSESTree.Node): boolean => {
      // Allow literal strings if configured
      if (allowLiterals && isLiteralString(propertyNode)) {
        const propName = String((propertyNode as TSESTree.Literal).value);
        // Even literals can be dangerous if they match dangerous properties
        return dangerousProperties.includes(propName);
      }

      // Any non-literal property access is potentially dangerous
      return !isLiteralString(propertyNode);
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
      const sourceCode = context.sourceCode || context.getSourceCode();

      let object: string;
      let property: string;
      let propertyNode: TSESTree.Node;
      let isAssignment = false;

      if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression') {
        // Assignment: obj[key] = value
        object = sourceCode.getText(node.left.object);
        property = sourceCode.getText(node.left.property);
        propertyNode = node.left.property;
        isAssignment = true;
      } else if (node.type === 'MemberExpression') {
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

      const { propertyNode } = extractPropertyAccess(node);

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

      // Check for dangerous property access
      return isDangerousPropertyAccess(propertyNode);
    };

    /**
     * Generate refactoring steps based on the pattern
     */
    const generateRefactoringSteps = (pattern: ObjectInjectionPattern | null, isAssignment: boolean): string => {
      if (!pattern) {
        return [
          '   1. Create a whitelist of allowed property names',
          '   2. Validate user input against the whitelist',
          '   3. Use hasOwnProperty() for safe property access',
          '   4. Consider using Map or Set for dynamic properties',
          '   5. Add runtime property validation'
        ].join('\n');
      }

      switch (pattern.vulnerability) {
        case 'prototype-pollution':
          return [
            '   1. Use Map instead of plain objects: new Map()',
            '   2. Use Object.create(null) for prototype-free objects',
            '   3. Avoid direct property assignment with user input',
            '   4. Implement property whitelisting',
            '   5. Consider freezing Object.prototype in secure contexts'
          ].join('\n');

        case 'property-injection':
          return [
            '   1. Define allowed properties in a constant array',
            '   2. Check if property exists in whitelist before assignment',
            '   3. Use Object.defineProperty with validation',
            '   4. Implement property name sanitization',
            '   5. Add logging for property injection attempts'
          ].join('\n');

        case 'method-injection':
          return [
            '   1. Never allow "constructor" property manipulation',
            '   2. Use strict property validation',
            '   3. Avoid eval-like behavior with user input',
            '   4. Implement method whitelisting if dynamic methods needed',
            '   5. Use class-based approach instead of plain objects'
          ].join('\n');

        default:
          return [
            '   1. Identify the legitimate use case for dynamic properties',
            '   2. Implement appropriate safe alternative',
            '   3. Add comprehensive input validation',
            '   4. Use type-safe property access methods',
            '   5. Test with malicious property names'
          ].join('\n');
      }
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

      const { object, property, propertyNode, isAssignment, pattern } = extractPropertyAccess(node);

      const riskLevel = determineRiskLevel(pattern, isAssignment);
      const steps = generateRefactoringSteps(pattern, isAssignment);

      const llmContext = generateLLMContext('security/detect-object-injection', {
        severity: riskLevel.toLowerCase() as 'error' | 'warning',
        category: 'security',
        filePath: context.filename || context.getFilename(),
        node,
        details: {
          vulnerability: {
            type: pattern?.vulnerability || 'object-injection',
            cwe: 'CWE-915: Improperly Controlled Modification of Object Prototype',
            owasp: 'A01:2021-Broken Access Control',
            cvss: riskLevel === 'CRITICAL' ? '8.1' : riskLevel === 'HIGH' ? '7.1' : '5.3'
          },
          objectAccess: {
            object,
            property: property.replace(/['"]/g, ''),
            isAssignment,
            dangerousProperty: pattern ? true : false,
            propertyType: isLiteralString(propertyNode) ? 'literal' : 'dynamic'
          },
          exploitability: {
            difficulty: isLiteralString(propertyNode) ? 'Medium' : 'Easy',
            impact: 'Prototype pollution, property injection, method manipulation',
            prerequisites: 'User input reaches object property assignment'
          },
          remediation: {
            effort: pattern?.effort || '10-15 minutes',
            priority: `${riskLevel} - Fix immediately`,
            automated: false,
            steps: [
              `Replace ${object}[${property}] with safe property access`,
              'Use Map or whitelist for dynamic properties',
              'Add property name validation',
              'Implement hasOwnProperty checks',
              'Test with malicious property names'
            ]
          }
        },
        quickFix: {
          automated: false,
          estimatedEffort: pattern?.effort || '10-15 minutes',
          changes: [
            `Replace ${object}[${property}] with safe alternative`,
            'Use Map for key-value storage',
            'Add property whitelisting',
            'Use hasOwnProperty validation'
          ]
        },
        resources: {
          docs: 'https://portswigger.net/web-security/prototype-pollution',
          examples: 'https://github.com/HoLyVieR/prototype-pollution-nsec18/blob/master/paper/JavaScript_prototype_pollution_attack_in_NodeJS.pdf'
        }
      });

      context.report({
        node,
        messageId: 'objectInjection',
        data: {
          ...llmContext,
          pattern: `${object}[${property}]`,
          riskLevel,
          vulnerability: pattern?.vulnerability || 'object injection',
          safeAlternative: pattern?.safeAlternative || 'Use Map or property whitelisting',
          steps,
          effort: pattern?.effort || '10-15 minutes'
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

      const { object, property, propertyNode, isAssignment, pattern } = extractPropertyAccess(node);

      // Skip if this is part of an assignment (already handled above)
      if (isAssignment) {
        return;
      }

      const riskLevel = determineRiskLevel(pattern, isAssignment);
      const steps = generateRefactoringSteps(pattern, isAssignment);

      context.report({
        node,
        messageId: 'objectInjection',
        data: {
          pattern: `${object}[${property}]`,
          riskLevel,
          vulnerability: pattern?.vulnerability || 'object injection',
          safeAlternative: pattern?.safeAlternative || 'Use Map or property whitelisting',
          steps,
          effort: pattern?.effort || '10-15 minutes'
        }
      });
    };

    return {
      AssignmentExpression: checkAssignmentExpression,
      MemberExpression: checkMemberExpression
    };
  },
});
