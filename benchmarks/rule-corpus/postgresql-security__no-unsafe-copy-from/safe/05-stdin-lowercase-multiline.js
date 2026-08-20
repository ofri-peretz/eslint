// Adversarial: lowercase STDIN split across lines, so the keyword and the
// FROM are separated by a newline.
const { Client } = require('pg');
const { from: copyFrom } = require('pg-copy-streams');

const client = new Client();

function loader(stream) {
  const sink = client.query(copyFrom('COPY metrics FROM STDIN'));
  client.query(`
    copy metrics (ts, value)
      from
      stdin
      with (format csv)
  `);
  stream.pipe(sink);
}

module.exports = { loader };
