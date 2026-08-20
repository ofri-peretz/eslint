/**
 * @fileoverview Tests for no-insecure-websocket
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noInsecureWebsocket } from './index';

/*
 * Fixture hosts deliberately avoid `example.com`. RFC 2606 reserves it precisely so that
 * nothing treats it as a real endpoint, and these rules now exempt it — a placeholder
 * domain cannot be a cleartext-transmission risk. Using it as a stand-in for "some remote
 * host" would test the exemption, not the rule.
 */

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-insecure-websocket', noInsecureWebsocket, {
  valid: [
        'const x = 42;',
        'const flag = true;',
    // Secure WebSocket connections
    { code: "new WebSocket('wss://acmecorp.io')" },
    { code: "const ws = new WebSocket('wss://secure.acmecorp.io/socket')" },
    { code: "new WebSocket(`wss://acmecorp.io/${path}`)" },
    // Non-WebSocket code
    { code: "const x = 1" },

    // --- deferred to `require-websocket-wss` --------------------------------
    // The constructor argument belongs to the sibling, which reports the same
    // line WITH an autofix and a suggestion. This rule kept every `ws://` URL
    // that is NOT at a constructor, below.
    //
    // These two cases were previously INVALID here, and the first of them was
    // pinned at TWO errors from this ONE rule — the comment read "caught by
    // both NewExpression and Literal" as though that were the design. It was a
    // rule reporting one line twice by itself, asserted as correct by its own
    // suite, on top of the third report the sibling added.
    { code: "new WebSocket('ws://acmecorp.io')" },
    { code: "new WebSocket(`ws://acmecorp.io/${path}`)" },
  ],

  invalid: [
    // ws:// in a standalone string literal — this rule's remaining territory.
    {
      code: "const url = 'ws://acmecorp.io'",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A config map of endpoints, which a constructor reads later. The sibling
    // never sees this shape, so the partition would be a coverage hole without
    // it.
    {
      code: "const SOCKETS = { live: 'ws://live.acmecorp.io' };",
      errors: [{ messageId: 'violationDetected' }],
    },
    // One report, not two, for a constructor whose URL is a hoisted constant:
    // the literal is here, the constructor is next door.
    {
      code: "const URL_ = 'ws://acmecorp.io'; const ws = new WebSocket(URL_);",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

/*
 * ── REGRESSION: defects the rule corpus proved ───────────────────────────────
 * benchmarks/rule-corpus/browser-security__no-insecure-websocket/
 *
 * Both were found by the ADVERSARIAL wave, after the first-pass corpus scored
 * 100%. A corpus that only contains shapes the author already had in mind
 * measures nothing.
 */
ruleTester.run('regression: corpus findings', noInsecureWebsocket, {
  valid: [
    // FP. A literal being EXAMINED is a guard, not a destination — this is code
    // REFUSING a cleartext socket, and the rule reported it as the
    // vulnerability. `no-http-urls` and `no-unencrypted-transmission` have
    // shared `isProtocolInspection` since the http sweep; this rule was never
    // given it, so the family disagreed about whether a guard is a finding.
    { code: "if (url.startsWith('ws://')) { throw new Error('cleartext socket rejected'); }" },
    { code: "if (endpoint.includes('ws://')) reject();" },
    { code: "const isPlain = scheme === 'ws://';" },
    { code: "url.replace('ws://', 'wss://');" },
  ],
  invalid: [
    // FN. URL schemes are ASCII case-insensitive, so this opens exactly the
    // same cleartext channel — and legacy endpoints, the ones most likely to
    // still be cleartext, are the ones most likely to be written this way.
    // The `http` half of the family already matched case-insensitively, so this
    // was a split in what the family considered a URL.
    {
      code: "const SOCKETS = { legacy: 'WS://legacy.acmecorp.io/feed' };",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "const SOCKETS = { legacy: 'Ws://legacy.acmecorp.io/feed' };",
      errors: [{ messageId: 'violationDetected' }],
    },
    // The replacement operand of `replace` is content being WRITTEN, so it is a
    // real destination and the inspection exemption must not swallow it.
    {
      code: "scheme.replace(/^wss:/, 'ws://legacy.acmecorp.io');",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
