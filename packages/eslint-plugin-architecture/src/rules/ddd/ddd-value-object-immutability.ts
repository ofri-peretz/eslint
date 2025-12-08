/**
 * ESLint Rule: ddd-value-object-immutability
 * Validates value objects are properly immutable
 * Priority 1: Domain-Driven Design
 * 
 * @see https://martinfowler.com/bliki/ValueObject.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'mutableValueObject'
  | 'addReadonly'
  | 'useObjectFreeze'
  | 'makeImmutable';

export interface Options {
  /** Patterns to identify value objects. Default: ['Value', 'VO', 'ValueObject'] */
  valueObjectPatterns?: string[];
  
  /** Require readonly modifiers. Default: true */
  requireReadonly?: boolean;
  
  /** Check for Object.freeze usage. Default: true */
  checkObjectFreeze?: boolean;
}

type RuleOptions = [Options?];

/**
 * Check if a class name suggests a value object
 */
function isValueObject(
  className: string,
  patterns: string[]
): boolean {
  return patterns.some(pattern => className.includes(pattern));
}

/**
 * Check if property has readonly modifier
 */
function hasReadonlyModifier(
  node: TSESTree.PropertyDefinition | TSESTree.TSPropertySignature
): boolean {
  if (node.type === 'PropertyDefinition') {
    return node.readonly === true;
  }
  
  /* v8 ignore start -- TSPropertySignature is for interfaces, rule only processes classes */
  if (node.type === 'TSPropertySignature') {
    return node.readonly === true;
  }
  
  return false;
  /* v8 ignore stop */
}

/**
 * Check if class uses Object.freeze
 */
function usesObjectFreeze(
  node: TSESTree.ClassDeclaration | TSESTree.ClassExpression
): boolean {
  // Check constructor for Object.freeze(this)
  for (const member of node.body.body) {
    if (member.type === 'MethodDefinition' && member.kind === 'constructor') {
      const constructor = member.value;
      if (constructor.type === 'FunctionExpression') {
        const body = constructor.body;
        if (body.type === 'BlockStatement') {
          for (const statement of body.body) {
            if (
              statement.type === 'ExpressionStatement' &&
              statement.expression.type === 'CallExpression' &&
              statement.expression.callee.type === 'MemberExpression' &&
              statement.expression.callee.object.type === 'Identifier' &&
              statement.expression.callee.object.name === 'Object' &&
              statement.expression.callee.property.type === 'Identifier' &&
              statement.expression.callee.property.name === 'freeze'
            ) {
              return true;
            }
          }
        }
      }
    }
  }
  
  return false;
}

export const dddValueObjectImmutability = createRule<RuleOptions, MessageIds>({
  name: 'ddd-value-object-immutability',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Validates value objects are properly immutable',
    },
    messages: {
      mutableValueObject: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Mutable value object',
        description: 'Value object {{className}} has mutable properties',
        severity: 'MEDIUM',
        fix: 'Make properties readonly or use Object.freeze',
        documentationLink: 'https://martinfowler.com/bliki/ValueObject.html',
      }),
      addReadonly: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Readonly',
        description: 'Add readonly modifier',
        severity: 'LOW',
        fix: 'readonly propertyName: Type',
        documentationLink: 'https://www.typescriptlang.org/docs/handbook/2/classes.html#readonly',
      }),
      useObjectFreeze: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Object.freeze',
        description: 'Use Object.freeze in constructor',
        severity: 'LOW',
        fix: 'constructor() { Object.freeze(this); }',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze',
      }),
      makeImmutable: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Make Immutable',
        description: 'Make value object fully immutable',
        severity: 'LOW',
        fix: 'Add readonly to all properties and freeze object',
        documentationLink: 'https://martinfowler.com/bliki/ValueObject.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          valueObjectPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['Value', 'VO', 'ValueObject'],
            description: 'Patterns to identify value objects',
          },
          requireReadonly: {
            type: 'boolean',
            default: true,
            description: 'Require readonly modifiers',
          },
          checkObjectFreeze: {
            type: 'boolean',
            default: true,
            description: 'Check for Object.freeze usage',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      valueObjectPatterns: ['Value', 'VO', 'ValueObject'],
      requireReadonly: true,
      checkObjectFreeze: true,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
valueObjectPatterns = ['Value', 'VO', 'ValueObject'],
      requireReadonly = true,
      checkObjectFreeze = true,
    
}: Options = options || {};

    /**
     * Check class declarations
     */
    function checkClass(node: TSESTree.ClassDeclaration | TSESTree.ClassExpression) {
      if (!node.id) {
        return;
      }

      const className = node.id.name;

      // Check if it's a value object
      if (!isValueObject(className, valueObjectPatterns)) {
        return;
      }

      // Check if Object.freeze is used
      if (checkObjectFreeze && usesObjectFreeze(node)) {
        return; // Already using Object.freeze
      }

      // Check properties for readonly
      const mutableProperties: TSESTree.Node[] = [];
      
      for (const member of node.body.body) {
        if (member.type === 'PropertyDefinition') {
          if (requireReadonly && !hasReadonlyModifier(member)) {
            mutableProperties.push(member);
          }
        }
      }

      if (mutableProperties.length > 0) {
        context.report({
          node,
          messageId: 'mutableValueObject',
          data: {
            className,
          },
          suggest: [
            {
              messageId: 'addReadonly',
              fix: () => null, // Complex fix, requires AST manipulation
            },
            {
              messageId: 'useObjectFreeze',
              fix: () => null,
            },
            {
              messageId: 'makeImmutable',
              fix: () => null,
            },
          ],
        });
      }
    }

    return {
      ClassDeclaration: checkClass,
      ClassExpression: checkClass,
    };
  },
});

