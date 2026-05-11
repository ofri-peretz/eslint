const { execFileSync } = require("child_process");
function runUserCommand(command) {
  const parts = command.split(/\s+/);
  const program = parts[0];
  const args = parts.slice(1);
  return execFileSync(program, args, { encoding: "utf-8" });
}
**Important security note:** This function uses `execFileSync` instead of `exec`/`execSync` to avoid **command injection vulnerabilities**. `execFileSync` does not spawn a shell, so shell metacharacters (`;`, `|`, `&&`, `` ` ``, `$()`, etc.) are not interpreted. Using `exec(command)` with unsanitized user input would allow arbitrary command chaining and is a critical security risk.
If you need shell features (pipes, redirects), you should validate/sanitize the input rigorously or use an allowlist of permitted commands rather than passing raw user input to a shell.
