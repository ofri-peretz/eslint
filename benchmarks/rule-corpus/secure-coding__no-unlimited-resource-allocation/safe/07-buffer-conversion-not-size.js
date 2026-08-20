/**
 * SAFE - `new Buffer(x)` allocates `x` bytes only when `x` is a NUMBER. Given
 * a string or an array it copies, reserving exactly what the caller already
 * holds — and the ternary guarding this call is itself the proof that `data`
 * is not a number.
 *
 * uptime-kuma server/image-data-uri.js:45
 */
function encode(data, mediaType) {
  const dataBase64 = Buffer.isBuffer(data)
    ? data.toString('base64')
    : new Buffer(data).toString('base64');
  return `data:${mediaType};base64,${dataBase64}`;
}

module.exports = { encode };
