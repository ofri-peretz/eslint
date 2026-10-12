/**
 * Cross-file fixture for no-tool-description-injection's call-site
 * resolution: a helper that forwards its parameter's fields into
 * registerResource, the shape of modelcontextprotocol/servers'
 * src/everything/resources/session.ts.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const registerSessionResource = (
  server: McpServer,
  resource: { uri: string; name: string; description?: string; title?: string },
  payload: string,
) => {
  const { uri, name, description, title } = resource;
  return server.registerResource(
    name,
    uri,
    { description, title },
    async () => ({
      contents: [{ uri, text: payload }],
    }),
  );
};

export function registerNoteResource(
  server: McpServer,
  id: string,
  text: string,
) {
  return server.registerResource(
    `note-${id}`,
    `note:///${id}`,
    { description: text },
    async () => ({
      contents: [{ uri: `note:///${id}`, text }],
    }),
  );
}

export default function registerDefault(server: McpServer, blurb: string) {
  server.registerPrompt('p', { description: blurb }, () => ({ messages: [] }));
}

export const notAFunction = 'text';

export let reassignable = (server: McpServer, text: string) =>
  server.registerResource('r', 'r://', { description: text }, async () => ({
    contents: [],
  }));

export let declaredLater: unknown;

/** Gives `reassignable` a real reassignment, which is why it is a `let`. */
export function swapReassignable(next: typeof reassignable): void {
  reassignable = next;
}
