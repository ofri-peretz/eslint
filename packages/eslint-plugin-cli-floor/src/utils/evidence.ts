/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview The cheap per-file gate every rule opens with.
 *
 * A file that imports none of the CLI hosts cannot contain a command this
 * plugin recognises, so every rule returns `{}` before the model is built.
 * The gate only ever *subtracts*: passing it proves nothing on its own — each
 * rule still requires the receiver or callee to resolve to the host's export
 * (`utils/hosts.ts`), so a file that imports `commander` for its types and owns
 * an unrelated `.action()` is still quiet.
 *
 * Routed through the devkit probe for the same reason the sibling plugins are:
 * it already handles `import x = require()`, lazy `await import()`, re-exports
 * and Deno's `npm:` specifiers, and a missed form silences the whole plugin.
 */
import { createModuleEvidence } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

import { HOST_PACKAGES } from './hosts';

/** Does this file import commander, yargs or burgee (or a drop-in of one)? */
export const fileUsesCliHost: (ast: TSESTree.Program) => boolean =
  createModuleEvidence({ packages: HOST_PACKAGES });
