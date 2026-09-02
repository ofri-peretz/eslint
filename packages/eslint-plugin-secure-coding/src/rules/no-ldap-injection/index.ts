/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-ldap-injection
 * Detects LDAP injection vulnerabilities (CWE-90)
 *
 * LDAP injection occurs when user input is improperly inserted into LDAP
 * queries, allowing attackers to:
 * - Bypass authentication and authorization
 * - Extract sensitive directory information
 * - Perform unauthorized LDAP operations
 * - Enumerate users through blind injection techniques
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe LDAP libraries with built-in escaping
 * - Input validation and sanitization functions
 * - JSDoc annotations (@ldap-safe, @escaped)
 * - Parameterized LDAP query construction
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createModuleEvidence, createRule, isStaticExpression, staticString, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'ldapInjection'
  | 'unsafeLdapFilter'
  | 'unescapedLdapInput'
  | 'dangerousLdapOperation'
  | 'validateLdapInput';

export interface Options extends SecurityRuleOptions {
  /** LDAP-related function names to check */
  ldapFunctions?: string[];

  /** Functions that safely escape LDAP input */
  ldapEscapeFunctions?: string[];

  /** Functions that validate LDAP input */
  ldapValidationFunctions?: string[];

  /**
   * Package specifiers whose import opens the file gate. REPLACES the built-in
   * list. Default: DEFAULT_LDAP_PACKAGES
   */
  ldapPackages?: string[];

  /** Extra LDAP client packages, ON TOP of the built-ins. Default: [] */
  additionalLdapPackages?: string[];

  /**
   * Identifiers that name a framework request object, matched as the ROOT of a
   * member chain. REPLACES the built-in list. Default: DEFAULT_REQUEST_ROOTS
   */
  requestRoots?: string[];

  /** Extra request-object root names, ON TOP of the built-ins. Default: [] */
  additionalRequestRoots?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if LDAP filter contains dangerous patterns.
 *
 * Extracted to module scope (from inside `create()`) for direct unit
 * testability — this function is pure and captures no closure state.
 */
export function containsDangerousLdapFilter(filterText: string): boolean {
  // Dangerous LDAP filter patterns
  const dangerousPatterns = [
    /\*\)$/, // Ending with *) to match everything
    /\|\)$/, // Ending with |) for OR operations
    /&\)$/, // Ending with &) for AND operations
    /!\)$/, // Ending with !) for NOT operations
    /\*\|\*/, // *|* pattern for matching everything
    /\*&\*/, // *&* pattern
    /\*!/, // NOT operations that could be exploited
  ];

  return dangerousPatterns.some((pattern) => pattern.test(filterText));
}

/**
 * Does the STATIC text of a string being built parse as LDAP filter grammar?
 *
 * RFC 4515 filters are `(attribute<op>value)`, so an opening parenthesis followed by
 * an attribute description and a comparison operator is the shape, and it is evidence
 * from the VALUE rather than from the variable's name.
 *
 * It replaces two predicates that were not evidence at all: `varName.includes('filter')
 * || includes('ldap') || includes('query') || includes('search') || includes('dn') ||
 * includes('bind')`, which decided by spelling, and `text.includes('(') &&
 * text.includes(')')`, which every TypeScript generic, every function call and every
 * glob in the ecosystem satisfies — it is what made two `Shopify/cli` template literals
 * and one `expressjs/morgan` header lookup into CWE-90 findings.
 */
export function looksLikeLdapFilterGrammar(staticText: string): boolean {
  return /\(\s*[A-Za-z][\w.;-]*\s*(?:[:~<>]?=)/.test(staticText);
}

/**
 * ---------------------------------------------------------------------------
 * THE GATE: an LDAP client has to be loaded.
 * ---------------------------------------------------------------------------
 * CWE-90 requires an LDAP directory to inject into. Nothing this rule looks at
 * — a parenthesis, a variable whose name begins with `input`, a `${}` — is
 * evidence of one; every predicate here is a *shape* heuristic that assumes the
 * LDAP context has already been established. So establish it the way the SQL
 * rules do, from the driver the file loads.
 *
 * Measured cost of not doing so, on repositories with no LDAP anywhere:
 *   - Shopify/cli `packages/app/.../type-generation.ts:599` and
 *     `packages/theme/src/cli/services/package.ts:28` — two TypeScript/zip-glob
 *     template literals reported as LDAP filters. The predicates at fault:
 *     `varName.startsWith('input')` (`inputTypeName`, `inputDirectory`) plus
 *     "the printed text contains `(` and `)`".
 *   - expressjs/morgan `var header = req.headers[field.toLowerCase()]` — an
 *     HTTP logger, matched because the text contains `req.` and the parentheses
 *     of `toLowerCase()` satisfied the filter guard.
 *
 * A previous version of this gate also accepted "the file calls a method named
 * `search`/`bind`/`add`/`delete`". That is not evidence either: `type-generation.ts`
 * opens it with `intentKeys.add(intentKey)` on a `Set`. Only a module load counts
 * now, through the shared devkit probe, so `import`, `require()`, dynamic
 * `import()`, `import =` and Deno specifiers all open it or none do.
 *
 * The cost is the FN it admits: a filter-building helper in a file whose LDAP
 * client is imported elsewhere goes unreported. That is the same trade
 * `no-sql-injection` makes for its drivers, and it is the right one — the
 * alternative is a CWE-90 finding on every repository that has never spoken
 * LDAP in its life.
 */
/**
 * The LDAP client packages, shared by the file gate and by local-binding
 * resolution.
 *
 * This list is the whole of the file gate: a repository whose LDAP client is a
 * house wrapper around ldapjs imports a specifier that appears on no npm list,
 * so EVERY finding in that repository is suppressed and there is no signal that
 * anything was skipped. `additionalLdapPackages` is that repository's remedy.
 */
const DEFAULT_LDAP_PACKAGES = [
  'ldapjs',
  'ldapts',
  'ldapauth-fork',
  'passport-ldapauth',
  'ldap-authentication',
  'ldap-escape',
  'ldap-filter',
  'activedirectory',
  'activedirectory2',
  'node-ldap',
];

const LDAP_SCOPES = new Set(['@ldapjs']);

/**
 * The methods whose SECOND argument is a filter (or a search-options object carrying
 * one). Every other LDAP method takes something else there: `bind` a password, `add`
 * an entry, `modify` a change, `compare` an attribute name. Treating argument 1 as a
 * filter for all of them reported `client.bind(dn, password, cb)` — the canonical
 * ldapjs authentication call, straight out of its README — as an LDAP injection.
 *
 * @protocol-constant Not a vocabulary — the ldapjs/ldapts CALL SIGNATURE. Which
 * parameter slot holds a filter is a fact about the API, and a user who could
 * edit this set could re-assert "argument 1 of `bind` is a filter", which is the
 * exact measured false positive the set exists to close.
 *
 * It costs nothing either, because extension is already handled soundly
 * elsewhere: a method added through `ldapFunctions` falls through to
 * `checkConstructedFilter`, which judges argument 1 on its own filter grammar
 * rather than assuming the slot. See the CallExpression visitor.
 */
const SEARCH_METHODS = new Set(['search', 'searchAsync', 'searchPaginated']);

/**
 * Framework request objects, matched as the ROOT IDENTIFIER of a member chain.
 * Exact membership against a closed set, not a substring of the printed expression.
 *
 * Four naming conventions, not an API: a Lambda handler's request object is
 * `event`, a Hapi handler's is `request` (covered) and a house middleware may
 * pass anything at all. Extending is the coverage remedy; replacing is the
 * remedy for a codebase where `ctx` is an ordinary domain context.
 */
const DEFAULT_REQUEST_ROOTS = ['req', 'request', 'ctx', 'httpRequest'];

const DEFAULT_LDAP_FUNCTIONS = [
  'search',
  'searchAsync',
  'searchPaginated',
  'bind',
  'modify',
  'modifyDN',
  'add',
  // ldapjs spells delete `del`; omitting it meant `client.del(taintedDn, cb)` — DN
  // injection on the destructive operation — was never even looked at.
  'del',
  'delete',
  'compare',
];

const DEFAULT_ESCAPE_FUNCTIONS = [
  'escape.filterValue',
  'escape.dnValue',
  'filterValue',
  'dnValue',
  'filterEscape',
  'dnEscape',
];

const DEFAULT_VALIDATION_FUNCTIONS = [
  'validateLdapInput',
  'sanitizeLdapFilter',
  'cleanLdapValue',
  'checkLdapFilter',
];





export const noLdapInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-ldap-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-ldap-injection.md',
      description: 'Detects LDAP injection vulnerabilities',
      cwe: 'CWE-90',
    },
    messages: {
      ldapInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'LDAP Injection',
        cwe: 'CWE-90',
        description: 'LDAP injection vulnerability detected',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/90.html',
      }),
      unsafeLdapFilter: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe LDAP Filter',
        cwe: 'CWE-90',
        description: 'LDAP filter constructed with unsafe string operations',
        severity: 'HIGH',
        fix: 'Use ldap.escape.filterValue() to escape user input',
        documentationLink: 'https://ldap.com/ldap-filters/',
      }),
      unescapedLdapInput: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unescaped LDAP Input',
        cwe: 'CWE-90',
        description: 'LDAP operation uses unescaped user input',
        severity: 'MEDIUM',
        fix: 'Escape all user input before LDAP operations',
        documentationLink: 'https://cwe.mitre.org/data/definitions/90.html',
      }),
      dangerousLdapOperation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous LDAP Operation',
        cwe: 'CWE-90',
        description: 'LDAP operation allows dangerous filter patterns',
        severity: 'HIGH',
        fix: 'Validate LDAP filters and restrict allowed operations',
        documentationLink: 'https://ldap.com/ldap-filters/',
      }),

      validateLdapInput: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate LDAP Input',
        description: 'Validate LDAP input before processing',
        severity: 'LOW',
        fix: 'Validate input against allowed patterns',
        documentationLink: 'https://cwe.mitre.org/data/definitions/90.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ldapFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_LDAP_FUNCTIONS,
            description: 'LDAP client methods treated as query sinks',
          },
          ldapEscapeFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_ESCAPE_FUNCTIONS,
            description: 'Function names that escape LDAP filter or DN values',
          },
          ldapValidationFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_VALIDATION_FUNCTIONS,
            description: 'Function names that count as LDAP input validation',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional function names to consider as LDAP sanitizers',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional JSDoc annotations to consider as safe markers',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
          ldapPackages: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_LDAP_PACKAGES,
            description:
              'Package specifiers whose import opens the file gate. Nothing in a file is examined unless one of these is loaded. Replaces the built-in list.',
          },
          additionalLdapPackages: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Extra LDAP client packages, on top of `ldapPackages` — a house wrapper around ldapjs belongs here.',
          },
          requestRoots: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_REQUEST_ROOTS,
            description:
              'Identifiers naming a framework request object, matched as the exact ROOT of a member chain — never as a substring of the printed expression. Replaces the built-in list.',
          },
          additionalRequestRoots: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra request-object root names, on top of `requestRoots`.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ldapFunctions: DEFAULT_LDAP_FUNCTIONS,
      ldapEscapeFunctions: DEFAULT_ESCAPE_FUNCTIONS,
      ldapValidationFunctions: DEFAULT_VALIDATION_FUNCTIONS,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
      ldapPackages: DEFAULT_LDAP_PACKAGES,
      additionalLdapPackages: [],
      requestRoots: DEFAULT_REQUEST_ROOTS,
      additionalRequestRoots: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      ldapFunctions = DEFAULT_LDAP_FUNCTIONS,
      ldapEscapeFunctions = DEFAULT_ESCAPE_FUNCTIONS,
      ldapValidationFunctions = DEFAULT_VALIDATION_FUNCTIONS,
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
      ldapPackages = DEFAULT_LDAP_PACKAGES,
      additionalLdapPackages = [],
      requestRoots = DEFAULT_REQUEST_ROOTS,
      additionalRequestRoots = [],
    }: Options = options;

    const ldapPackageSet = new Set([...ldapPackages, ...additionalLdapPackages]);
    const requestRootSet = new Set([...requestRoots, ...additionalRequestRoots]);
    // Built per run rather than at module scope, because the package list is now
    // an option. The devkit probe is a closure over the specifier set, so it has
    // to be constructed after the options are read.
    const fileImportsLdapClient = createModuleEvidence({
      packages: [...ldapPackageSet],
      scopes: [...LDAP_SCOPES],
    });

    const sourceCode = context.sourceCode;
    const filename = context.filename;

    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    /**
     * Local names bound to an LDAP module in THIS file.
     *
     * The file gate proves an LDAP client is loaded somewhere in the file; it does not
     * prove the receiver of `x.add(a, b)` is that client. `intentKeys.add(k)` on a Set
     * and `entryCache.delete(k)` on a Map wear the same method names, and treating them
     * as LDAP operations is exactly how this rule reported an LDAP filter inside
     * Shopify's CLI. Collecting the imported locals lets the receiver be resolved to a
     * construction call made from one of them, which a `new Set()` can never satisfy.
     */
    const ldapLocals = new Set<string>();

    /** Whether this file loads an LDAP client at all. Set from Program, visited first. */
    let ldapInFile = false;

    const collectLdapLocals = (program: TSESTree.Program): void => {
      const record = (node: TSESTree.Node | null | undefined): void => {
        if (node?.type === 'Identifier') ldapLocals.add(node.name);
        else if (node?.type === 'ObjectPattern') {
          for (const property of node.properties) {
            if (property.type === 'Property') record(property.value);
          }
        }
      };
      const isLdapSource = (raw: unknown): boolean =>
        typeof raw === 'string' &&
        (ldapPackageSet.has(raw) || [...LDAP_SCOPES].some((scope) => raw.startsWith(`${scope}/`)));

      for (const statement of program.body) {
        if (statement.type === 'ImportDeclaration' && isLdapSource(statement.source.value)) {
          for (const specifier of statement.specifiers) record(specifier.local);
        }
        if (statement.type === 'VariableDeclaration') {
          for (const declarator of statement.declarations) {
            const init = declarator.init;
            if (
              init?.type === 'CallExpression' &&
              init.callee.type === 'Identifier' &&
              init.callee.name === 'require' &&
              init.arguments[0]?.type === 'Literal' &&
              isLdapSource(init.arguments[0].value)
            ) {
              record(declarator.id);
            }
          }
        }
      }
    };

    /** Unwrap TypeScript-only syntax that changes nothing at runtime. */
    const unwrap = (node: TSESTree.Node): TSESTree.Node => {
      let current = node;
      while (
        current.type === 'TSAsExpression' ||
        current.type === 'TSSatisfiesExpression' ||
        current.type === 'TSNonNullExpression' ||
        current.type === 'ChainExpression'
      ) {
        current = current.expression;
      }
      return current;
    };

    /** Every expression ever written to a binding, resolved through the scope. */
    const writesOf = (identifier: TSESTree.Identifier): TSESTree.Expression[] => {
      for (
        let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.variables.find((v) => v.name === identifier.name);
        if (!variable) continue;
        return variable.references
          .filter((ref) => ref.isWrite() && ref.writeExpr)
          .map((ref) => ref.writeExpr as TSESTree.Expression);
      }
      return [];
    };

    /** The single value a binding provably holds, or undefined if it is written more than once. */
    const soleWriteOf = (identifier: TSESTree.Identifier): TSESTree.Expression | undefined => {
      const writes = writesOf(identifier);
      return writes.length === 1 ? writes[0] : undefined;
    };

    /**
     * Is this expression a construction of an LDAP client, made from a binding this file
     * imported from an LDAP package? `ldap.createClient({…})`, `new Client({…})`.
     */
    const isLdapConstruction = (node: TSESTree.Node): boolean => {
      const expression = unwrap(node);
      if (expression.type === 'NewExpression') {
        const { callee } = expression;
        if (callee.type === 'Identifier') return ldapLocals.has(callee.name);
        return (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          ldapLocals.has(callee.object.name)
        );
      }
      if (expression.type !== 'CallExpression') return false;
      const { callee } = expression;
      if (callee.type === 'Identifier') return ldapLocals.has(callee.name);
      return (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        ldapLocals.has(callee.object.name)
      );
    };

    /** The class body enclosing a node, if any. */
    // oxlint-disable-next-line consistent-function-scoping
    const enclosingClassBody = (node: TSESTree.Node): TSESTree.ClassBody | undefined => {
      for (let current: TSESTree.Node | undefined = node; current; current = current.parent) {
        if (current.type === 'ClassBody') return current;
      }
      return undefined;
    };

    /**
     * Does the receiver of this method call provably resolve to something that is NOT
     * an LDAP client?
     *
     * `add`, `delete`, `search` and `compare` are also Set, Map and Array methods, and
     * a file that imports ldapjs still uses collections. `intentKeys.add(intentKey)` on
     * a `Set` is how this rule reported an LDAP filter inside Shopify's CLI.
     *
     * The test is NEGATIVE on purpose. Demanding positive proof that the receiver was
     * constructed from an LDAP import would silence every client that arrives as a
     * parameter, an injected dependency or an undeclared module global — the common
     * case. Skipping only when the binding is provably a collection, an array or a
     * literal keeps that recall and still removes the false positive, because a value
     * built by `new Set()` is known, not guessed.
     */
    const isProvablyNotLdapReceiver = (receiver: TSESTree.Node): boolean => {
      const expression = unwrap(receiver);

      if (
        expression.type === 'ArrayExpression' ||
        expression.type === 'ObjectExpression' ||
        expression.type === 'Literal'
      ) {
        return true;
      }

      if (expression.type === 'NewExpression' || expression.type === 'CallExpression') {
        return !isLdapConstruction(expression);
      }

      if (expression.type === 'Identifier') {
        const writes = writesOf(expression);
        if (writes.length === 0) return false;
        // Any write that constructs an LDAP client is enough to keep looking.
        if (writes.some(isLdapConstruction)) return false;
        return writes.every((write) => {
          const value = unwrap(write);
          return (
            // A call or a `new` that is not an LDAP construction — the same test the
            // direct-receiver arm above applies, so `const q = makeQueue()` and
            // `makeQueue().add(…)` agree.
            value.type === 'NewExpression' ||
            value.type === 'CallExpression' ||
            value.type === 'ArrayExpression' ||
            value.type === 'ObjectExpression' ||
            value.type === 'Literal'
          );
        });
      }

      // `this.client` — read the class field's initializer, when the class declares one.
      if (
        expression.type === 'MemberExpression' &&
        expression.object.type === 'ThisExpression' &&
        propertyName(expression) !== null
      ) {
        // `this['baseDN']` names the same field `this.baseDN` names.
        const fieldName = propertyName(expression) as string;
        const body = enclosingClassBody(expression);
        if (!body) return false;
        const field = body.body.find(
          (member) =>
            member.type === 'PropertyDefinition' &&
            !member.computed &&
            member.key.type === 'Identifier' &&
            member.key.name === fieldName,
        ) as TSESTree.PropertyDefinition | undefined;
        if (!field?.value) return false;
        return !isLdapConstruction(field.value);
      }

      return false;
    };

    /**
     * Is this expression handed to a function that escapes or validates LDAP input?
     *
     * Looked for in two directions: UP the parent chain, for
     * `` `(uid=${ldap.escape.filterValue(x)})` ``, and back through the BINDING, for
     * `const escaped = ldapEscape(x); … `(uid=${escaped})``. Escaping one statement
     * earlier is the commoner spelling, and reading only the parent chain missed it.
     */
    const isEscaped = (node: TSESTree.Node): boolean => {
      const expression = unwrap(node);
      if (expression.type === 'Identifier') {
        const write = soleWriteOf(expression);
        if (write && write !== expression && isEscapedAt(write)) return true;
      }
      return isEscapedAt(node);
    };

    function isEscapedAt(node: TSESTree.Node): boolean {
      for (let current: TSESTree.Node | undefined = node; current; current = current.parent) {
        if (current.type !== 'CallExpression') continue;
        const { callee } = current;
        if (callee.type === 'MemberExpression' && propertyName(callee) !== null) {
          // `esc['filterValue'](x)` escapes exactly as `esc.filterValue(x)` does.
          const escapeMethod = propertyName(callee) as string;
          // Exact membership against the configured escape functions, matching either
          // the bare name (`filterEscape`) or the tail of a dotted path
          // (`escape.filterValue` -> `filterValue`). The previous test was
          // `escapeMethod.includes('escape')`, a substring match in a SUPPRESSION path:
          // any method whose name merely contained "escape" cleared the value.
          if (
            ldapEscapeFunctions.some(
              (escapeFunc) =>
                escapeFunc === escapeMethod || escapeFunc.endsWith(`.${escapeMethod}`),
            )
          ) {
            return true;
          }
        }
        if (
          callee.type === 'Identifier' &&
          (ldapValidationFunctions.includes(callee.name) || ldapEscapeFunctions.includes(callee.name))
        ) {
          return true;
        }
      }
      return false;
    }

    const isStatic = (node: TSESTree.Node): boolean =>
      isStaticExpression({ node, scope: sourceCode.getScope(node) });

    /**
     * The attacker-influencable parts of a STRING-CONSTRUCTION expression.
     *
     * `null` means "this is not a string being built" — an options object, a
     * `new EqualityFilter({…})`, a lookup into a frozen table. Those are not filter
     * grammar and must not be reported. `[]` means the string is built entirely from
     * values written in this file. A non-empty array is the injection.
     *
     * This replaces two heuristics that decided by spelling: a list of variable-name
     * substrings (`user`, `input`, `id`, `dn`, `name`, `term`…) for "is it tainted",
     * and `text.includes('(') && text.includes(')')` for "is it a filter". The first
     * missed every renamed variable and the second made DN injection undetectable by
     * construction, because a distinguished name contains no parentheses.
     */
    const dynamicParts = (
      node: TSESTree.Node,
      seen: Set<TSESTree.Node> = new Set(),
    ): TSESTree.Node[] | null => {
      const expression = unwrap(node);
      if (seen.has(expression)) return null;
      seen.add(expression);

      if (expression.type === 'TemplateLiteral') {
        return expression.expressions.filter((part) => !isStatic(part) && !isEscaped(part));
      }

      if (expression.type === 'BinaryExpression' && expression.operator === '+') {
        const leaves: TSESTree.Node[] = [];
        const flatten = (n: TSESTree.Node): void => {
          const inner = unwrap(n);
          if (inner.type === 'BinaryExpression' && inner.operator === '+') {
            flatten(inner.left);
            flatten(inner.right);
          } else leaves.push(inner);
        };
        flatten(expression);
        // Concatenation of numbers is not a filter. Require at least one string part,
        // which is what makes the result a string at all.
        const hasStringPart = leaves.some(
          (leaf) =>
            (staticString(leaf) !== null) ||
            leaf.type === 'TemplateLiteral',
        );
        if (!hasStringPart) return null;
        return leaves.filter((leaf) => !isStatic(leaf) && !isEscaped(leaf));
      }

      if (expression.type === 'ConditionalExpression') {
        const consequent = dynamicParts(expression.consequent, seen);
        const alternate = dynamicParts(expression.alternate, seen);
        if (consequent === null && alternate === null) return null;
        return [...(consequent ?? []), ...(alternate ?? [])];
      }

      if (expression.type === 'Identifier') {
        const write = soleWriteOf(expression);
        return write ? dynamicParts(write, seen) : null;
      }

      return null;
    };

    /**
     * Is this expression the request itself, handed over whole?
     *
     * `{ filter: req.query.filter }` builds no string, so `dynamicParts` says nothing
     * about it, yet the whole filter is attacker-supplied. Restricted to NON-COMPUTED
     * member chains: `LOOKUP[req.params.x]` is a computed read out of a table this file
     * declares, and its value is whatever the table holds, not what the request said.
     */
    const isRequestValue = (node: TSESTree.Node, seen: Set<TSESTree.Node> = new Set()): boolean => {
      const expression = unwrap(node);
      // `var a = b; var b = a;` resolves forever without this — a stack overflow that
      // takes the whole ESLint run down, not just the rule. Found by the structural
      // coverage cases below, which is why they are there.
      if (seen.has(expression)) return false;
      seen.add(expression);
      if (expression.type === 'Identifier') {
        const write = soleWriteOf(expression);
        return write ? isRequestValue(write, seen) : false;
      }
      // `search(base, normalise(req.query.q))` — passing request data through a helper
      // does not launder it. An escaping or validating call is exempt by `isEscaped`,
      // and a project's own sanitizer by `trustedSanitizers`.
      if (expression.type === 'CallExpression') {
        if (isEscaped(expression)) return false;
        return expression.arguments.some(
          (argument) => argument.type !== 'SpreadElement' && isRequestValue(argument, seen),
        );
      }
      if (expression.type !== 'MemberExpression' || expression.computed) return false;
      return !isStatic(expression) && isUntrustedRequestChain(expression);
    };

    /**
     * The root of a member chain is a request object supplied by the framework.
     * Matched on the ROOT IDENTIFIER only, against a closed set — not on the printed
     * text of the whole expression, which used to make any chain containing the
     * substring `req.` untrusted.
     */
    function isUntrustedRequestChain(node: TSESTree.MemberExpression): boolean {
      let current: TSESTree.Node = node;
      while (current.type === 'MemberExpression') current = current.object;
      if (current.type !== 'Identifier') return false;
      if (requestRootSet.has(current.name)) return true;
      // `const { query } = req; … query.filter` — the root was destructured out of a
      // request one statement earlier. Resolved through the SCOPE; a bare, undeclared
      // `query.filter` proves nothing and stays unreported.
      for (
        let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(current);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.variables.find((v) => v.name === (current as TSESTree.Identifier).name);
        if (!variable) continue;
        return variable.defs.some((def) => {
          if (def.type !== 'Variable') return false;
          const init = def.node.init ? unwrap(def.node.init) : undefined;
          if (!init) return false;
          if (init.type === 'Identifier') return requestRootSet.has(init.name);
          return init.type === 'MemberExpression' && isUntrustedRequestChain(init);
        });
      }
      return false;
    }

    /** The value of an options object's `filter` property, following one binding hop. */
    const filterOption = (node: TSESTree.Node): TSESTree.Node | undefined => {
      let expression = unwrap(node);
      if (expression.type === 'Identifier') {
        const write = soleWriteOf(expression);
        if (!write) return undefined;
        expression = unwrap(write);
      }
      if (expression.type !== 'ObjectExpression') return undefined;
      for (const property of expression.properties) {
        if (property.type !== 'Property') continue;
        const { key } = property;
        if (!property.computed && key.type === 'Identifier' && key.name === 'filter') {
          return property.value;
        }
        if (key.type === 'Literal' && key.value === 'filter') return property.value;
        // `{ [FILTER_KEY]: … }` — resolve the key through its binding.
        if (property.computed && key.type === 'Identifier') {
          const keyWrite = soleWriteOf(key);
          if (keyWrite && unwrap(keyWrite).type === 'Literal') {
            const literal = unwrap(keyWrite) as TSESTree.Literal;
            if (literal.value === 'filter') return property.value;
          }
        }
      }
      return undefined;
    };

    /**
     * One node, one report. A filter is commonly built into a variable and then handed
     * to `search()`, and both sites resolve to the SAME construction node - without
     * this, one vulnerability is reported twice at the same location.
     */
    const reported = new Set<TSESTree.Node>();

    const report = (
      node: TSESTree.Node,
      messageId: MessageIds,
      data: Record<string, string>,
    ): void => {
      if (reported.has(node)) return;
      if (safetyChecker.isSafe(node, context)) return;
      reported.add(node);
      context.report({
        node,
        messageId,
        data: { filePath: filename, line: String(node.loc.start.line), ...data },
      });
    };

    /**
     * The parts of a string-construction expression that are written in this file:
     * template quasis and string literals, with the interpolations left out. This is
     * the text whose grammar is checked - never the printed source of the whole
     * expression, which drags the interpolated variable NAMES into the match.
     */
    const staticSkeleton = (node: TSESTree.Node, seen: Set<TSESTree.Node> = new Set()): string => {
      const expression = unwrap(node);
      if (seen.has(expression)) return '';
      seen.add(expression);
      if (expression.type === 'Literal') {
        return typeof expression.value === 'string' ? expression.value : '';
      }
      if (expression.type === 'TemplateLiteral') {
        return expression.quasis.map((quasi) => quasi.value.raw).join('\u0000');
      }
      if (expression.type === 'BinaryExpression' && expression.operator === '+') {
        return staticSkeleton(expression.left, seen) + '\u0000' + staticSkeleton(expression.right, seen);
      }
      if (expression.type === 'ConditionalExpression') {
        return staticSkeleton(expression.consequent, seen) + '\u0000' + staticSkeleton(expression.alternate, seen);
      }
      if (expression.type === 'Identifier') {
        const write = soleWriteOf(expression);
        return write ? staticSkeleton(write, seen) : '';
      }
      return '';
    };

    /**
     * Follow an identifier to the expression it was bound from, so the report lands on
     * the construction rather than on the name. Without this the same vulnerability is
     * reported twice — once at `const filter = …` and once at `search(base, filter)` —
     * because the two sites are different nodes holding the same value.
     */
    const originOf = (node: TSESTree.Node): TSESTree.Node => {
      let current = unwrap(node);
      for (let hops = 0; current.type === 'Identifier' && hops < 8; hops += 1) {
        const write = soleWriteOf(current);
        if (!write) break;
        current = unwrap(write);
      }
      return current;
    };

    /** A filter expression: report the injection, or the dangerous hardcoded filter. */
    const checkFilter = (rawFilterNode: TSESTree.Node): void => {
      const filterNode = originOf(rawFilterNode);
      const parts = dynamicParts(filterNode);
      if (parts && parts.length > 0) {
        report(filterNode, 'unsafeLdapFilter', {});
        return;
      }
      if (isRequestValue(filterNode)) {
        report(filterNode, 'unescapedLdapInput', {});
        return;
      }
      // A hardcoded filter that matches everything. Checked on the STATIC text of the
      // construction, so a template literal whose interpolations all fold to constants
      // is examined the same way a plain string literal is.
      if (containsDangerousLdapFilter(staticSkeleton(filterNode).split('\u0000').join(''))) {
        report(filterNode, 'dangerousLdapOperation', {});
      }
    };

    /** A distinguished-name argument: a DN has no parentheses, so shape is all there is. */
    const checkDn = (rawDnNode: TSESTree.Node): void => {
      const dnNode = originOf(rawDnNode);
      const parts = dynamicParts(dnNode);
      if (parts && parts.length > 0) {
        report(dnNode, 'ldapInjection', {
          severity: 'HIGH',
          safeAlternative: 'Use ldap.escape.dnValue() or build the DN from validated components',
        });
        return;
      }
      if (isRequestValue(dnNode)) {
        report(dnNode, 'ldapInjection', {
          severity: 'MEDIUM',
          safeAlternative: 'Use proper LDAP escaping and validation',
        });
      }
    };

    /** A string whose own literal text is LDAP filter grammar, built from dynamic parts. */
    const checkConstructedFilter = (node: TSESTree.Node): void => {
      if (!looksLikeLdapFilterGrammar(staticSkeleton(node))) return;
      checkFilter(node);
    };

    return {
      Program(program: TSESTree.Program) {
        ldapInFile = fileImportsLdapClient(program);
        if (ldapInFile) collectLdapLocals(program);
      },

      /**
       * A filter built at its declaration, before it ever reaches a client method.
       * Gated on the value's own grammar, so it fires on `const spec =
       * `(uid=${criterion})`` and stays silent on every other template literal in the
       * file regardless of what the variable is called.
       */
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!ldapInFile || !node.init) return;
        checkConstructedFilter(node.init);
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (!ldapInFile) return;
        checkConstructedFilter(node.right);
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (!ldapInFile) return;
        const callee = unwrap(node.callee);
        if (callee.type !== 'MemberExpression' || callee.computed) return;
        // A non-computed member's property is always an Identifier or a PrivateIdentifier.
        if (callee.property.type !== 'Identifier') return;
        const method = callee.property.name;
        if (!ldapFunctions.includes(method)) return;
        if (isProvablyNotLdapReceiver(callee.object)) return;

        const args = node.arguments.filter(
          (argument): argument is TSESTree.Expression => argument.type !== 'SpreadElement',
        );
        if (args.length === 0) return;

        // Argument 0 is the base DN (or the entry DN) for every method on the list.
        checkDn(args[0]);

        // Argument 1 is a FILTER only for the search family. It is the bind PASSWORD,
        // the add ENTRY, the modify CHANGE and the compare ATTRIBUTE for the others —
        // none of them filter grammar, and reporting them made the canonical
        // `client.bind(dn, password, cb)` a CWE-90 finding.
        if (args.length < 2) return;
        if (SEARCH_METHODS.has(method)) {
          const optionsFilter = filterOption(args[1]);
          checkFilter(optionsFilter ?? args[1]);
          return;
        }
        // A method the caller added through `ldapFunctions`, or one whose argument 1 is
        // an entry / a change / a password. Only its own grammar can make it a filter.
        checkConstructedFilter(args[1]);
      },
    };
  },
});
