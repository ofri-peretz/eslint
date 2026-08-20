/** SAFE - a literal. Nothing to steer. */
import fs from 'fs';
export const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
