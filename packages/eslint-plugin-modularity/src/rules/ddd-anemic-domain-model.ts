/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: ddd-anemic-domain-model
 * Detects entities with only getters/setters and no business logic
 * Priority 1: Domain-Driven Design
 * 
 * @see https://martinfowler.com/bliki/AnemicDomainModel.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

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
 * Check if a method is pure delegation (just calls another method and returns)
 * e.g., save() { return this.repository.save(this); }
 * Does NOT count calls to array methods, built-ins, or methods on this
 */
function isPureDelegation(member: TSESTree.MethodDefinition): boolean {
  if (member.value.type !== 'FunctionExpression') {
    return false;
  }
  
  const body = member.value.body;
  
  if (body.type !== 'BlockStatement' || body.body.length !== 1) {
    return false;
  }
  
  const statement = body.body[0];
  
  // Array/collection methods that are business logic, not delegation
  const builtInMethods = new Set([
    'map', 'filter', 'reduce', 'forEach', 'find', 'findIndex', 'some', 'every',
    'includes', 'indexOf', 'slice', 'concat', 'join', 'sort', 'reverse',
    'push', 'pop', 'shift', 'unshift', 'splice', 'flat', 'flatMap',
    'toString', 'valueOf', 'toJSON'
  ]);
  
  // Check: return someService.method(...) or return this.service.method(...) 
  if (statement.type === 'ReturnStatement' && statement.argument) {
    const arg = statement.argument;
    if (arg.type === 'CallExpression' && arg.callee.type === 'MemberExpression') {
      const callee = arg.callee;
      const methodName = callee.property.type === 'Identifier' ? callee.property.name : '';
      
      // Skip if it's a built-in method (not delegation)
      if (builtInMethods.has(methodName)) {
        return false;
      }
      
      // It's a delegation call, check if it's to an external service
      const object = callee.object;
      if (object.type === 'MemberExpression' && 
          object.object.type === 'ThisExpression') {
        // this.service.method() pattern - but only if not a built-in
        const propName = object.property.type === 'Identifier' ? object.property.name : '';
        // Common service patterns: repository, service, api, client, dao
        if (propName.includes('repository') || propName.includes('service') || 
            propName.includes('api') || propName.includes('client') ||
            propName.includes('dao') || propName.includes('Repository') ||
            propName.includes('Service') || propName.includes('Api')) {
          return true;
        }
        return false; // this.items.method() is business logic
      }
      if (object.type === 'Identifier') {
        // externalService.method() pattern - definitely delegation
        return true;
      }
    }
  }
  
  // Check: this.service.method(...) without return (void delegation)
  if (statement.type === 'ExpressionStatement') {
    const expr = statement.expression;
    if (expr.type === 'CallExpression' && expr.callee.type === 'MemberExpression') {
      const callee = expr.callee;
      const methodName = callee.property.type === 'Identifier' ? callee.property.name : '';
      
      // Skip built-in methods
      if (builtInMethods.has(methodName)) {
        return false;
      }
      
      const object = callee.object;
      if (object.type === 'MemberExpression' && 
          object.object.type === 'ThisExpression') {
        const propName = object.property.type === 'Identifier' ? object.property.name : '';
        if (propName.includes('repository') || propName.includes('service') || 
            propName.includes('api') || propName.includes('client') ||
            propName.includes('dao') || propName.includes('Repository') ||
            propName.includes('Service') || propName.includes('Api')) {
          return true;
        }
        return false;
      }
    }
  }
  
  return false;
}

/**
 * Count business logic methods (non-getter/setter/delegation)
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
      
      // Skip pure delegation methods (just calls external service)
      if (isPureDelegation(member)) {
        continue;
      }
      
      // Count methods (any method that's not a getter/setter/constructor/delegation is business logic)
      const valueType = member.value.type as string;
      if (valueType === 'FunctionExpression' || valueType === 'ArrowFunctionExpression') {
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
      addBusinessLogic: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Business Logic',
        description: 'Add business logic methods',
        severity: 'LOW',
        fix: 'Add domain behavior methods to {{className}}',
        documentationLink: 'https://martinfowler.com/bliki/AnemicDomainModel.html',
      }),
      migrateToRichModel: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Migrate to Rich Model',
        description: 'Migrate to rich domain model',
        severity: 'LOW',
        fix: 'Encapsulate behavior with data',
        documentationLink: 'https://martinfowler.com/bliki/AnemicDomainModel.html',
      }),
      identifyAggregateRoot: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Identify Aggregate Root',
        description: 'Identify aggregate root and enforce invariants',
        severity: 'LOW',
        fix: 'Define aggregate boundaries and enforce invariants',
        documentationLink: 'https://martinfowler.com/bliki/DDD_Aggregate.html',
      }),
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

