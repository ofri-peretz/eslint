import { Command } from 'commander';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import type { Ora } from 'ora';

export function createPublishCommand(): Command {
  const publish = new Command('publish')
    .description('Publish packages to npm with automatic tag detection')
    .option('-d, --dry-run', 'Run without actually publishing')
    .option('-v, --verbose', 'Show detailed output')
    .action(async (options) => {
      const spinner = ora('Publishing packages...').start();

      try {
        const distPackagesDir = 'dist/packages';
        
        if (!require('fs').existsSync(distPackagesDir)) {
          spinner.fail(chalk.red('dist/packages directory not found. Did you run the build?'));
          process.exit(1);
        }

        // Get all package directories
        const packages = require('fs').readdirSync(distPackagesDir)
          .map((name: string) => require('path').join(distPackagesDir, name))
          .filter((dir: string) => require('fs').statSync(dir).isDirectory());

        if (packages.length === 0) {
          spinner.fail(chalk.red('No packages found in dist/packages'));
          process.exit(1);
        }

        spinner.text = `Publishing ${packages.length} package(s)...`;

        // Publish each package
        for (const packagePath of packages) {
          await publishPackage(packagePath, options, spinner);
        }

        spinner.succeed(chalk.green('✨ All packages published successfully!'));
      } catch (error: any) {
        spinner.fail(chalk.red(`Failed to publish: ${error.message}`));
        process.exit(1);
      }
    });

  return publish;
}

function getDistTag(version: string): string {
  if (version.includes('-alpha.')) return 'alpha';
  if (version.includes('-beta.')) return 'beta';
  if (version.includes('-rc.')) return 'rc';
  if (version.includes('-canary.')) return 'canary';
  if (version.includes('-next.')) return 'next';
  
  // If it has any prerelease identifier, use 'next'
  if (/-[a-zA-Z]/.test(version)) return 'next';
  
  // Stable version
  return 'latest';
}

async function publishPackage(packagePath: string, options: any, spinner: Ora) {
  const packageJsonPath = require('path').join(packagePath, 'package.json');
  
  if (!require('fs').existsSync(packageJsonPath)) {
    spinner.warn(chalk.yellow(`⏭️  Skipping ${packagePath} - no package.json found`));
    return;
  }
  
  const packageJson = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf8'));
  const { name, version } = packageJson;
  
  if (!name || !version) {
    spinner.warn(chalk.yellow(`⏭️  Skipping ${packagePath} - missing name or version`));
    return;
  }
  
  // Determine the appropriate dist-tag
  const distTag = getDistTag(version);
  
  spinner.text = `📦 Publishing ${chalk.cyan(name)}@${chalk.cyan(version)} with tag ${chalk.yellow(distTag)}`;
  
  try {
    const publishCmd = `npm publish --tag ${distTag} --access public${options.dryRun ? ' --dry-run' : ''}`;
    
    if (options.verbose) {
      console.log(chalk.dim(`\n  Running: ${publishCmd} in ${packagePath}`));
    }
    
    if (!options.dryRun) {
      execSync(publishCmd, {
        cwd: packagePath,
        stdio: options.verbose ? 'inherit' : 'pipe',
        env: { ...process.env }
      });
    }
    
    spinner.succeed(chalk.green(`✅ Published ${name}@${version} with tag '${distTag}'`));
    
    // If this is a stable version, verify it's set as latest
    if (distTag === 'latest' && !options.dryRun) {
      execSync(`npm dist-tag add ${name}@${version} latest`, { stdio: 'pipe' });
    }
  } catch (error: any) {
    throw new Error(`Failed to publish ${name}@${version}: ${error.message}`);
  }
}

