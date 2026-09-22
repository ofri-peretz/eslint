/**
 * Tests for require-websocket-wss rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireWebsocketWss } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-websocket-wss', requireWebsocketWss, {
  valid: [
    // Correct usage: secure wss://
    {
      name: 'wss://',
      code: `const ws = new WebSocket('wss://acmecorp.io/socket');`,
    },
    {
      code: `const ws = new WebSocket('wss://api.acmecorp.io:443/ws');`,
    },
    // Localhost is allowed by default
    {
      code: `const ws = new WebSocket('ws://localhost:3000');`,
    },
    {
      code: `const ws = new WebSocket('ws://127.0.0.1:8080');`,
    },
    {
      code: `const ws = new WebSocket('ws://0.0.0.0:3000');`,
    },
    // IPv6 localhost
    {
      code: `const ws = new WebSocket('ws://[::1]:3000');`,
    },
    // Template literal with wss
    {
      code: 'const ws = new WebSocket(`wss://${host}/socket`);',
    },
    // Variable URL (can't analyze statically)
    {
      code: `const ws = new WebSocket(wsUrl);`,
    },
    // Test files allowed by default
    {
      code: `const ws = new WebSocket('ws://acmecorp.io');`,
      filename: 'test.spec.ts',
    },
    // Not a WebSocket constructor
    {
      code: `const msg = new Message('ws://acmecorp.io');`,
    },
    // WebSocket as method call (not constructor)
    {
      code: `const ws = createWebSocket('ws://acmecorp.io');`,
    },

    // --- exemptions inherited with sole ownership of the constructor --------
    // `no-insecure-websocket` used to report this constructor too, and it
    // exempted RFC 2606 reserved hosts. When that rule stood down, this one
    // became the ONLY rule on the shape — so it had to stop being the weaker
    // of the two. Until then the family gave two different answers for the
    // same string: silent next door, HIGH here.
    //
    // These fixtures previously read `ws://example.com` and were pinned as
    // INVALID, which locked the disagreement in place.
    {
      code: `const ws = new WebSocket('ws://example.com');`,
    },
    {
      code: `const ws = new WebSocket('ws://example.org/socket');`,
    },
    {
      code: `const ws = new WebSocket('ws://fixtures.test/socket');`,
    },
    // Loopback is now decided by the same `isLoopbackUrl` the rest of the
    // family uses, which parses the AUTHORITY. The old local `isLocalhostUrl`
    // substring-matched `://localhost` anywhere in the string, so a genuinely
    // remote host was exempt whenever the loopback spelling appeared in its
    // path or query — see the FN lock below.
    {
      code: `const ws = new WebSocket('ws://[::1]:9000/socket');`,
    },
  ],
  invalid: [
    // FN LOCK: a genuinely remote host that merely MENTIONS the loopback
    // spelling in its query string. The old `url.includes('://localhost')`
    // exempted this — a cleartext socket to an attacker-controlled host,
    // silently allowed by a substring test. Authority parsing fixes it.
    {
      name: 'a ws:// endpoint — the frames travel in clear',
      code: `const ws = new WebSocket('ws://relay.acmecorp.io/?next=://localhost');`,
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            {
              messageId: 'useWss',
              output: `const ws = new WebSocket('wss://relay.acmecorp.io/?next=://localhost');`,
            },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://relay.acmecorp.io/?next=://localhost');`,
    },
    // Basic insecure WebSocket
    {
      code: `const ws = new WebSocket('ws://acmecorp.io');`,
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://acmecorp.io');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://acmecorp.io');`,
    },
    // With port
    {
      code: `const ws = new WebSocket('ws://api.acmecorp.io:8080/socket');`,
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://api.acmecorp.io:8080/socket');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://api.acmecorp.io:8080/socket');`,
    },
    // With path
    {
      code: `const ws = new WebSocket('ws://acmecorp.io/api/v1/socket');`,
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://acmecorp.io/api/v1/socket');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://acmecorp.io/api/v1/socket');`,
    },
    // Template literal with ws:// (no auto-fix, only suggestion)
    {
      code: 'const ws = new WebSocket(`ws://acmecorp.io/socket`);',
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: 'const ws = new WebSocket(`wss://acmecorp.io/socket`);' },
          ],
        },
      ],
    },
    // Localhost with allowLocalhost: false
    {
      code: `const ws = new WebSocket('ws://localhost:3000');`,
      options: [{ allowLocalhost: false }],
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://localhost:3000');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://localhost:3000');`,
    },
    // 127.0.0.1 with allowLocalhost: false
    {
      code: `const ws = new WebSocket('ws://127.0.0.1:8080');`,
      options: [{ allowLocalhost: false }],
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://127.0.0.1:8080');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://127.0.0.1:8080');`,
    },
    // Test file with allowInTests: false
    {
      code: `const ws = new WebSocket('ws://acmecorp.io');`,
      filename: 'test.spec.ts',
      options: [{ allowInTests: false }],
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://acmecorp.io');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://acmecorp.io');`,
    },
    // Double quotes are PRESERVED. This case used to assert that the fix
    // rewrote them to single quotes — requoting was the mechanism of the
    // corruption fixed below (it re-encoded the string), not a feature. Quote
    // style belongs to `quotes`/Prettier, not to a CWE-319 transport rule.
    {
      name: 'the fix swaps the scheme and leaves the author\'s quote style alone',
      code: `const ws = new WebSocket("ws://acmecorp.io");`,
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket("wss://acmecorp.io");` },
          ],
        },
      ],
      output: `const ws = new WebSocket("wss://acmecorp.io");`,
    },
  ],
});

/*
 * ── REGRESSION: defect the rule corpus proved ────────────────────────────────
 * benchmarks/rule-corpus/browser-security__require-websocket-wss/
 *
 * Found by the ADVERSARIAL wave, after the first-pass corpus scored 100%.
 *
 * URL schemes are ASCII case-insensitive, so `WS://` opens the same cleartext
 * channel. The detection tested `startsWith('ws://')` — and the AUTOFIX had the
 * same bug one level deeper: `url.replace('ws://', 'wss://')` does not match
 * `'WS://'`, so simply teaching the rule to detect the uppercase form would
 * have shipped a fix that changed nothing. The `output` assertions below are
 * the half that a detection-only test would have missed.
 */
ruleTester.run('regression: uppercase scheme is the same URL', requireWebsocketWss, {
  valid: [
    { code: `const ws = new WebSocket('WSS://chat.acmecorp.io');` },
    { code: `const ws = new WebSocket('WS://localhost:1337/hmr');` },
  ],
  invalid: [
    {
      code: `const ws = new WebSocket('WS://legacy.acmecorp.io/feed');`,
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://legacy.acmecorp.io/feed');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://legacy.acmecorp.io/feed');`,
    },
    {
      code: 'const ws = new WebSocket(`Ws://legacy.acmecorp.io/rooms/${room}`);',
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            {
              messageId: 'useWss',
              output: 'const ws = new WebSocket(`wss://legacy.acmecorp.io/rooms/${room}`);',
            },
          ],
        },
      ],
    },
  ],
});

/*
 * ── REGRESSION: the autofix corrupted URLs it claimed to secure ──────────────
 * Surfaced by the burgee FP/FN corpus sweep, 2026-09-21.
 *
 * The fixer spliced the literal's DECODED `.value` between hardcoded single
 * quotes. That re-encodes the string, so three legal URLs came back wrong: an
 * apostrophe (an RFC 3986 sub-delim) closed the literal early, an interior
 * `\n` escape became a real newline and left it unterminated, and a backslash
 * escape silently changed the URL while still parsing.
 *
 * The third is the one with teeth: it parses, so nothing surfaces, and a
 * security rule quietly retargets the connection it just "secured".
 *
 * The fix rewrites the scheme inside the ORIGINAL SOURCE TEXT — the technique
 * the TemplateLiteral branch already used, and the one QUALITY_STANDARDS' own
 * GOOD example demonstrates.
 */
ruleTester.run('regression: the fix must not re-encode the literal', requireWebsocketWss, {
  valid: [],
  invalid: [
    {
      name: 'an apostrophe in the path is a legal sub-delim — the fix must not close the literal on it',
      code: `const ws = new WebSocket("ws://live.acmecorp.io/room's");`,
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket("wss://live.acmecorp.io/room's");` },
          ],
        },
      ],
      output: `const ws = new WebSocket("wss://live.acmecorp.io/room's");`,
    },
    {
      name: 'an escaped newline stays escaped — decoding it would leave the literal unterminated',
      code: `const ws = new WebSocket("ws://live.acmecorp.io/a\\nb");`,
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket("wss://live.acmecorp.io/a\\nb");` },
          ],
        },
      ],
      output: `const ws = new WebSocket("wss://live.acmecorp.io/a\\nb");`,
    },
    {
      name: 'an escaped backslash stays escaped — decoding it changed the URL while still parsing',
      code: `const ws = new WebSocket('ws://live.acmecorp.io/a\\\\b');`,
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://live.acmecorp.io/a\\\\b');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://live.acmecorp.io/a\\\\b');`,
    },
    {
      // A scheme spelled with an escape decodes to `ws://` but is not written
      // that way, so a source-text rewrite cannot find it. The URL is still
      // cleartext, so it must still REPORT — but with no fix, rather than one
      // that changes nothing.
      name: 'an escaped scheme still reports, and offers no fix rather than a no-op one',
      code: `const ws = new WebSocket('\\x77s://live.acmecorp.io/feed');`,
      errors: [{ messageId: 'insecureWebsocket', suggestions: [] }],
      output: null,
    },
  ],
});
