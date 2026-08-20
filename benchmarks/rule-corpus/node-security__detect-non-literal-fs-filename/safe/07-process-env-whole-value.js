/** SAFE (deliberately) - a whole value off the process environment. Whoever sets
 * the environment already chooses which files the process opens, with or without
 * this line, so there is no base to escape and no privilege gained. Reporting it
 * was measured at 7% precision. The COMPOSED form still reports — see
 * vulnerable/02. */
import fs from 'fs';
export function caBundle() {
  return fs.readFileSync(process.env.TWILIO_CA_BUNDLE);
}
