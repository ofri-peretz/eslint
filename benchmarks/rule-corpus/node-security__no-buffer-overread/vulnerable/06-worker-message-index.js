/**
 * VULNERABLE - a worker thread. The index arrives over `parentPort` from
 * whatever posted the message, and indexes the shared page directly.
 */
import { parentPort } from 'node:worker_threads';
import { Buffer } from 'node:buffer';

const page = Buffer.alloc(65536);

parentPort.on('message', (message) => {
  const byte = page[message.params.offset];
  parentPort.postMessage({ byte });
});
