/**
 * VULNERABLE (adversarial) - the interpreter path is hoisted to a module
 * constant, which is ordinary style in cross-platform tooling. The shell is
 * still bash and the command line is still interpolated.
 */
const { spawn } = require('node:child_process');

const SHELL = '/bin/bash';

module.exports = function runHook(hookName, ref) {
  return spawn(SHELL, ['-c', `.githooks/${hookName} ${ref}`], { stdio: 'inherit' });
};
