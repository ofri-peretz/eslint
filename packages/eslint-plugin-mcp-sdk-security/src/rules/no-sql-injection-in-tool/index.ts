/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow an MCP tool argument reaching the text of a SQL query
 * @description Database MCP servers are among the most installed, and the most
 * common defect in them is the oldest one: the tool argument is spliced into
 * the query text. Through MCP the "user" typing the payload is a model that
 * can be steered by any document it read.
 *
 *     server.registerTool('find_user', { inputSchema: { name: z.string() } },
 *       async ({ name }) => pool.query(`SELECT * FROM users WHERE name = '${name}'`));
 *
 * ## What is reported
 *
 * A tool argument (or resource-template variable) reaching the SQL TEXT — the
 * first argument, or the `text` / `sql` field of a query-config object — of a
 * database driver call. The driver is resolved from the receiver's
 * construction, never from a method name: `pool.query` is a sink only when
 * `pool` was built by `pg`'s `Pool`/`Client` (here or in a relative module,
 * or derived through `pool.connect()`), `db.exec` only when `db` came from
 * `better-sqlite3`, `sqlite3`, `node:sqlite`, `sqlite` or `duckdb`, and so on.
 * Covered: `pg`, `mysql` / `mysql2`, `better-sqlite3`, `sqlite3`, `sqlite` /
 * `node:sqlite`, `postgres` (`sql.unsafe`), `@neondatabase/serverless`,
 * `@vercel/postgres`, `mssql`, `@libsql/client` and `duckdb`.
 *
 * A parameterised call — `pool.query('… WHERE name = $1', [name])` — puts the
 * argument in the VALUES array, which is not text, and is silent. Tagged
 * templates (`` sql`… ${name}` ``) are parameterised by those libraries and are
 * not calls this rule inspects. A value passed through an escaping call
 * (`mysql.escape(name)`, `format('%L', name)`) is not followed.
 *
 * This also closes residual 3 of the 2026-10 audit: `db.exec(sql)` with a tool
 * argument was silent in `no-command-injection-in-tool` because it is SQL
 * injection, not a process sink. It is reported here, with the right CWE.
 *
 * ## Overlap
 *
 * `secure-coding/no-sql-injection`, `pg/no-unsafe-query`,
 * `mysql-security/no-unsafe-query` and `sqlite-security/no-unsafe-query`
 * report built query text wherever it appears. Inside an MCP tool handler the
 * source is the handler's own parameter, so this rule owns the finding there
 * and also reports the argument passed whole as the query (owner decision,
 * 2026-10: tool handlers are this plugin's scope). Both may report one line.
 *
 * @see https://owasp.org/www-community/attacks/SQL_Injection
 */
import {
  TSESTree,
  TSESLint,
  createRule,
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';
import {
  createInstanceResolver,
  type Construction,
} from '../../utils/instances';
import { fileUsesMcpSdk } from '../../utils/mcp-evidence';
import { valueResolverFor } from '../../utils/module-resolver';
import { createHandlerCollector } from '../../utils/tool-handlers';
import { createFlow } from '../../utils/value-flow';

type MessageIds = 'toolArgToSql';

interface Driver {
  /** Exports that construct a connection, pool or client (`''` = the default export). */
  builds: ReadonlySet<string>;
  /** Methods on that instance whose first argument is SQL text. */
  sinks: ReadonlySet<string>;
}

const MYSQL: Driver = {
  builds: new Set(['createConnection', 'createPool', 'createPoolCluster']),
  sinks: new Set(['query', 'execute']),
};
const SQLITE_SINKS = new Set(['run', 'get', 'all', 'each', 'exec', 'prepare']);

/**
 * Database drivers, keyed by module. `node:sqlite` normalises to `sqlite`,
 * which is also the `sqlite` package — one entry holds both.
 */
export const DRIVERS: Readonly<Record<string, Driver>> = {
  pg: { builds: new Set(['Pool', 'Client']), sinks: new Set(['query']) },
  mysql: MYSQL,
  mysql2: MYSQL,
  'mysql2/promise': MYSQL,
  'better-sqlite3': {
    builds: new Set(['']),
    sinks: new Set(['prepare', 'exec']),
  },
  sqlite3: { builds: new Set(['Database']), sinks: SQLITE_SINKS },
  sqlite: { builds: new Set(['open', 'DatabaseSync']), sinks: SQLITE_SINKS },
  duckdb: { builds: new Set(['Database']), sinks: SQLITE_SINKS },
  postgres: { builds: new Set(['']), sinks: new Set(['unsafe']) },
  '@neondatabase/serverless': {
    builds: new Set(['neon', 'Pool', 'Client']),
    sinks: new Set(['query', 'unsafe']),
  },
  '@vercel/postgres': {
    builds: new Set(['createPool', 'createClient', 'sql', 'db']),
    sinks: new Set(['query']),
  },
  mssql: {
    builds: new Set(['ConnectionPool', 'connect']),
    sinks: new Set(['query', 'batch']),
  },
  '@libsql/client': {
    builds: new Set(['createClient']),
    sinks: new Set(['execute', 'executeMultiple']),
  },
};

/**
 * Query-config keys holding the SQL text.
 *
 * @vocabulary pg QueryConfig (`text`) / mysql QueryOptions (`sql`)
 */
const TEXT_KEYS = new Set(['text', 'sql']);

/** The driver method this call is, as `module.method`, or undefined. */
function sqlSinkOf(
  node: TSESTree.CallExpression,
  scope: TSESLint.Scope.Scope,
  builtBy: (node: TSESTree.Node) => Construction | undefined,
): string | undefined {
  if (node.callee.type !== 'MemberExpression') return undefined;
  const method = propertyName(node.callee);
  if (method === null) return undefined;
  // `sql.query(text)` on an exported instance, `mssql.query(text)`.
  // A binding into a relative module (`import { pool } from './db'`) is
  // followed below, to the construction inside that module.
  const direct = resolveModuleBinding(node.callee, scope);
  const directDriver = direct && DRIVERS[direct.module];
  if (directDriver !== undefined)
    return directDriver.sinks.has(method)
      ? `${direct!.module}.${method}`
      : undefined;
  const instance = builtBy(node.callee.object);
  const driver = instance && DRIVERS[instance.module];
  if (
    driver === undefined ||
    !driver.builds.has(instance!.path.join('.')) ||
    !driver.sinks.has(method)
  )
    return undefined;
  return `${instance!.module}.${method}`;
}

/** The expressions holding the SQL text of a driver call. */
function sqlTextOf(node: TSESTree.CallExpression): TSESTree.Node[] {
  const first = node.arguments[0];
  if (first === undefined) return [];
  if (first.type !== 'ObjectExpression') return [first];
  return first.properties.flatMap((prop) =>
    prop.type === 'Property' && TEXT_KEYS.has(objectKeyName(prop) ?? '')
      ? [prop.value]
      : [],
  );
}

export const noSqlInjectionInTool = createRule<[], MessageIds>({
  name: 'no-sql-injection-in-tool',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/no-sql-injection-in-tool.md',
      description:
        'Disallow an MCP tool argument reaching the text of a SQL query instead of its parameters',
      cwe: 'CWE-89',
      cvss: 9.8,
    },
    messages: {
      toolArgToSql: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MCP Tool Argument in SQL Text',
        cwe: 'CWE-89',
        owasp: 'A03:2021',
        cvss: 9.8,
        description:
          'Tool argument `{{arg}}` reaches the SQL text of `{{sink}}()`, so whatever steers the model can rewrite the query — read other rows, drop tables, or escalate through the database',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS', 'NIST-CSF'],
        fix: 'Keep the SQL text a literal and pass the argument as a bound parameter — `pool.query("SELECT … WHERE name = $1", [name])`, `db.prepare("… WHERE id = ?").get(id)`. An identifier (table or column name) must come from an allowlist the code owns, never from the argument.',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    if (!fileUsesMcpSdk(context.sourceCode.ast)) return {};
    const resolve = valueResolverFor(context);
    const builtBy = createInstanceResolver(context);
    const handlers = createHandlerCollector(context, resolve, 'arguments');
    const candidates: Array<{ node: TSESTree.Node; sink: string }> = [];

    return {
      CallExpression(node: TSESTree.CallExpression) {
        handlers.visit(node);
        const sink = sqlSinkOf(
          node,
          context.sourceCode.getScope(node),
          builtBy,
        );
        if (sink === undefined) return;
        for (const text of sqlTextOf(node))
          candidates.push({ node: text, sink });
      },

      'Program:exit'() {
        const carries = createFlow(context.sourceCode, (fn) =>
          handlers.roots.get(fn),
        );
        for (const { node, sink } of candidates) {
          const taint = carries(node);
          if (taint?.kind !== 'value') continue;
          context.report({
            node,
            messageId: 'toolArgToSql',
            data: { arg: taint.text, sink },
          });
        }
      },
    };
  },
});
