// browser-security/no-websocket-innerhtml — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by browser-security/no-websocket-innerhtml
const ws = new WebSocket('wss://example.test');
        const worker = new Worker('worker.js');
        ws.onmessage = (event) => {
          worker.onmessage = (we) => { element.innerHTML = we.data; };
          element.innerHTML = event.data;
        };
