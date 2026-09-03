/**
 * SAFE - `process.env` is chosen by whoever started the process, who is
 * already trusted with it. An operator who can set PM2_HOME can equally just
 * not start the process; there is no denial of service in obeying them.
 *
 * pm2 lib/API/Serve.js:216
 */
const fs = require('fs');
const path = require('path');

function readAgentConfig() {
  return fs.readFileSync(path.join(process.env.PM2_HOME, 'agent.json5')).toString();
}

module.exports = { readAgentConfig };
