// browser-security/no-worker-message-innerhtml — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by browser-security/no-worker-message-innerhtml
const myWorker = new Worker('worker.js');
        myWorker.onmessage = (e) => {
          const sanitized = DOMPurify.sanitize(e.data);
          element.innerHTML = sanitized;
        };
