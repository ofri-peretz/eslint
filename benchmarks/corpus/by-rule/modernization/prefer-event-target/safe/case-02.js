// modernization/prefer-event-target — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by modernization/prefer-event-target
/* eslint modernization/prefer-event-target: ["error", {"allowEventEmitter":true}] */
import { EventEmitter } from "events";
