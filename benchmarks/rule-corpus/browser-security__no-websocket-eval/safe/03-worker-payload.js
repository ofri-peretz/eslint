/**
 * SAFE FOR THIS RULE - A Worker payload, not a WebSocket one. It is a real
 * vulnerability and `no-eval` reports it; this rule must not claim a provenance
 * it cannot prove, or the finding would cite the WebSocket MDN page for code
 * containing no WebSocket.
 */
const worker = new Worker('/parser.worker.js');

worker.onmessage = (event) => {
  eval(event.data);
};
