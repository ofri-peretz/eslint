/**
 * VULNERABLE - node-expat is a thin binding over libexpat with no entity policy
 * of its own; the caller must refuse DOCTYPEs. This one feeds it the request
 * body directly.
 */
const expat = require('node-expat');

exports.streamOrders = function streamOrders(req, res) {
  const parser = new expat.Parser('UTF-8');
  parser.on('startElement', (name) => res.write(name));
  parser.parse(req.body.orders);
};
