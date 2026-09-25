---
title: require-command-example
description: Require every runnable CLI command to declare an example, and every example to be a single line
tags: ['quality', 'cli', 'commander', 'yargs', 'burgee']
category: quality
severity: medium
autofix: false
---

# require-command-example

> Require every runnable CLI command to declare an example, and every example to be a single line.

- **burgee requirements:** F3 — every command declares at least one example; examples are single-line and copy-pasteable. H2 — the same, as the help renderer's contract
- **Hosts:** commander (and `burgee/commander`, `@commander-js/extra-typings`), yargs (and `burgee/yargs`), burgee
- **Recommended:** `error`

## Why

An example is the one part of help an agent can act on without reading prose — if it exists, and if it is one line it can paste and run. A multi-line example (a `\` continuation, two commands in one string) is documentation, not an invocation. yargs #877 and #1640 are the issue trail.

## Rule details

Two findings.

**`missingExample`** — a command that runs (it has a handler: commander `.action()`, a yargs handler, burgee `run` or `load`) and declares no example:

| Host      | Where the example is read                                                                                                       |
| :-------- | :------------------------------------------------------------------------------------------------------------------------------ |
| commander | `.addHelpText(position, text)` on the command, or `'afterAll'` / `'beforeAll'` on an ancestor — commander's only place for one  |
| yargs     | `.example()` on the instance the command's builder is handed; for the default command (`$0`, `*`) also `.example()` on the root |
| burgee    | a non-empty `examples` array                                                                                                    |

A group — a command with no handler of its own — is not reported: its example belongs on the children.

**`multilineExample`** — an example command line that contains a line break: a yargs `.example()` first argument (string, template, or `[[cmd, desc]]` pair) or a burgee `examples[].command`.

The host must be proven by import, exactly as in [`require-command-description`](./require-command-description.md); an `.example()` on anything else is never read.

## Incorrect

```ts
import { defineCommand } from 'burgee';

defineCommand({
  name: 'greet',
  description: 'Greet someone',
  effects: 'read_only',
  run: greet,
});

defineCommand({
  name: 'deploy',
  description: 'Deploy',
  effects: 'non_idempotent',
  examples: [
    {
      command: `mytool deploy
    --env prod`,
    },
  ], // two lines: not copy-pasteable
  run: deploy,
});
```

```ts
import yargs from 'yargs';

yargs(argv)
  .example('$0 serve --port 80', 'on port 80') // root: not shown in `serve --help`
  .command('serve', 'Start the server', (y) => y.option('port', {}), serve);
```

## Correct

```ts
defineCommand({
  name: 'greet',
  description: 'Greet someone',
  effects: 'read_only',
  examples: [{ command: 'mytool greet --name ada', description: 'greet Ada' }],
  run: greet,
});

yargs(argv).command(
  'serve',
  'Start the server',
  (y) => y.option('port', {}).example('$0 serve --port 80', 'on port 80'),
  serve,
);

program
  .command('build')
  .description('Build the site')
  .addHelpText('after', '\nExample:\n  $ mytool build --out dist')
  .action(build);
```

## Known limitations

- **commander has no structured examples.** Any `.addHelpText()` on the command counts, and the text is not checked for being one line — it is a prose block by design. The single-line check applies to yargs and burgee, where an example is a value.
- Examples held in a variable (`examples: EXAMPLES`) are unreadable and never reported.

## Further reading

- [burgee spec — requirements F3 and H2](https://github.com/ofri-peretz/burgee/blob/main/.sdlc/intents/burgee/spec.md)
