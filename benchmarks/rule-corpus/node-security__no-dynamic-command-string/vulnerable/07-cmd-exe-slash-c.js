/**
 * VULNERABLE - Windows `cmd.exe /C` is the same escape hatch with a different
 * flag spelling. `&` and `|` in the path split the command line.
 */
const { spawn } = require('node:child_process');

export function openInEditor(filePath) {
  return spawn('cmd.exe', ['/C', `code --goto ${filePath}`], { windowsHide: true });
}
