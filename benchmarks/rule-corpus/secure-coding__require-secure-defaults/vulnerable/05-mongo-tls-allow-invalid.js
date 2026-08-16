/**
 * VULNERABLE - ADVERSARIAL. MongoDB's driver spells the same bypass as two
 * POSITIVE booleans rather than a negative one. `tlsAllowInvalidCertificates`
 * and `tlsAllowInvalidHostnames` set to `true` are precisely "accept any
 * certificate for any host", and this connection carries every document in the
 * database.
 */
import mongoose from 'mongoose';

export function connect() {
  return mongoose.connect(process.env.MONGO_URL, {
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
  });
}
