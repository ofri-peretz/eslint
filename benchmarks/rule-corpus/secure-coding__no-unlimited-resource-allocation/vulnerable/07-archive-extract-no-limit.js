/**
 * VULNERABLE - Extracting an uploaded archive with no cap on the expanded
 * size. A 42 KB zip that unpacks to 4.5 GB is a published, reproducible
 * payload, not a hypothetical.
 */
const unzip = require('unzipper');

function handleUpload(req, res) {
  const zipStream = unzip.Extract({ path: '/tmp/incoming' });
  req.pipe(zipStream);
  zipStream.on('finish', () => res.json({ extracted: true }));
}

module.exports = { handleUpload };
