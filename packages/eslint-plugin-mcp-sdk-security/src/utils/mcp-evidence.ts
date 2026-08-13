/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview The one place this plugin decides "is this an MCP server file?".
 *
 * Every rule here abstains unless it is, because `server.registerTool(...)` and
 * `.tool(...)` are ordinary method names that any codebase may own. The gate
 * used to be written inline in all four rules as a pair of visitors —
 * `ImportDeclaration`, plus a `CallExpression` whose callee is literally named
 * `require`. That covers ESM and plain CommonJS and stops there, so a file
 * written `import { McpServer } = require(...)`'s TypeScript spelling
 * (`import mcp = require('@modelcontextprotocol/sdk/server/mcp.js')`) or one
 * that lazily `await import(...)`s the SDK inside a factory had **every rule in
 * the plugin switched off** — not degraded, silent.
 *
 * Routing through the devkit probe fixes all four at once and picks up the
 * subtleties a fresh scanner gets wrong: re-export forms, Deno's `npm:` and
 * `deno.land/x` specifiers, and the fact that `function f(require) {
 * require('@modelcontextprotocol/sdk') }` is a local parameter call, not a
 * module load.
 */
import { createModuleEvidence } from '@interlace/eslint-devkit';
import type { TSESTree } from '@typescript-eslint/utils';

/**
 * The SDK ships its surface under subpaths — `/server/mcp.js`, `/types.js` —
 * so the package root is what is matched, and every subpath comes with it.
 */
export const MCP_SDK_PACKAGE = '@modelcontextprotocol/sdk';

export const fileUsesMcpSdk: (ast: TSESTree.Program) => boolean = createModuleEvidence({
  packages: [MCP_SDK_PACKAGE],
});
