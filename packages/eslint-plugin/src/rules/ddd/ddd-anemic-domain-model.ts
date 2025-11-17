/**
 * ESLint Rule: ddd-anemic-domain-model
 * Detects entities with only getters/setters and no business logic
 * Priority 1: Domain-Driven Design
 * 
 * @see https://martinfowler.com/bliki/AnemicDomainModel.html
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'anemicDomainModel'
  | 'addBusinessLogic'
  | 'migrateToRichModel'
  | 'identifyAggregateRoot';

export interface Options {
  /** Minimum methods required to not be considered anemic. Default: 1 */
  minBusinessMethods?: number;
  
  /** Ignore DTOs and data transfer objects. Default: true */
  ignoreDtos?: boolean;
  
  /** Patterns for DTO identification. Default: ['DTO', 'Dto', 'Data', 'Request', 'Response'] */
  dtoPatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if a class is likely a DTO
 */
function isDto(
  className: string,
  dtoPatterns: string[]
): boolean {
  return dtoPatterns.some(pattern => className.includes(pattern));
}

/**
 * Check if a method is a simple getter/setter in disguise
 */
function isSimpleGetterSetter(member: TSESTree.MethodDefinition): boolean {
  if (member.value.type !== 'FunctionExpression') {
    return false;
  }
  
  const methodName = member.key.type === 'Identifier' ? member.key.name : '';
  const body = member.value.body;
  
  if (body.type !== 'BlockStatement' || body.body.length === 0) {
    return false;
  }
  
  // Check if it's a simple getter (getName() { return this.name; })
  if (methodName.startsWith('get') && body.body.length === 1) {
    const statement = body.body[0];
    if (statement.type === 'ReturnStatement' && statement.argument) {
      // Simple return statement
      return true;
    }
  }
  
  // Check if it's a simple setter (setName(name) { this.name = name; })
  if (methodName.startsWith('set') && body.body.length === 1) {
    const statement = body.body[0];
    if (statement.type === 'ExpressionStatement' && 
        statement.expression.type === 'AssignmentExpression') {
      // Simple assignment
      return true;
    }
  }
  
  return false;
}

/**
 * Count business logic methods (non-getter/setter)
 */
function countBusinessMethods(
  node: TSESTree.ClassDeclaration | TSESTree.ClassExpression
): number {
  let count = 0;
  
  for (const member of node.body.body) {
    if (member.type === 'MethodDefinition') {
      const methodName = member.key.type === 'Identifier' ? member.key.name : '';
      
      // Skip getters and setters
      if (member.kind === 'get' || member.kind === 'set') {
        continue;
      }
      
      // Skip constructor
      if (methodName === 'constructor') {
        continue;
      }
      
      // Skip simple getter/setter methods in disguise
      if (isSimpleGetterSetter(member)) {
        continue;
      }
      
      // Count methods (any method that's not a getter/setter/constructor is business logic)
      if (member.value.type === 'FunctionExpression' || member.value.type === 'ArrowFunctionExpression') {
        count++;
      }
    } else if (member.type === 'PropertyDefinition') {
      // Property definitions are not business logic
      continue;
    }
  }
  
  return count;
}

export const dddAnemicDomainModel = createRule<RuleOptions, MessageIds>({
  name: 'ddd-anemic-domain-model',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detects entities with only getters/setters and no business logic',
    },
    messages: {
      anemicDomainModel: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Anemic domain model',
        description: 'Class {{className}} has no business logic (only getters/setters)',
        severity: 'MEDIUM',
        fix: 'Add business logic methods to create a rich domain model',
        documentationLink: 'https://martinfowler.com/bliki/AnemicDomainModel.html',
      }),
      addBusinessLogic: '✅ Add business logic methods to {{className}}',
      migrateToRichModel: '✅ Migrate to rich domain model with encapsulated behavior',
      identifyAggregateRoot: '✅ Identify aggregate root and enforce invariants',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minBusinessMethods: {
            type: 'number',
            default: 1,
            minimum: 0,
            description: 'Minimum business methods required',
          },
          ignoreDtos: {
            type: 'boolean',
            default: true,
            description: 'Ignore DTOs and data transfer objects',
          },
          dtoPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['DTO', 'Dto', 'Data', 'Request', 'Response', 'Payload'],
            description: 'Patterns for DTO identification',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      minBusinessMethods: 1,
      ignoreDtos: true,
      dtoPatterns: ['DTO', 'Dto', 'Data', 'Request', 'Response', 'Payload'],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
minBusinessMethods = 1,
      ignoreDtos = true,
      dtoPatterns = ['DTO', 'Dto', 'Data', 'Request', 'Response', 'Payload'],
    
}: Options = options || {};

    /**
     * Check class declarations
     */
    function checkClass(node: TSESTree.ClassDeclaration | TSESTree.ClassExpression) {
      if (!node.id) {
        return; // Anonymous class
      }

      const className = node.id.name;

      // Check if it's a DTO
      if (ignoreDtos && isDto(className, dtoPatterns)) {
        return;
      }

      const businessMethodCount = countBusinessMethods(node);

      if (businessMethodCount < minBusinessMethods) {
        context.report({
          node,
          messageId: 'anemicDomainModel',
          data: {
            className,
          },
          suggest: [
            {
              messageId: 'addBusinessLogic',
              fix: () => null,
              data: {
                className,
              },
            },
            {
              messageId: 'migrateToRichModel',
              fix: () => null,
            },
            {
              messageId: 'identifyAggregateRoot',
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

