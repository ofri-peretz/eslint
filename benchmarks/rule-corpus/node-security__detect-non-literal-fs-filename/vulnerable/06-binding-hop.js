/** VULNERABLE - one const between the source and the sink. */
import fs from 'fs';
export function read(req, cb) {
  const target = req.body.path;
  return fs.readFile(target, cb);
}
