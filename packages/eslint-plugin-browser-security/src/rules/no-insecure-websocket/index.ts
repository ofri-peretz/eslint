/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require secure WebSocket connections (wss://)
 */

/**
 * ## Rule partition — cleartext transport (CWE-319)
 *
 * **This rule owns a `ws://` URL that is NOT at the constructor** — an endpoint
 * in a config object, a constant, a JSX prop, anything a `new WebSocket(…)` may
 * later read. `require-websocket-wss` owns the constructor argument itself.
 *
 * The constructor goes to the sibling because the sibling can FIX it: it ships
 * `meta.fixable` plus a suggestion that rewrites `ws://` to `wss://` in place.
 * This rule reported the identical line with nothing attached, so the pair cost
 * the user a second diagnostic and returned nothing for it. Both rules are in
 * `recommended`, so moving the shape loses no coverage in the default preset.
 *
 * Also stood down on `ws://`: `no-unencrypted-transmission`, which dropped the
 * scheme from its defaults.
 *
 * The boundary is `isWebSocketConstructorUrl` in
 * `utils/transport-ownership.ts`, called by both sides rather than restated.
 *
 * Before the partition, `new WebSocket("ws://live.acme-corp.io")` drew three
 * reports. It now draws one.
 */

import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isNonTransmittingUrl } from '../../utils/loopback-hosts';
import { isWebSocketConstructorUrl } from '../../utils/transport-ownership';
import { isProtocolInspection } from '../../utils/protocol-inspection';
import type { TSESTree } from '@interlace/eslint-devkit';

/**
 * URL schemes are ASCII case-insensitive, so `WS://legacy…` opens exactly the
 * same cleartext channel. Both websocket rules tested `startsWith('ws://')`,
 * which the shift key defeats — and legacy endpoints, the ones most likely to
 * still be cleartext, are the ones most likely to be written that way. The
 * `http` half of the family already anchored case-insensitively, so this was a
 * split in what the family considered a URL.
 */
const CLEARTEXT_WS_SCHEME = /^ws:\/\//i;

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noInsecureWebsocket = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-websocket',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-insecure-websocket.md',
      description: 'Require secure WebSocket connections (wss://)',
      cwe: 'CWE-319',
      cvss: 7.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure WebSocket',
        cwe: 'CWE-319',
        description: 'Insecure WebSocket connection (ws://) - data transmitted in clear text',
        severity: 'HIGH',
        fix: 'Use wss:// instead of ws:// for secure WebSocket connections',
        documentationLink: 'https://cwe.mitre.org/data/definitions/319.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    return {
      // The `new WebSocket(…)` visitor is gone, not disabled: the constructor
      // argument belongs to `require-websocket-wss`, which reports the same
      // line WITH an autofix. Two rules on one constructor was the whole
      // duplicate.
      Literal(node: TSESTree.Literal) {
        if (
          typeof node.value === 'string' &&
          CLEARTEXT_WS_SCHEME.test(node.value) &&
          // A literal being EXAMINED is a guard, not a destination.
          // `if (url.startsWith('ws://')) throw …` is code REFUSING a cleartext
          // socket, and this rule reported it as the vulnerability — exactly
          // backwards. `no-http-urls` and `no-unencrypted-transmission` have
          // shared `isProtocolInspection` for this since the http sweep; this
          // rule was simply never given it, so the family disagreed about
          // whether a guard is a finding. Found by the corpus.
          !isProtocolInspection(node, node.parent as TSESTree.Node) &&
          // `ws://localhost:1337` never leaves the machine, so there is no cleartext
          // transmission to intercept. Shared with no-http-urls and
          // no-unencrypted-transmission so the three agree on what "local" means.
          !isNonTransmittingUrl(node.value) &&
          !isWebSocketConstructorUrl(node)
        ) {
          report(node);
        }
      },
    };
  },
});
