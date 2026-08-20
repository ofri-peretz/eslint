/**
 * SAFE - `-c` is not universally a command flag. To git it sets a config
 * override, and git never re-parses that value as a shell command line.
 * A rule that keyed on the FLAG rather than on the interpreter would fire here.
 */
const { execFile } = require('node:child_process');

module.exports = function commitAs(authorName, message, cwd) {
  return execFile(
    'git',
    ['-c', `user.name=${authorName}`, 'commit', '-m', message],
    { cwd },
  );
};
