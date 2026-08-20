/**
 * SAFE (adversarial) - `temperature` starts with `temp`. A report here would
 * prove the rule matches characters rather than path segments. Sensor readings
 * are written to a project directory, not to shared temp storage.
 */
const fs = require('node:fs');

function persistReadings(readings) {
  fs.writeFileSync('./data/temperature-log.json', JSON.stringify(readings));
  fs.writeFileSync('/var/lib/myapp/temperature-archive.json', JSON.stringify(readings));
}

module.exports = { persistReadings };
