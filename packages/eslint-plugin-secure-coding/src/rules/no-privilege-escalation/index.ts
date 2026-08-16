/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-privilege-escalation
 * Detects potential privilege escalation vulnerabilities
 * CWE-269: Improper Privilege Management
 * 
 * @see https://cwe.mitre.org/data/definitions/269.html
 * @see https://owasp.org/www-community/vulnerabilities/Improper_Access_Control
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, formatLLMMessage, MessageIcons,
  compileUserPatterns,
  compileUserPattern,
  identifierWords,
  matchesAnyUserPattern,
  nameHasAnyWord,
  type PatternTest,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'privilegeEscalation';

export interface Options {
  /** Allow privilege escalation patterns in test files. Default: false */
  allowInTests?: boolean;
  
  /** Test file pattern regex string. Default: '\\.(test|spec)\\.(ts|tsx|js|jsx)$' */
  testFilePattern?: string;
  
  /** Role check patterns to recognize. Default: ['hasRole', 'checkRole', 'isAdmin', 'isAuthorized'] */
  roleCheckPatterns?: string[];
  
  /** User input patterns that should be validated. Default: ['req.body', 'req.query', 'req.params'] */
  userInputPatterns?: string[];
  
  /** Additional patterns to ignore. Default: [] */
  ignorePatterns?: string[];

  /**
   * Property names whose assignment is an authorisation decision. REPLACES the
   * built-in list; compared case-insensitively as an exact property name.
   * Default: DEFAULT_PRIVILEGE_PROPERTIES
   */
  privilegeProperties?: string[];

  /** Extra privilege property names, ON TOP of the built-ins. Default: [] */
  additionalPrivilegeProperties?: string[];

  /**
   * Privilege operations, matched as WHOLE WORDS or whole consecutive phrases
   * of a callee name. REPLACES the built-in list.
   * Default: DEFAULT_PRIVILEGE_TERMS
   */
  privilegeTerms?: string[];

  /** Extra privilege operation terms, ON TOP of the built-ins. Default: [] */
  additionalPrivilegeTerms?: string[];

  /**
   * Verbs that count only when they are the WHOLE callee name. REPLACES the
   * built-in list. Default: DEFAULT_BARE_PRIVILEGE_VERBS
   */
  barePrivilegeVerbs?: string[];

  /** Extra bare privilege verbs, ON TOP of the built-ins. Default: [] */
  additionalBarePrivilegeVerbs?: string[];
}

type RuleOptions = [Options?];

/**
 * Common role check patterns
 */
const DEFAULT_ROLE_CHECK_PATTERNS = [
  'hasRole',
  'checkRole',
  'isAdmin',
  'isAuthorized',
  'hasPermission',
  'checkPermission',
  'verifyRole',
  'requireRole',
];

/**
 * Common user input patterns
 *
 * A bare `\binput\b` used to be on this list, and it made any member called
 * `.input` attacker-controlled: `audioTrack.level = mixer.input.gain.value`,
 * a Web Audio volume fader, was reported as CWE-269. The word `input` on its
 * own is not evidence of anything — `userInput`, which names the request, is.
 */
const DEFAULT_USER_INPUT_PATTERNS = [
  /\breq\.(body|query|params)\b/,
  /\brequest\.(body|query|params)\b/,
  /\buserInput\b/,
];

/**
 * Properties whose assignment is an authorisation decision.
 *
 * `level` was on this list and is off it now. Almost every `.level` in real
 * code is a log level, a zoom level, a compression level or a difficulty —
 * `logger.level = req.body.level`, a Pino verbosity endpoint validated against
 * Pino's own closed set, was reported as privilege escalation. The four that
 * remain have no common non-authorisation sense.
 *
 * Four English words, so it is a default rather than a fact: a codebase where
 * `access` names a file-access mode wants it out, and one whose ACL field is
 * `entitlement` wants that in. Both are options; neither changes that the
 * comparison is exact, never a substring.
 */
const DEFAULT_PRIVILEGE_PROPERTIES = ['role', 'permission', 'privilege', 'access'];

/**
 * Privilege operations, matched as WHOLE WORDS or whole consecutive phrases.
 *
 * The shipped rule tested `calleeName.includes(op)` for ['setrole', 'grant',
 * 'revoke', 'elevate', 'promote'], so a chess engine's `promotePawn(board,
 * req.body.promotion)` and a funding portal's `createGrantApplication(req.body)`
 * were both reported as ACL writes.
 */
const DEFAULT_PRIVILEGE_TERMS = [
  'setRole',
  'updateRole',
  'elevate',
  'grant role',
  'grant permission',
  'grant access',
  'grant privilege',
  'promote user',
  'promote admin',
  'revoke role',
  'revoke permission',
  'revoke access',
  'revoke privilege',
];

/**
 * `grant`, `promote` and `revoke` carry an ordinary English sense that
 * dominates in most codebases — a research grant, promoting a campaign,
 * `URL.revokeObjectURL` releasing a blob handle — so they only count when they
 * are the WHOLE name, `grant(user, req.body.permission)`, and not when they
 * merely modify a domain noun.
 */
const DEFAULT_BARE_PRIVILEGE_VERBS = ['grant', 'promote', 'revoke'];

function isPrivilegeOperationName(
  name: string,
  privilegeTerms: readonly string[],
  bareVerbs: ReadonlySet<string>,
): boolean {
  if (nameHasAnyWord(name, privilegeTerms)) {
    return true;
  }
  const words = identifierWords(name);
  return words.length === 1 && bareVerbs.has(words[0]);
}

/**
 * The assigned property name, for both `user.role` and `user['role']`.
 *
 * The shipped rule required `property.type === 'Identifier'`, so bracket
 * notation with a string literal key — the same property, written the way code
 * that also handles hyphenated field names writes it — was invisible.
 */
function assignedPropertyName(member: TSESTree.MemberExpression): string | null {
  if (!member.computed && member.property.type === AST_NODE_TYPES.Identifier) {
    return member.property.name;
  }
  if (member.property.type === AST_NODE_TYPES.Literal && typeof member.property.value === 'string') {
    return member.property.value;
  }
  return null;
}

/** Every descendant node, `parent` links excluded. */
function forEachNode(root: TSESTree.Node, visit: (node: TSESTree.Node) => void): void {
  const pending: TSESTree.Node[] = [root];

  while (pending.length > 0) {
    const node = pending.pop() as TSESTree.Node;
    visit(node);

    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') continue;
      const children = Array.isArray(value) ? value : [value];
      for (const child of children) {
        if (child !== null && typeof child === 'object' && typeof child.type === 'string') {
          pending.push(child as TSESTree.Node);
        }
      }
    }
  }
}

/**
 * Does this expression perform a role check?
 *
 * Matched on the identifiers it actually contains, as whole words. The shipped
 * rule ran `sourceCode.getText(test).includes(pattern)` over the printed
 * condition, which is the same substring defect in the SUPPRESSION direction.
 */
function containsRoleCheck(root: TSESTree.Node, roleCheckPatterns: string[]): boolean {
  let found = false;
  forEachNode(root, (node) => {
    if (node.type === AST_NODE_TYPES.Identifier && nameHasAnyWord(node.name, roleCheckPatterns)) {
      found = true;
    }
  });
  return found;
}

/** A branch that always leaves: `return` / `throw`, bare or in a block. */
function exitsUnconditionally(node: TSESTree.Statement): boolean {
  if (
    node.type === AST_NODE_TYPES.ReturnStatement ||
    node.type === AST_NODE_TYPES.ThrowStatement
  ) {
    return true;
  }
  if (node.type === AST_NODE_TYPES.BlockStatement) {
    return node.body.some(
      (statement) =>
        statement.type === AST_NODE_TYPES.ReturnStatement ||
        statement.type === AST_NODE_TYPES.ThrowStatement
    );
  }
  return false;
}

/**
 * Is this node preceded by a role GUARD CLAUSE?
 *
 * This is the rule's own documented remediation, verbatim from its `fix`
 * message:
 *
 *   if (!hasRole(user, requiredRole)) throw new Error("Unauthorized");
 *   user.role = req.body.role;
 *
 * The shipped `isInsideRoleCheck` only walked ANCESTORS, so it recognised the
 * wrapping-if style and nothing else — a user who applied the suggested fix
 * exactly still got the error. An early-return guard is a sibling statement,
 * not an ancestor.
 */
function isAfterRoleGuard(node: TSESTree.Node, roleCheckPatterns: string[]): boolean {
  let current: TSESTree.Node = node;

  while (current.parent) {
    const parent: TSESTree.Node = current.parent;

    if (parent.type === AST_NODE_TYPES.BlockStatement || parent.type === AST_NODE_TYPES.Program) {
      const body = parent.body as TSESTree.Statement[];
      const index = body.indexOf(current as TSESTree.Statement);

      for (let i = 0; i < index; i++) {
        const statement = body[i];
        if (
          statement.type === AST_NODE_TYPES.IfStatement &&
          exitsUnconditionally(statement.consequent) &&
          containsRoleCheck(statement.test, roleCheckPatterns)
        ) {
          return true;
        }
      }
    }

    current = parent;
  }

  return false;
}

/**
 * Check if a string matches any ignore pattern
 *
 * `compileUserPatterns` rather than a bare `new RegExp`: a valid but
 * catastrophic user pattern such as `(a+)+$` backtracks for tens of seconds on
 * a single file, and the try/catch below only ever covered the INVALID case.
 */
function matchesIgnorePattern(text: string, patterns: string[]): boolean {
  return matchesAnyUserPattern(compileUserPatterns(patterns, 'i'), text);
}

/**
 * Check if a node contains user input patterns
 */
function containsUserInput(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  userInputPatterns: readonly PatternTest[]
): boolean {
  const text = sourceCode.getText(node);
  return userInputPatterns.some(pattern => pattern.test(text));
}

/**
 * Check if a node is inside a role check call
 */
function isInsideRoleCheck(
  node: TSESTree.Node,
  roleCheckPatterns: string[]
): boolean {
  let current: TSESTree.Node | null = node;

  while (current) {
    // Check if current is inside an IfStatement with role check in condition
    if (current.parent && current.parent.type === 'IfStatement') {
      const ifStmt = current.parent as TSESTree.IfStatement;
      if (containsRoleCheck(ifStmt.test, roleCheckPatterns)) {
        return true;
      }
    }

    // Check if current is inside a ConditionalExpression (ternary) with role check
    if (current.parent && current.parent.type === 'ConditionalExpression') {
      const condExpr = current.parent as TSESTree.ConditionalExpression;
      if (containsRoleCheck(condExpr.test, roleCheckPatterns)) {
        return true;
      }
    }

    // Check if current is inside a CallExpression with role check
    if (current.parent && current.parent.type === 'CallExpression') {
      const callExpr = current.parent as TSESTree.CallExpression;
      const callee = callExpr.callee;

      if (callee.type === 'Identifier') {
        if (nameHasAnyWord(callee.name, roleCheckPatterns)) {
          return true;
        }
      }

      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        if (nameHasAnyWord(callee.property.name, roleCheckPatterns)) {
          return true;
        }
      }
    }

    // Traverse up the AST
    if ('parent' in current && current.parent) {
      current = current.parent as TSESTree.Node;
    } else {
      break;
    }
  }

  return false;
}

export const noPrivilegeEscalation = createRule<RuleOptions, MessageIds>({
  name: 'no-privilege-escalation',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-privilege-escalation.md',
      description: 'Detects potential privilege escalation vulnerabilities',
      cwe: 'CWE-269',
      cvss: 8.8,
    },
    messages: {
      privilegeEscalation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Privilege Escalation',
        cwe: 'CWE-269',
        description: 'Potential privilege escalation: {{issue}} - user input used without role validation',
        severity: 'HIGH',
        fix: 'Add role check before using user input: if (!hasRole(user, requiredRole)) throw new Error("Unauthorized");',
        documentationLink: 'https://cwe.mitre.org/data/definitions/269.html',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow privilege escalation patterns in test files',
          },
          testFilePattern: {
            type: 'string',
            default: '\\.(test|spec)\\.(ts|tsx|js|jsx)$',
            description: 'Test file pattern regex string',
          },
          roleCheckPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_ROLE_CHECK_PATTERNS,
            description: 'Role check patterns to recognize',
          },
          userInputPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional user input patterns to check (regex strings)',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional patterns to ignore',
          },
          privilegeProperties: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_PRIVILEGE_PROPERTIES,
            description:
              'Property names whose assignment is an authorisation decision, compared case-insensitively as an exact name. Replaces the built-in list.',
          },
          additionalPrivilegeProperties: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra privilege property names, on top of `privilegeProperties`.',
          },
          privilegeTerms: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_PRIVILEGE_TERMS,
            description:
              'Privilege operations, matched as whole words or whole consecutive phrases of a callee name — never as a substring. Replaces the built-in list.',
          },
          additionalPrivilegeTerms: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra privilege operation terms, on top of `privilegeTerms`.',
          },
          barePrivilegeVerbs: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_BARE_PRIVILEGE_VERBS,
            description:
              'Verbs that count only when they are the WHOLE callee name, because their ordinary English sense dominates otherwise. Replaces the built-in list.',
          },
          additionalBarePrivilegeVerbs: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra bare privilege verbs, on top of `barePrivilegeVerbs`.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      testFilePattern: '\\.(test|spec)\\.(ts|tsx|js|jsx)$',
      roleCheckPatterns: DEFAULT_ROLE_CHECK_PATTERNS,
      userInputPatterns: [],
      ignorePatterns: [],
      privilegeProperties: DEFAULT_PRIVILEGE_PROPERTIES,
      additionalPrivilegeProperties: [],
      privilegeTerms: DEFAULT_PRIVILEGE_TERMS,
      additionalPrivilegeTerms: [],
      barePrivilegeVerbs: DEFAULT_BARE_PRIVILEGE_VERBS,
      additionalBarePrivilegeVerbs: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      testFilePattern = '\\.(test|spec)\\.(ts|tsx|js|jsx)$',
      roleCheckPatterns = DEFAULT_ROLE_CHECK_PATTERNS,
      userInputPatterns: additionalUserInputPatterns = [],
      ignorePatterns = [],
      privilegeProperties = DEFAULT_PRIVILEGE_PROPERTIES,
      additionalPrivilegeProperties = [],
      privilegeTerms = DEFAULT_PRIVILEGE_TERMS,
      additionalPrivilegeTerms = [],
      barePrivilegeVerbs = DEFAULT_BARE_PRIVILEGE_VERBS,
      additionalBarePrivilegeVerbs = [],
    } = options as Options;

    // The property comparison has always been against a lower-cased key, so a
    // user writing `accessLevel` must be folded the same way or their entry
    // would never match anything.
    const privilegeProps = new Set(
      [...privilegeProperties, ...additionalPrivilegeProperties].map((name) =>
        name.toLowerCase(),
      ),
    );
    const privilegeOperationTerms = [...privilegeTerms, ...additionalPrivilegeTerms];
    const bareVerbs = new Set([...barePrivilegeVerbs, ...additionalBarePrivilegeVerbs]);
    const isPrivilegeOperationCallee = (name: string): boolean =>
      isPrivilegeOperationName(name, privilegeOperationTerms, bareVerbs);

    const filename = context.filename;
    // Guarded: a user pattern reaches `new RegExp` here. Measured before this
    // change: `(a+)+$` took 45-58s on a single file, and `[` threw
    // "Invalid regular expression" out of create(), killing the whole lint
    // run rather than just this rule. compileUserPattern degrades both to a
    // substring match.
    const testFileRegex = compileUserPattern(testFilePattern);
    const isTestFile = allowInTests && testFileRegex.test(filename);
    const sourceCode = context.sourceCode;

    // Combine default and additional user input patterns
    const userInputPatterns = [
      ...DEFAULT_USER_INPUT_PATTERNS,
      ...compileUserPatterns(additionalUserInputPatterns as string[], 'i'),
    ];

    /** Any role check that dominates this node: a wrapping if/ternary, or a guard clause. */
    function isRoleChecked(node: TSESTree.Node): boolean {
      return (
        isInsideRoleCheck(node, roleCheckPatterns) || isAfterRoleGuard(node, roleCheckPatterns)
      );
    }

    /**
     * One binding hop: `const requestedRole = req.body.role; member.role = requestedRole;`
     *
     * Nothing validates the value between the two lines, so the escalation is
     * identical — but the assignment's right-hand side is a plain identifier,
     * and a text match over it sees no request. Resolving the binding recovers
     * the taint root the declaration already records.
     */
    function resolvesToUserInput(node: TSESTree.Node): boolean {
      if (node.type !== AST_NODE_TYPES.Identifier) {
        return false;
      }

      const scope = sourceCode.getScope(node);
      const reference = scope.references.find((ref) => ref.identifier === node);

      for (const def of reference?.resolved?.defs ?? []) {
        // Walk out to the declarator, so `const { role } = req.body` reaches
        // its initialiser exactly as `const role = req.body.role` does.
        let declarator: TSESTree.Node | undefined = def.name as TSESTree.Node;
        while (declarator && declarator.type !== AST_NODE_TYPES.VariableDeclarator) {
          declarator = declarator.parent;
        }

        if (
          declarator?.type === AST_NODE_TYPES.VariableDeclarator &&
          declarator.init &&
          containsUserInput(declarator.init, sourceCode, userInputPatterns)
        ) {
          return true;
        }
      }

      return false;
    }

    /** Is this value attacker-controlled, directly or through one binding? */
    function isUserControlled(node: TSESTree.Node): boolean {
      return (
        containsUserInput(node, sourceCode, userInputPatterns) || resolvesToUserInput(node)
      );
    }

    /**
     * Check AssignmentExpression for privilege escalation
     */
    function checkAssignmentExpression(node: TSESTree.AssignmentExpression) {
      if (isTestFile) {
        return;
      }

      // Check for role assignment from user input
      // Pattern: user.role = req.body.role
      if (node.left.type === 'MemberExpression') {
        const propertyName = assignedPropertyName(node.left)?.toLowerCase();

        // Check if it's a role/permission related property
        if (propertyName !== undefined && privilegeProps.has(propertyName)) {
          const text = sourceCode.getText(node);

          // Check if it matches any ignore pattern
          if (matchesIgnorePattern(text, ignorePatterns)) {
            return;
          }

          // Check if right side contains user input
          if (isUserControlled(node.right)) {
            // Check if it's inside a role check
            if (!isRoleChecked(node)) {
              context.report({
                node: node,
                messageId: 'privilegeEscalation',
                data: {
                  issue: `Role assignment from user input: ${sourceCode.getText(node.left)} = ${sourceCode.getText(node.right)}`,
                },
              });
            }
          }
        }
      }
    }

    /**
     * Check CallExpression for privilege operations with user input
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) {
        return;
      }

      // Check for privilege-related function calls with user input
      const callee = node.callee;
      let isPrivilegeOperation = false;
      let operationName = '';

      if (callee.type === 'Identifier') {
        if (isPrivilegeOperationCallee(callee.name)) {
          isPrivilegeOperation = true;
          operationName = callee.name;
        }
      }

      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        if (isPrivilegeOperationCallee(callee.property.name)) {
          isPrivilegeOperation = true;
          operationName = callee.property.name.toLowerCase();
        }
      }

      if (isPrivilegeOperation) {
        const text = sourceCode.getText(node);
        
        // Check if it matches any ignore pattern
        if (matchesIgnorePattern(text, ignorePatterns)) {
          return;
        }

        // Check if any argument contains user input
        for (const arg of node.arguments) {
          if (isUserControlled(arg)) {
            // Check if it's inside a role check
            if (!isRoleChecked(node)) {
              context.report({
                node: node,
                messageId: 'privilegeEscalation',
                data: {
                  issue: `Privilege operation (${operationName}) with user input without role validation`,
                },
              });
              return; // Report once per call
            }
          }
        }
      }
    }

    /**
     * Check ObjectExpression for role assignment in objects (e.g. arguments)
     */
    function checkObjectExpression(node: TSESTree.ObjectExpression) {
      if (isTestFile) return;

      for (const prop of node.properties) {
        if (prop.type === 'Property' && prop.key.type === 'Identifier') {
          const keyName = prop.key.name.toLowerCase();
          
          if (privilegeProps.has(keyName)) {
            const text = sourceCode.getText(prop);
            if (matchesIgnorePattern(text, ignorePatterns)) continue;

            if (isUserControlled(prop.value)) {
              if (!isRoleChecked(node)) {
                context.report({
                  node: prop,
                  messageId: 'privilegeEscalation',
                  data: {
                    issue: `Role assignment in object from user input: ${sourceCode.getText(prop)}`,
                  },
                });
              }
            }
          }
        }
      }
    }

    return {
      AssignmentExpression: checkAssignmentExpression,
      CallExpression: checkCallExpression,
      ObjectExpression: checkObjectExpression,
    };
  },
});
