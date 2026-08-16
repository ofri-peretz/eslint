/**
 * SAFE - Mongoose's `hydrate` casts a plain object into a document instance
 * against a declared schema. It does not execute anything and it cannot
 * instantiate a type the schema does not name, so an attacker-controlled lean
 * document cannot become code.
 *
 * JUDGEMENT: safe. Included because "revive an object from wire data" LOOKS like
 * the CWE-502 shape; the distinguishing fact is that the type is fixed by the
 * schema, not chosen by the payload.
 */
const { Types } = require('mongoose');
const Order = require('../models/order');

exports.fromCache = function fromCache(cached) {
  return Order.hydrate({ ...cached, _id: new Types.ObjectId(cached._id) });
};
