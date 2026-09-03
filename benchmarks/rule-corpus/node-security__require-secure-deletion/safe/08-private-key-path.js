/**
 * SAFE (adversarial) - a FILENAME, not a key. Removing the path to the TLS key
 * from a serialisable config is exactly the right thing to do, and the string
 * removed is '/etc/ssl/private/app.key' — a location, readable in any process
 * listing anyway.
 */
function serializableTlsOptions(options) {
  const out = { ...options };
  delete out.privateKeyPath;
  delete out.signingKeyFile;
  return out;
}

module.exports = { serializableTlsOptions };
