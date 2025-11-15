import { Command } from 'commander';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

export function createReleaseCommand(): Command {
  const release = new Command('release')
    .description('Manage releases with changesets')
    .addCommand(createChangesetCommand())
    .addCommand(createVersionCommand())
    .addCommand(createStatusCommand());

  return release;
}

function createChangesetCommand(): Command {
  return new Command('changeset')
    .alias('cs')
    .description('Create a new changeset')
    .option('-e, --empty', 'Create an empty changeset')
    .action((options) => {
      const spinner = ora('Creating changeset').start();

      try {
        const cmd = options.empty 
          ? 'pnpm changeset --empty'
          : 'pnpm changeset';
        
        spinner.stop();
        execSync(cmd, { stdio: 'inherit' });
        console.log(chalk.green('✅ Changeset created'));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        spinner.fail(chalk.red(`Failed to create changeset: ${errorMessage}`));
        process.exit(1);
      }
    });
}

function createVersionCommand(): Command {
  return new Command('version')
    .description('Version packages based on changesets')
    .option('-s, --snapshot', 'Create snapshot versions')
    .option('--snapshot-tag <tag>', 'Snapshot tag name')
    .action((options) => {
      const spinner = ora('Versioning packages').start();

      try {
        let cmd = 'pnpm changeset version';
        
        if (options.snapshot) {
          cmd += ' --snapshot';
          if (options.snapshotTag) {
            cmd += ` ${options.snapshotTag}`;
          }
        }
        
        execSync(cmd, { stdio: 'inherit' });
        spinner.succeed(chalk.green('✅ Packages versioned'));
        
        console.log(chalk.dim('\n📝 Next steps:'));
        console.log(chalk.dim('   1. Review package.json and CHANGELOG.md changes'));
        console.log(chalk.dim('   2. Commit changes: git commit -am "chore: version packages"'));
        console.log(chalk.dim('   3. Push changes: git push\n'));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        spinner.fail(chalk.red(`Failed to version packages: ${errorMessage}`));
        process.exit(1);
      }
    });
}

function createStatusCommand(): Command {
  return new Command('status')
    .description('Check changeset status')
    .option('-v, --verbose', 'Show detailed status')
    .option('--since <ref>', 'Show changes since git ref')
    .action((options) => {
      try {
        let cmd = 'pnpm changeset status';
        
        if (options.verbose) {
          cmd += ' --verbose';
        }
        
        if (options.since) {
          cmd += ` --since ${options.since}`;
        }
        
        execSync(cmd, { stdio: 'inherit' });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Failed to check status: ${errorMessage}`));
        process.exit(1);
      }
    });
}

