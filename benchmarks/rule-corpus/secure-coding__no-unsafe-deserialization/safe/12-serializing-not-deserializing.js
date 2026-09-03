/**
 * SAFE (adversarial) - The WRITE half of the same libraries. Serialising an
 * object the server already holds creates no deserialization surface; the sink
 * is the eval on the other end, and it is not in this file.
 */
const serialize = require('serialize-javascript');
const v8 = require('node:v8');

exports.renderState = function renderState(state) {
  return `<script>window.__STATE__ = ${serialize(state, { isJSON: true })}</script>`;
};

exports.snapshot = function snapshot(job) {
  return v8.serialize(job).toString('base64');
};
