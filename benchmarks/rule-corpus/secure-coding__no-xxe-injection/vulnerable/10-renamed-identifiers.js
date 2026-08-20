/**
 * VULNERABLE - ADVERSARIAL, FALSE-NEGATIVE DIRECTION. Byte-for-byte the same
 * exposure as vulnerable/01: libxmljs2, entity substitution on, document taken
 * from the wire. Every identifier has been renamed to a word that carries none
 * of XXE's vocabulary - no `req`, no `body`, no `xml`, no `data`.
 *
 * If detection dies here, detection was reading the spelling, not the flow.
 */
const catalogue = require('libxmljs2');

exports.ingestShipment = function ingestShipment(envelope, channel) {
  const shipment = envelope.payload.contents;
  const parsed = catalogue.parseXml(shipment, { noent: true, dtdload: true });
  channel.publish(parsed.get('//tracking').text());
};
