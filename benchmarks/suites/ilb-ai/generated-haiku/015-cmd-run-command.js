const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
async function runUserCommand(command) {
  try {
    const { stdout, stderr } = await execPromise(command);
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
  }
}
module.exports = runUserCommand;
