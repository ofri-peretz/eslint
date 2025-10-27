import { Command } from 'commander';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

type PrereleaseTag = 'alpha' | 'beta' | 'rc' | 'next' | 'canary';

export function createPrereleaseCommand(): Command {
  const prerelease = new Command('prerelease')
    .description('Manage pre-release mode for changesets')
    .addCommand(createEnterCommand())
    .addCommand(createExitCommand());

  return prerelease;
}

function createEnterCommand(): Command {
  return new Command('enter')
    .description('Enter pre-release mode')
    .argument('<tag>', 'Pre-release tag (alpha|beta|rc|next|canary)')
    .option('-s, --snapshot', 'Create snapshot pre-release')
    .action((tag: string, options: { snapshot?: boolean }) => {
      const validTags: PrereleaseTag[] = ['alpha', 'beta', 'rc', 'next', 'canary'];
      
      if (!validTags.includes(tag as PrereleaseTag)) {
        console.error(chalk.red(`❌ Invalid tag: ${tag}`));
        console.error(chalk.yellow(`   Valid tags: ${validTags.join(', ')}`));
        process.exit(1);
      }

      const spinner = ora(`Entering pre-release mode: ${chalk.cyan(tag)}`).start();

      try {
        const cmd = options.snapshot 
          ? `pnpm changeset pre enter ${tag} --snapshot`
          : `pnpm changeset pre enter ${tag}`;
        
        execSync(cmd, { stdio: 'inherit' });
        
        spinner.succeed(chalk.green(`✅ Pre-release mode activated: ${tag}`));
        
        console.log(chalk.dim('\n📝 Next steps:'));
        console.log(chalk.dim('   1. Create changesets: pnpm changeset'));
        console.log(chalk.dim('   2. Version packages: pnpm changeset version'));
        console.log(chalk.dim('   3. Publish: pnpm changeset publish'));
        console.log(chalk.dim('   4. Exit pre-release: forge prerelease exit\n'));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        spinner.fail(chalk.red(`Failed to enter pre-release mode: ${errorMessage}`));
        process.exit(1);
      }
    });
}

function createExitCommand(): Command {
  return new Command('exit')
    .description('Exit pre-release mode')
    .action(() => {
      const spinner = ora('Exiting pre-release mode').start();

      try {
        execSync('pnpm changeset pre exit', { stdio: 'inherit' });
        spinner.succeed(chalk.green('✅ Pre-release mode deactivated'));
        console.log(chalk.dim('\n📝 Versions will now be stable releases\n'));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        spinner.fail(chalk.red(`Failed to exit pre-release mode: ${errorMessage}`));
        process.exit(1);
      }
    });
}

