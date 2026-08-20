/**
 * VULNERABLE - FALSE-NEGATIVE DIRECTION. The event name and the surrounding
 * identifiers say nothing interesting. The payload key is the evidence.
 */
const p = { a: 1, passport: q.docNumber };
mixpanel.track('e7', p);
