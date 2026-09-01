// browser-security/no-worker-message-innerhtml — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by browser-security/no-worker-message-innerhtml
const button = new Worker('worker.js');
        button.onmessage = (e) => {
          element.innerHTML = e.data;
        };
