# eslint-plugin-cli-floor

All notable changes to `eslint-plugin-cli-floor` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 0.1.0

### Minor Changes

- **✨ Feature** — new plugin — the lint half of burgee's CLI floor (F3, O3, P1) for commander, yargs and burgee programs

  Four rules, each reading a command only when its host is proven by import — the receiver of `.command()` resolves to commander's `Command` / `program` / `createCommand`, to a `yargs()` instance, to a parameter typed `Command` or `Argv` from those modules, or to the object given to burgee's `defineCommand`. A router or job queue that owns `.command()` and `.action()` is never reported.

  - `require-command-description` (F3) — a command with no description, or an empty one.
  - `require-command-example` (F3, H2) — a runnable command with no example (commander `addHelpText`, yargs `.example()` in the command's builder, burgee `examples`), and an example command line that spans more than one line.
  - `no-console-in-command` (O3) — `console.*` lexically inside a command handler, where it bypasses the output layer `--json` and non-TTY output depend on.
  - `no-prompt-without-flag` (P1, `strict` only) — a prompt from `@clack/prompts`, `inquirer`, `@inquirer/*`, `prompts`, `enquirer` or `caique` inside a handler, with no guard that reads the handler's inputs first.

  The devkit registers `plugin-cli-floor` in `PLUGIN_DOCS_CATEGORY` (`quality`); without it every rule ships with no `meta.docs.url`. The docs site gains the plugin's pages, and `sync-plugin-stats` classifies it as a quality plugin rather than defaulting it to security.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.8`
