/**
 * SAFE (adversarial) - Binary codecs whose method is literally called
 * `deserialize`. BSON and msgpack decode into plain values against a fixed
 * wire format; neither instantiates a type the payload names, so neither is a
 * CWE-502 sink.
 *
 * JUDGEMENT: safe. This is the shape that makes a method-name matcher fire on
 * every binary protocol in the registry.
 */
const { deserialize } = require('bson');
const { unpack } = require('msgpackr');

exports.readDocument = function readDocument(req) {
  return deserialize(req.body.document);
};

exports.readFrame = function readFrame(req) {
  return unpack(req.body.frame);
};
