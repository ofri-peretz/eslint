/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `@hono/node-server`'s `serve()` binds like `listen()` does.
 *
 * `serve({ fetch, port })` with no `hostname` calls Node's `listen(port)`, which
 * binds every interface (`::`). The MCP TypeScript SDK's Hono example does this
 * with no authentication while it prints `http://127.0.0.1` — the same defect
 * this rule reports for `app.listen(port)` in four Express examples, and it was
 * missed because the rule knew only `.listen()`.
 *
 * `createMcpHandler` serves MCP over HTTP as surely as a constructed transport
 * does, so a file that uses it is judged for authentication too.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { requireHttpTransportHardening } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

/** The SDK's Hono example, as shipped (examples/hono/server.ts), minus the tool. */
const HONO_EXAMPLE = (serveCall: string): string => `
  import { serve } from '@hono/node-server';
  import { createMcpHonoApp } from '@modelcontextprotocol/hono';
  import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
  const port = Number(process.env.PORT ?? 3000);
  const handler = createMcpHandler(() => new McpServer({ name: 'hono-example', version: '1.0.0' }));
  const app = createMcpHonoApp();
  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.all('/mcp', (c) => handler.fetch(c.req.raw));
  ${serveCall}
`;

describe('require-http-transport-hardening — @hono/node-server serve()', () => {
  ruleTester.run('hono-serve', requireHttpTransportHardening, {
    valid: [
      {
        name: 'the fix: serve() bound to loopback',
        code: HONO_EXAMPLE(
          "serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => {});",
        ),
      },
      {
        name: 'a serve() whose options this file cannot read is abstained on',
        code: HONO_EXAMPLE('serve(serverOptions);'),
      },
      {
        name: 'a spread may carry the hostname, so the options are abstained on',
        code: HONO_EXAMPLE(
          'serve({ fetch: app.fetch, port, ...listenOptions });',
        ),
      },
      {
        name: 'a different package exporting serve is not @hono/node-server',
        code:
          HONO_EXAMPLE('').replace(
            "import { serve } from '@hono/node-server';",
            "import { serve } from 'some-other-server';",
          ) + 'serve({ fetch: app.fetch, port });',
      },
      {
        name: 'authenticated: an SDK auth export in the file',
        code:
          "import { requireBearerAuth } from '@modelcontextprotocol/server';\n" +
          HONO_EXAMPLE('serve({ fetch: app.fetch, port });') +
          'app.use(requireBearerAuth({ verifier }));',
      },
      {
        // Raised by CodeRabbit on #1581: a credential check in front of
        // handler.fetch() is the same gate as one in front of handleRequest.
        name: 'an inline credential check before handler.fetch() authenticates',
        code: HONO_EXAMPLE('serve({ fetch: app.fetch, port });').replace(
          "app.all('/mcp', (c) => handler.fetch(c.req.raw));",
          "app.all('/mcp', (c) => { if (c.req.header('authorization') !== expected) return c.text('Unauthorized', 401); return handler.fetch(c.req.raw); });",
        ),
      },
      {
        // Raised by CodeRabbit on #1581: an app handed to imported setup may
        // get its auth there, as with listen().
        name: 'an app passed to imported setup code is not judged',
        code:
          "import { setupAuth } from './auth';\n" +
          HONO_EXAMPLE('setupAuth(app);\nserve({ fetch: app.fetch, port });'),
      },
    ],
    invalid: [
      {
        name: 'a fetch() on something other than the MCP handler is not a serve call',
        code: HONO_EXAMPLE('serve({ fetch: app.fetch, port });').replace(
          "app.all('/mcp', (c) => handler.fetch(c.req.raw));",
          "const other = makeProxy(); app.all('/mcp', (c) => { if (c.req.header('authorization') !== expected) return c.text('no', 401); return other.fetch(c.req.raw); }); app.all('/raw', (c) => handler.fetch(c.req.raw)); this.client.fetch(c);",
        ),
        errors: [{ messageId: 'missingAuth', data: { host: '::' } }],
      },
      {
        name: 'a fetch option that is not a member read names no app',
        code: HONO_EXAMPLE(
          'serve({ fetch: (req) => app.fetch(req), port, ...{} });',
        ).replace('...{} ', ''),
        errors: [{ messageId: 'missingAuth', data: { host: '::' } }],
      },
      {
        // @source modelcontextprotocol/typescript-sdk examples/hono/server.ts:35
        // @found real-source scan
        name: 'FN: serve({ fetch, port }) with no hostname binds every interface, unauthenticated',
        code: HONO_EXAMPLE(
          'serve({ fetch: app.fetch, port }, () => { console.error(`listening on http://127.0.0.1:${port}/mcp`); });',
        ),
        errors: [{ messageId: 'missingAuth', data: { host: '::' } }],
      },
      {
        name: 'an explicit all-interfaces hostname',
        code: HONO_EXAMPLE(
          "serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });",
        ),
        errors: [{ messageId: 'missingAuth', data: { host: '0.0.0.0' } }],
      },
    ],
  });
});
