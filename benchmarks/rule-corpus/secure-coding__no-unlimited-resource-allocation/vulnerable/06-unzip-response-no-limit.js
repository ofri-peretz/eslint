/**
 * VULNERABLE - A decompression bomb. The compressed body can sit far under any
 * request-size limit and still expand to gigabytes, because nothing bounds
 * what comes OUT of the stream.
 */
const zlib = require('zlib');

function onResponse(res, sink) {
  let inflate;
  switch (res.headers['content-encoding']) {
    case 'gzip':
    case 'deflate':
      inflate = zlib.createUnzip();
      break;
  }
  res.pipe(inflate).pipe(sink);
}

module.exports = { onResponse };
