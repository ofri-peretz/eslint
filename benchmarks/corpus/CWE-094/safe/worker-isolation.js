// CWE-094: Safe — untrusted work delegated to an isolated worker thread
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — no eval/vm on user input; the worker runs a fixed
// module file and only structured data crosses the thread boundary.
const { Worker } = require('worker_threads');
const path = require('path');

function transform(payload) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'transform.worker.js'), {
      workerData: payload,
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

module.exports = { transform };
