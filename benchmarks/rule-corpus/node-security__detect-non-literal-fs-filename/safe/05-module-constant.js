/** SAFE - a module-scope constant path. */
import fs from 'fs';
const CONFIG_PATH = '/etc/app/config.json';
export function load() {
  return fs.readFileSync(CONFIG_PATH, 'utf8');
}
