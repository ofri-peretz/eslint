/**
 * SAFE - The `yaml` package (eemeli/yaml) is a pure YAML 1.2 parser: it has no
 * function tag and instantiates nothing, so `YAML.parse` is not a CWE-502 sink
 * at all. The input is a file that ships inside the bundle, on a literal path.
 *
 * JUDGEMENT: safe. Neither of the two facts CWE-502 needs - a sink that
 * executes, and data an attacker can steer - is present.
 */
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const defaults = YAML.parse(fs.readFileSync(path.join(__dirname, 'defaults.yaml'), 'utf8'));

module.exports = { defaults };
