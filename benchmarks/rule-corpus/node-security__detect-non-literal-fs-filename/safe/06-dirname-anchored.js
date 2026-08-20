/** SAFE - anchored to the module's own location; no caller input reaches it. */
import fs from 'fs';
import path from 'path';
const TEMPLATE = path.join(__dirname, 'templates', 'email.html');
export function template() {
  return fs.readFileSync(TEMPLATE, 'utf8');
}
