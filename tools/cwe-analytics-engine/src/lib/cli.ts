#!/usr/bin/env node
import { sync, calculateStats } from './sync';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--stats-only')) {
    console.log('Running stats calculation only...');
    await calculateStats();
  } else {
    console.log('Starting CVE/CWE sync...');
    await sync();
  }
}

main().catch((error) => {
  console.error('CLI Error:', error);
  process.exit(1);
});
