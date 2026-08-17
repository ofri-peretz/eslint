/** SAFE - a name the program generates. An attacker supplies nothing. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
export function scratch(data) {
  return fs.writeFileSync(path.join(os.tmpdir(), `${randomUUID()}.tmp`), data);
}
