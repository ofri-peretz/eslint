#!/usr/bin/env node
/**
 * Forge CLI - Release Management Tool for forge-js monorepo
 * 
 * This CLI provides commands for managing releases, pre-releases, and publishing
 * packages in the monorepo with smart distribution tag detection.
 */

import { Command } from 'commander';
import { createReleaseCommand } from './commands/release';
import { createPublishCommand } from './commands/publish';
import { createPrereleaseCommand } from './commands/prerelease';
import chalk from 'chalk';

const program = new Command();

program
  .name('forge')
  .description('CLI tool for managing releases in the forge-js monorepo')
  .version('0.0.1', '-v, --version', 'Display version number')
  .helpOption('-h, --help', 'Display help for command');

// Add commands
program.addCommand(createReleaseCommand());
program.addCommand(createPublishCommand());
program.addCommand(createPrereleaseCommand());

// Custom error handling
program.exitOverride((err) => {
  if (err.code === 'commander.help') {
    process.exit(0);
  }
  if (err.code === 'commander.version') {
    process.exit(0);
  }
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

