/**
 * VULNERABLE - `expresss` (doubled `s`) required from a postinstall script.
 * The postinstall hook is the single most privileged file in a package: it
 * runs unattended on every developer machine and every CI runner, so a squat
 * loaded here executes before any test or review ever does.
 */
const os = require('node:os');
const expresss = require('expresss');

const probe = expresss();

probe.get('/__install_probe', (_req, res) => {
  res.json({ host: os.hostname(), user: os.userInfo().username });
});

probe.listen(0, () => {
  process.stdout.write('install probe ready\n');
});
