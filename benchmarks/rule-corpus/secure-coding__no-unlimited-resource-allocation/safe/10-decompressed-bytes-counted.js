/**
 * SAFE - The output bound is spelled as a byte count on the piped stream
 * rather than as `maxOutputLength`. It is still a bound.
 *
 * axios lib/adapters/http.js:1193, where the unzip stream is pushed onto the
 * pipeline and the bytes coming out of it are counted against maxContentLength.
 */
const zlib = require('zlib');

function onResponse(res, limit) {
  const streams = [];
  streams.push(zlib.createUnzip());

  let totalResponseBytes = 0;
  res.on('data', (chunk) => {
    totalResponseBytes += chunk.length;
    if (totalResponseBytes > limit) {
      throw new Error('maxContentLength exceeded');
    }
  });
  return streams;
}

module.exports = { onResponse };
