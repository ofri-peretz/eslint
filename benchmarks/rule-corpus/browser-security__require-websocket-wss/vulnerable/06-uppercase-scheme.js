/**
 * VULNERABLE - ADVERSARIAL. Same evasion at the constructor. The autofix must
 * also survive it: rewriting a literal `'ws://'` substring does not match
 * `'WS://'`, so a rule that detects this but cannot fix it is only half fixed.
 */
export const legacy = new WebSocket('WS://legacy.acme-corp.io/feed');
