/**
 * VULNERABLE - namespace import (`cp.spawn`) with an absolute interpreter path.
 * `/usr/bin/zsh` basenames to `zsh`, still a shell, and the deploy tag flows
 * straight into the command line it re-parses.
 */
import * as cp from 'node:child_process';

export function tagRelease(tag, cwd) {
  return cp.spawn('/usr/bin/zsh', ['-c', `git tag -a ${tag} -m "release ${tag}"`], {
    cwd,
    stdio: 'inherit',
  });
}
