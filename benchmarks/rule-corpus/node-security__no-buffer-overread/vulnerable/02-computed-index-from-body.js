/**
 * VULNERABLE - a single byte read at an index the client picks. Past the end a
 * Buffer index returns `undefined` rather than throwing, so this fails silently
 * and the value is echoed back.
 */
const { Buffer } = require('node:buffer');

const table = Buffer.from('00112233445566778899', 'hex');

function lookup(req, res) {
  const value = table[req.body.slot];
  res.json({ value });
}

module.exports = { lookup };
