#!/usr/bin/env tsx

import { execSync } from 'child_process';
import * as readline from 'readline';

const WORKFLOW = 'ci.yml';
const BRANCH = 'local-playground-app';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
} as const;

interface WorkflowRun {
  databaseId: number;
  name: string;
  status: 'completed' | 'in_progress' | 'queued';
  conclusion: 'success' | 'failure' | 'cancelled' | null;
  createdAt: string;
  url: string;
}

function log(color: string, ...args: any[]): void {
  console.log(color, ...args, colors.reset);
}

function getRunsJson(): WorkflowRun[] {
  try {
    const json = execSync(
      `gh run list --workflow="${WORKFLOW}" --branch="${BRANCH}" --limit 10 --json databaseId,name,status,conclusion,createdAt,url`,
      { encoding: 'utf-8' }
    );
    return JSON.parse(json);
  } catch (error) {
    log(colors.red, '❌ Failed to fetch runs:', (error as Error).message);
    process.exit(1);
  }
}

function getStatusIcon(status: string, conclusion: string | null): string {
  if (status === 'completed') {
    if (conclusion === 'success') return `${colors.green}✅${colors.reset}`;
    if (conclusion === 'cancelled') return `${colors.yellow}⊘${colors.reset}`;
    if (conclusion === 'failure') return `${colors.red}❌${colors.reset}`;
    return `${colors.yellow}⚠️${colors.reset}`;
  }
  if (status === 'in_progress') return `${colors.blue}⏳${colors.reset}`;
  if (status === 'queued') return `${colors.yellow}⏱️${colors.reset}`;
  return `${colors.dim}?${colors.reset}`;
}

function getStatusText(status: string, conclusion: string | null): string {
  if (status === 'completed') {
    if (conclusion === 'success') return 'Success';
    if (conclusion === 'cancelled') return 'Cancelled';
    if (conclusion === 'failure') return 'Failed';
    return conclusion || 'Completed';
  }
  if (status === 'in_progress') return 'Running';
  if (status === 'queued') return 'Queued';
  return status;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function showMenu(runs: WorkflowRun[]): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.clear();
    log(colors.cyan, '╔════════════════════════════════════════════════════════════════╗');
    log(colors.cyan, '║            📊 CI Pipeline Status Monitor                        ║');
    log(colors.cyan, '╚════════════════════════════════════════════════════════════════╝');
    console.log('');

    log(colors.bright + colors.blue, 'Recent Runs:');
    console.log('');

    runs.forEach((run, index) => {
      const icon = getStatusIcon(run.status, run.conclusion);
      const status = getStatusText(run.status, run.conclusion);
      const time = formatDate(run.createdAt);
      const runId = run.databaseId;

      const statusColor =
        run.conclusion === 'success'
          ? colors.green
          : run.conclusion === 'cancelled'
          ? colors.yellow
          : run.conclusion === 'failure'
          ? colors.red
          : colors.blue;

      console.log(
        `  ${colors.bright}${index + 1}${colors.reset}) ${icon} ${statusColor}${status.padEnd(12)}${colors.reset} | ${colors.dim}${time.padEnd(12)}${colors.reset} | ${colors.cyan}#${runId}${colors.reset}`
      );
    });

    console.log('');
    log(colors.bright + colors.yellow, 'Options:');
    console.log(`  ${colors.blue}1-${Math.min(10, runs.length)}${colors.reset}  View run details`);
    console.log(`  ${colors.blue}t${colors.reset}     Trigger a new run`);
    console.log(`  ${colors.blue}r${colors.reset}     Refresh status`);
    console.log(`  ${colors.blue}q${colors.reset}     Quit`);
    console.log('');

    rl.question(
      `${colors.bright}${colors.blue}Choose an option:${colors.reset} `,
      (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase());
      }
    );
  });
}

async function showRunDetails(run: WorkflowRun): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.clear();
    log(colors.cyan, '╔════════════════════════════════════════════════════════════════╗');
    log(colors.cyan, `║ Run #${run.databaseId}`.padEnd(65) + '║');
    log(colors.cyan, '╚════════════════════════════════════════════════════════════════╝');
    console.log('');

    const status = getStatusText(run.status, run.conclusion);
    const statusColor =
      run.conclusion === 'success'
        ? colors.green
        : run.conclusion === 'cancelled'
        ? colors.yellow
        : run.conclusion === 'failure'
        ? colors.red
        : colors.blue;

    log(colors.reset, `Status:  ${statusColor}${status}${colors.reset}`);
    log(colors.reset, `Created: ${formatDate(run.createdAt)}`);
    console.log('');

    log(colors.bright + colors.yellow, 'Actions:');
    console.log(`  ${colors.blue}1${colors.reset}  Open in GitHub (web browser)`);
    console.log(`  ${colors.blue}2${colors.reset}  View logs (terminal)`);
    console.log(`  ${colors.blue}3${colors.reset}  Copy run URL`);
    console.log(`  ${colors.blue}b${colors.reset}  Back to menu`);
    console.log('');

    rl.question(
      `${colors.bright}${colors.blue}Choose an action:${colors.reset} `,
      (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase());
      }
    );
  });
}

async function main(): Promise<void> {
  let runs = getRunsJson();

  while (true) {
    const choice = await showMenu(runs);

    if (choice === 'q') {
      console.log('');
      log(colors.green, '👋 Goodbye!');
      process.exit(0);
    } else if (choice === 't') {
      log(colors.yellow, '\n🚀 Triggering new CI run...');
      try {
        execSync('gh workflow run ci.yml --ref local-playground-app', {
          stdio: 'inherit',
        });
        log(colors.green, '✅ Workflow triggered!');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        runs = getRunsJson();
      } catch (error) {
        log(colors.red, '❌ Failed to trigger workflow');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } else if (choice === 'r') {
      log(colors.blue, '\n🔄 Refreshing...');
      await new Promise((resolve) => setTimeout(resolve, 500));
      runs = getRunsJson();
    } else {
      const index = parseInt(choice, 10) - 1;
      if (index >= 0 && index < runs.length) {
        const run = runs[index];
        let action;

        do {
          action = await showRunDetails(run);

          if (action === '1') {
            log(colors.blue, `\n🌐 Opening ${run.url} in browser...`);
            try {
              execSync(`open "${run.url}"`);
              log(colors.green, '✅ Opened in browser');
            } catch {
              // Fallback for non-macOS systems
              try {
                execSync(`xdg-open "${run.url}"`);
                log(colors.green, '✅ Opened in browser');
              } catch {
                log(colors.yellow, `\n📋 Run URL: ${colors.cyan}${run.url}${colors.reset}`);
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else if (action === '2') {
            log(colors.blue, `\n📄 Fetching logs for run #${run.databaseId}...`);
            try {
              execSync(`gh run view ${run.databaseId} --log`, { stdio: 'inherit' });
            } catch {
              log(colors.yellow, 'Could not fetch logs (run may still be in progress)');
            }
            await new Promise((resolve) => {
              const rl2 = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
              });
              rl2.question('Press Enter to continue...', () => {
                rl2.close();
                resolve(undefined);
              });
            });
          } else if (action === '3') {
            log(
              colors.green,
              `\n📋 Run URL copied to clipboard:\n   ${colors.cyan}${run.url}${colors.reset}`
            );
            try {
              execSync(`echo "${run.url}" | pbcopy`);
              log(colors.green, '✅ Copied!');
            } catch {
              // pbcopy not available (not macOS)
            }
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        } while (action !== 'b');
      }
    }
  }
}

main().catch((error) => {
  log(colors.red, '❌ Error:', (error as Error).message);
  process.exit(1);
});
