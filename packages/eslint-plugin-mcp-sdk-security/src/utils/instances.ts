/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Which module export built this value?
 *
 * `resolveModuleBinding` answers "which export IS this name" — `exec` is
 * `child_process.exec`. A receiver needs the other question: `pool.query(sql)`
 * is a database call only when `pool` was BUILT by a database driver —
 *
 *     const pool = new Pool();                 // pg's Pool
 *     const client = await pool.connect();     // derived from that Pool
 *     const db = new Database('app.db');       // better-sqlite3
 *     import { db } from './db';               // built in a relative module
 *
 * — and `server.connect(transport)` concerns an MCP server only when `server`
 * came from `new McpServer(...)`. This follows the value to the `new` or call
 * that produced it, through `const` bindings, `await`, a method called on an
 * instance (`pool.connect()`, `pool.promise()`), and relative imports (via
 * `module-resolver`), and returns the binding of that constructor or factory.
 *
 * Nothing is decided from a variable's name. A value the resolver cannot
 * follow — a parameter, a `let`, `this.pool`, a package import — is
 * `undefined`, and every caller abstains on it.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  resolveModuleBinding,
  type ModuleBinding,
} from '@interlace/eslint-devkit';
import {
  activeParser,
  resolveValue,
  unwrapTypeOnly,
  type Site,
} from './module-resolver';

/** How many hops — bindings, awaits, method calls — one question may take. */
export const MAX_INSTANCE_DEPTH = 8;

/** The constructor or factory a value came from. */
export interface Construction extends ModuleBinding {
  /** The `new X(...)` / `factory(...)` call itself. */
  call: TSESTree.NewExpression | TSESTree.CallExpression;
}

/**
 * Build the question "which export constructed this value?" for one lint run.
 */
export function createInstanceResolver(
  context: Readonly<TSESLint.RuleContext<string, readonly unknown[]>>,
): (node: TSESTree.Node) => Construction | undefined {
  const parser = activeParser(context);

  function builtBy(
    node: TSESTree.Node,
    site: Site,
    depth: number,
  ): Construction | undefined {
    if (depth > MAX_INSTANCE_DEPTH) return undefined;
    let current = unwrapTypeOnly(node);
    while (current.type === 'AwaitExpression')
      current = unwrapTypeOnly(current.argument);

    if (current.type === 'NewExpression' || current.type === 'CallExpression') {
      const binding = resolveModuleBinding(current.callee, site.scope);
      if (binding !== undefined) return { ...binding, call: current };
      // `pool.connect()`, `mysql.createPool(cfg).promise()` — a method called
      // on an instance hands back something built by the same driver.
      if (current.callee.type !== 'MemberExpression') return undefined;
      return builtBy(current.callee.object, site, depth + 1);
    }
    if (current.type !== 'Identifier' && current.type !== 'MemberExpression')
      return undefined;
    const resolved = resolveValue(current, site, { parser, depth: 0 });
    if (resolved.kind !== 'value') return undefined;
    return builtBy(resolved.node, resolved.site, depth + 1);
  }

  return (node) =>
    builtBy(
      node,
      { scope: context.sourceCode.getScope(node), file: context.filename },
      0,
    );
}
