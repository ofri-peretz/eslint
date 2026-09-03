#!/usr/bin/env node
/**
 * VULNERABLE - CLI entry point. The allocation size reaches the deprecated
 * constructor through ONE intermediate `const`, which is how sizes are always
 * written in real code.
 */
import process from 'node:process';

const requested = Number.parseInt(process.argv[2] ?? '0', 10);
const pageSize = requested;

const page = new Buffer(pageSize);
process.stdout.write(page);
