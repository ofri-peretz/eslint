/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The peer range must admit the Anthropic SDKs this repo itself tests against.
 *
 * Both SDKs are optional peers, but npm still enforces the range when the
 * package is installed, and in a project this plugin is for, it always is.
 * 2.0.2 capped both at `<1.0.0` while `@anthropic-ai/sdk` was already on 1.x
 * and the agent SDK's own peer resolved to it, so installing the plugin next to
 * a current SDK failed with ERESOLVE (#1555). 2.0.4 widened the range; nothing
 * held it. This does: bump the root devDependency to a new major and this goes
 * red until the published range follows.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import semver from 'semver';
import pkg from '../package.json' with { type: 'json' };

/**
 * The installed version, read from disk: both SDKs' `exports` maps hide
 * `./package.json`, so `require('<sdk>/package.json')` throws.
 */
function installedVersion(name: string): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const manifest = join(dir, 'node_modules', name, 'package.json');
    if (existsSync(manifest))
      return (JSON.parse(readFileSync(manifest, 'utf8')) as { version: string })
        .version;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`${name} is not installed`);
    dir = parent;
  }
}

describe('peer range', () => {
  it.each(['@anthropic-ai/sdk', '@anthropic-ai/claude-agent-sdk'] as const)(
    'admits the installed %s',
    (name) => {
      const installed = installedVersion(name);
      expect(
        semver.satisfies(installed, pkg.peerDependencies[name]),
        `${name}@${installed} is outside the peer range ${pkg.peerDependencies[name]}`,
      ).toBe(true);
    },
  );

  it('admits the 1.x line the issue was filed against', () => {
    expect(
      semver.satisfies('1.9.0', pkg.peerDependencies['@anthropic-ai/sdk']),
    ).toBe(true);
  });
});
