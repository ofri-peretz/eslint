/** VULNERABLE - CWE-22. The caller supplies the WHOLE path, so they need no
 * base to escape: `/etc/passwd` is arbitrary file read outright. */
import fs from 'fs';
export function download(req, res) {
  return res.send(fs.readFileSync(req.query.file));
}
