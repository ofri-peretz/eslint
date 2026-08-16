/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import {
  TSESLint,
  AST_NODE_TYPES,
  TSESTree,
  formatLLMMessage,
  MessageIcons,
  isStaticExpression,
} from '@interlace/eslint-devkit';
import { NoUnsafeCopyFromOptions } from '../../types';
import { fileUsesPostgres } from '../../utils';

/**
 * Methods that hand a raw SQL string to the server.
 *
 * `query` alone was the whole sink list, and the rule's own suite pinned that
 * gap as correct behaviour: `client.execute("COPY users FROM /etc/passwd")` sat
 * in the VALID array. node-postgres accepts `execute`, so that fixture was
 * asserting a false negative.
 */
const SQL_SINK_METHODS: ReadonlySet<string> = new Set(['query', 'execute']);

/** SQL comments, stripped before a statement's verb is read. */
const SQL_COMMENTS = /--[^\n]*|\/\*[\s\S]*?\*\//g;

/** The quoted source of a `COPY … FROM 'path'`, when it is spelled out. */
const QUOTED_SOURCE = /from\s+['"]([^'"]+)['"]/i;

/** `FROM STDIN` — the streaming form, where the server opens no file at all. */
const FROM_STDIN = /^\s*stdin\b/i;

/** How many bindings deep to follow a value before giving up. */
const MAX_RESOLUTION_DEPTH = 4;

/** The literal text of a string expression, ignoring every interpolated value. */
function staticText(node: TSESTree.Node): string {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    // `cooked`, not `raw`: a template written with `\n` escapes has a
    // backslash in its raw text, and reading that made the statement's verb
    // unreadable on SQL the server sees as perfectly ordinary. TSESTree types
    // `cooked` as non-nullable and this parser never nulls it, so there is no
    // fallback branch here to leave untested.
    return node.quasis.map((q) => q.value.cooked).join('');
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return `${staticText(node.left as TSESTree.Node)}${staticText(node.right)}`;
  }
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') {
    return node.value;
  }
  return '';
}

/**
 * The source clause of a `COPY` statement, or `null` if this is not one.
 *
 * The old test was `/\bCOPY\b.*\bFROM\b/i`, which is wrong in both directions:
 *
 *   FALSE NEGATIVE  `.` does not cross a newline, so every multi-line COPY —
 *                   the way every migration and seed script writes it — was
 *                   invisible.
 *   FALSE POSITIVE  the two words in that order anywhere in any statement was
 *                   enough. `SELECT * FROM jobs WHERE kind = 'copy' AND owner_id
 *                   IN (SELECT id FROM users …)` was reported as a file read,
 *                   and so was `COPY (SELECT … FROM orders) TO '/srv/x.csv'`,
 *                   which writes rather than reads.
 *
 * COPY is a statement VERB, so it is read as one: the statement must start with
 * it, a parenthesised target (a column list, or a whole query) is skipped as a
 * balanced group, and the direction keyword that follows decides whether this
 * is a read (`FROM`) or a write (`TO`).
 */
function copySourceClause(text: string): string | null {
  const stripped = text.replace(SQL_COMMENTS, '');
  for (const statement of stripped.split(';')) {
    const head = /^\s*copy\b/i.exec(statement);
    if (head === null) continue;

    let index = head[0].length;
    // `COPY users (id, email) FROM …` and `COPY (SELECT … FROM t) TO …` both
    // put a balanced group between the verb and the direction keyword. Reading
    // the first `FROM` without skipping it mistakes a subquery for a source.
    while (index < statement.length && /\s/.test(statement[index])) index += 1;
    if (statement[index] === '(') {
      let depth = 0;
      for (; index < statement.length; index += 1) {
        if (statement[index] === '(') depth += 1;
        else if (statement[index] === ')') {
          depth -= 1;
          if (depth === 0) {
            index += 1;
            break;
          }
        }
      }
    }

    const direction = /\b(from|to)\b/i.exec(statement.slice(index));
    if (direction === null || direction[1].toLowerCase() !== 'from') continue;
    return statement.slice(index + direction.index + direction[1].length);
  }
  return null;
}

/** The variable a name resolves to, walking outward from `scope`. */
function resolveVariable(
  name: string,
  scope: TSESLint.Scope.Scope | null,
): TSESLint.Scope.Variable | null {
  for (let current = scope; current !== null; current = current.upper) {
    const variable = current.set.get(name);
    if (variable !== undefined) return variable;
  }
  return null;
}

/**
 * The function a callee name resolves to, when it is written in THIS file.
 *
 * An import binding deliberately resolves to nothing, which is what keeps
 * `client.query(copyFrom('COPY t FROM STDIN'))` — the pg-copy-streams
 * remediation — out of the analysis rather than judged on a body we cannot see.
 */
function functionImplementation(
  variable: TSESLint.Scope.Variable,
):
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression
  | null {
  const def = variable.defs.find((d) => d.type === 'FunctionName' || d.type === 'Variable');
  if (def === undefined) return null;
  if (def.type === 'FunctionName') {
    return def.node as TSESTree.FunctionDeclaration;
  }
  if (variable.references.filter((ref) => ref.isWrite()).length !== 1) return null;
  const init = (def.node as TSESTree.VariableDeclarator).init;
  if (
    init === null ||
    init === undefined ||
    (init.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
      init.type !== AST_NODE_TYPES.FunctionExpression)
  ) {
    return null;
  }
  return init;
}

/**
 * The string a function body evaluates to.
 *
 * Both spellings matter and only the concise arrow was ever read:
 *
 *   const copyStatement = (s) => `COPY events FROM '${s}' CSV`;
 *   function buildCopy(s) { return "COPY t FROM '" + s + "'"; }
 */
function returnedExpression(body: TSESTree.Node): TSESTree.Node | null {
  if (body.type === AST_NODE_TYPES.BlockStatement) {
    const [only] = body.body;
    if (body.body.length !== 1 || only.type !== AST_NODE_TYPES.ReturnStatement) {
      return null;
    }
    return only.argument === null ? null : returnedExpression(only.argument);
  }
  return body.type === AST_NODE_TYPES.TemplateLiteral ||
    body.type === AST_NODE_TYPES.BinaryExpression ||
    (body.type === AST_NODE_TYPES.Literal && typeof body.value === 'string')
    ? body
    : null;
}

/**
 * `String.raw` — the one tag that hands the template through unchanged.
 *
 * Tagged templates are unwrapped for this tag ONLY, and that restriction is
 * the whole point. `sql`…`` from postgres.js or slonik binds every
 * interpolation as a parameter, so unwrapping those would report the safest
 * client in the ecosystem; every other tag therefore stays unanalysed.
 * `String.raw` transforms nothing, so the string the server sees is the string
 * written in the source — and the adversarial wave found all three rules in
 * this package silent on it.
 */
function isStringRawTag(node: TSESTree.TaggedTemplateExpression): boolean {
  const { tag } = node;
  return (
    tag.type === AST_NODE_TYPES.MemberExpression &&
    !tag.computed &&
    tag.object.type === AST_NODE_TYPES.Identifier &&
    tag.object.name === 'String' &&
    tag.property.type === AST_NODE_TYPES.Identifier &&
    tag.property.name === 'raw'
  );
}

/** The initialiser of a binding written exactly once. */
function singleAssignedInit(variable: TSESLint.Scope.Variable): TSESTree.Node | null {
  if (variable.references.filter((ref) => ref.isWrite()).length !== 1) return null;
  const def = variable.defs.find((d) => d.type === 'Variable');
  if (def === undefined) return null;
  return (def.node as TSESTree.VariableDeclarator).init ?? null;
}

/**
 * The expression a sink argument really holds.
 *
 * `client.query(sqlQuery)` and `client.query(buildQuery())` were both filed
 * under "cannot verify statically" and skipped outright. When the binding is
 * written once and the builder is written here, they can both be verified —
 * and a repository layer that keeps its statement in a `const` is the ordinary
 * case, not the exotic one.
 */
function effectiveExpression(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope | null,
  depth = 0,
): TSESTree.Node {
  if (depth >= MAX_RESOLUTION_DEPTH) return node;

  if (node.type === AST_NODE_TYPES.TaggedTemplateExpression) {
    return isStringRawTag(node) ? node.quasi : node;
  }

  if (node.type === AST_NODE_TYPES.Identifier) {
    const variable = resolveVariable(node.name, scope);
    const init = variable === null ? null : singleAssignedInit(variable);
    return init === null ? node : effectiveExpression(init, scope, depth + 1);
  }

  if (node.type === AST_NODE_TYPES.CallExpression) {
    if (node.callee.type !== AST_NODE_TYPES.Identifier) return node;
    const fn = resolveVariable(node.callee.name, scope);
    const impl = fn === null ? null : functionImplementation(fn);
    if (impl === null) return node;
    const returned = returnedExpression(impl.body);
    return returned === null ? node : effectiveExpression(returned, scope, depth + 1);
  }

  return node;
}

/**
 * Is some interpolated value in this expression one the file cannot prove
 * constant?
 *
 * `const CSV = '/srv/seed.csv'` folds to a literal and is a hardcoded path, not
 * an injection — the two findings have different severities and different
 * fixes, so folding the value is what tells them apart.
 *
 * A CALL is raw. Unlike SQL injection, there is no escaping remediation for a
 * path: `path.join(IMPORT_DIR, name)` is still `/srv/imports/../../etc/passwd`
 * when the caller says so.
 */
function hasDynamicPart(node: TSESTree.Node, scope: TSESLint.Scope.Scope): boolean {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.expressions.some((part) => hasDynamicPart(part, scope));
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return (
      hasDynamicPart(node.left as TSESTree.Node, scope) || hasDynamicPart(node.right, scope)
    );
  }
  return !isStaticExpression({ node, scope });
}

type MessageIds = 'dynamicPath' | 'hardcodedPath' | 'unverifiablePath';

export const noUnsafeCopyFrom: TSESLint.RuleModule<MessageIds, NoUnsafeCopyFromOptions> = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent unsafe COPY FROM usage with dynamic file paths, which can lead to arbitrary file read/RCE.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/no-unsafe-copy-from.md',
      cwe: 'CWE-73',
      cvss: 9.5,
    },
    messages: {
      dynamicPath: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'COPY FROM Injection',
        description: 'Dynamic file path in COPY FROM detected - potential arbitrary file read.',
        severity: 'CRITICAL',
        cwe: 'CWE-73',
        owasp: 'A03:2021',
        compliance: ['SOC2', 'PCI-DSS'],
        effort: 'low',
        fix: 'Never use user input in COPY FROM paths. Use COPY FROM STDIN for user data.',
        documentationLink: 'https://www.postgresql.org/docs/current/sql-copy.html',
      }),
      hardcodedPath: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Server-side COPY FROM',
        description: 'Hardcoded file path in COPY FROM - server-side file access.',
        severity: 'MEDIUM',
        cwe: 'CWE-73',
        effort: 'low',
        fix: 'Prefer COPY FROM STDIN for application code. Use allowHardcodedPaths option if this is an admin script.',
        documentationLink: 'https://www.postgresql.org/docs/current/sql-copy.html',
      }),
      unverifiablePath: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unverifiable COPY FROM',
        description: 'Cannot statically verify COPY FROM source - potential injection risk.',
        severity: 'MEDIUM',
        cwe: 'CWE-73',
        effort: 'medium',
        fix: 'Ensure the query source does not contain user input, or refactor to use COPY FROM STDIN.',
        documentationLink: 'https://www.postgresql.org/docs/current/sql-copy.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowHardcodedPaths: {
            type: 'boolean',
            description: 'Allow hardcoded file paths (for admin/migration scripts)',
          },
          allowedPaths: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of allowed file path patterns (regex strings)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context) {
    // Every rule here is PostgreSQL-specific, and none of them knew it: over
    // 108,838 files, 94% of this plugin's findings were in files with no
    // PostgreSQL client at all. Registering no visitors is both the gate and
    // the cheap path — a file with no database in it does no work.
    if (!fileUsesPostgres(context.sourceCode.ast)) return {};

    const options = context.options[0] ?? {};
    const allowHardcodedPaths = options.allowHardcodedPaths ?? false;
    const allowedPaths = (options.allowedPaths ?? []).map((p: string) => new RegExp(p));

    const isPathAllowed = (filePath: string): boolean =>
      allowedPaths.some((pattern: RegExp) => pattern.test(filePath));

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          !SQL_SINK_METHODS.has(node.callee.property.name)
        ) {
          return;
        }

        const [queryArg] = node.arguments;
        if (queryArg === undefined || queryArg.type === AST_NODE_TYPES.SpreadElement) {
          return;
        }

        const scope = context.sourceCode.getScope(node);
        const expression = effectiveExpression(queryArg, scope);
        const source = copySourceClause(staticText(expression));
        if (source === null) return;

        // STDIN is the remediation: the bytes travel over the client
        // connection, so the server never opens a path. A dynamic TABLE name in
        // a STDIN copy is an identifier-injection problem owned by
        // `no-unsafe-query` — this rule owns the source, not the target.
        if (FROM_STDIN.test(source)) return;

        if (hasDynamicPart(expression, scope)) {
          context.report({ node: queryArg, messageId: 'dynamicPath' });
          return;
        }

        const filePath = QUOTED_SOURCE.exec(`from ${source}`);
        if (filePath !== null && isPathAllowed(filePath[1])) return;
        if (allowHardcodedPaths) return;

        context.report({ node: queryArg, messageId: 'hardcodedPath' });
      },
    };
  },
};
