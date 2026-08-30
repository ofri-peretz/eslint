/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — which wallet the eval suite spends from.
 *
 * `ANTHROPIC_API_KEY` bills the Console per token; `CLAUDE_CODE_OAUTH_TOKEN` draws on
 * the Claude subscription allowance at no per-token charge. Claude Code ranks the API
 * key ABOVE the token, so a stray key silently converts a free CI run into a metered
 * one — and nothing in the output would say so if the warning regressed.
 *
 * The subtle half is the empty string. GitHub Actions writes `KEY=""` into the step
 * env whenever the secret is absent, so the variable is present-and-empty rather than
 * missing. Treating that as "a key is set" would skip the subscription path and hand
 * the `claude` subprocess an empty credential to fail on.
 */

import { describe, it, expect } from 'vitest';
import { routeCredentials, evalEnv } from '../run-evals';

const KEY = 'ANTHROPIC_API_KEY';
const TOKEN = 'CLAUDE_CODE_OAUTH_TOKEN';

describe('credential routing', () => {
  it('no credential at all — nothing to bill, the suite skips layer 2', () => {
    expect(routeCredentials({})).toEqual({ billing: 'none', bothSet: false });
  });

  it('only the subscription token — bills the plan, no warning', () => {
    expect(routeCredentials({ [TOKEN]: 't' })).toEqual({
      billing: 'subscription',
      bothSet: false,
    });
  });

  it('only the API key — bills per token', () => {
    expect(routeCredentials({ [KEY]: 'k' })).toEqual({ billing: 'api-key', bothSet: false });
  });

  it('both set — the key wins, and that is worth warning about', () => {
    expect(routeCredentials({ [KEY]: 'k', [TOKEN]: 't' })).toEqual({
      billing: 'api-key',
      bothSet: true,
    });
  });

  /** The Actions case: secret absent, variable present and empty. */
  it('an empty API key is not a credential', () => {
    expect(routeCredentials({ [KEY]: '', [TOKEN]: 't' })).toEqual({
      billing: 'subscription',
      bothSet: false,
    });
  });

  it('an empty token is not a credential either', () => {
    expect(routeCredentials({ [KEY]: '', [TOKEN]: '' })).toEqual({
      billing: 'none',
      bothSet: false,
    });
  });
});

describe('the environment handed to the claude subprocess', () => {
  it('strips empty credentials rather than passing them down', () => {
    const env = evalEnv({ [KEY]: '', [TOKEN]: 't', PATH: '/usr/bin' });
    expect(KEY in env, 'an empty key must not reach the subprocess').toBe(false);
    expect(env[TOKEN]).toBe('t');
  });

  it('passes real credentials through untouched', () => {
    expect(evalEnv({ [KEY]: 'k', [TOKEN]: 't' })).toMatchObject({ [KEY]: 'k', [TOKEN]: 't' });
  });

  it('leaves everything else alone', () => {
    expect(evalEnv({ PATH: '/usr/bin', HOME: '/home/x' })).toEqual({
      PATH: '/usr/bin',
      HOME: '/home/x',
    });
  });
});
