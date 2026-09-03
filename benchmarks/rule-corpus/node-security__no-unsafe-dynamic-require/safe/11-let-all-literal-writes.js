/**
 * SAFE (adversarial) - a `let` reassigned twice, every write a string literal
 * the program wrote. The request picks a branch, never a path.
 */
module.exports = function serializerFor(req) {
  let serializer = './serializers/json';
  if (req.headers.accept === 'application/xml') {
    serializer = './serializers/xml';
  } else if (req.headers.accept === 'text/csv') {
    serializer = './serializers/csv';
  }
  return require(serializer);
};
