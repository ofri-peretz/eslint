/**
 * Shared benchmark runner
 * Used by all plugin benchmarks
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export function runEslint(configPath, fixtureDir, rootDir) {
  const start = process.hrtime.bigint();
  
  try {
    execSync(`npx eslint "${fixtureDir}" --config "${configPath}" --no-error-on-unmatched-pattern 2>/dev/null`, {
      cwd: rootDir,
      stdio: 'pipe',
      timeout: 300000, // 5 min timeout
    });
  } catch (e) {
    // ESLint returns non-zero on lint errors, which is expected
  }
  
  const end = process.hrtime.bigint();
  return Number(end - start) / 1e9; // Convert to seconds
}

export function runBenchmark(options) {
  const { 
    name,
    plugins, 
    fixtureSizes, 
    fixturesDir, 
    configsDir,
    iterations = 10 
  } = options;

  console.log(`\n🚀 ${name} Benchmark\n`);
  console.log(`   Iterations: ${iterations}`);
  console.log(`   Plugins: ${plugins.map(p => p.name).join(', ')}`);
  console.log(`   Fixture sizes: ${fixtureSizes.join(', ')}\n`);
  console.log('─'.repeat(60));

  const results = {
    benchmark: name,
    timestamp: new Date().toISOString(),
    iterations,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    results: [],
  };

  for (const size of fixtureSizes) {
    const fixtureDir = path.join(fixturesDir, String(size));
    
    if (!fs.existsSync(fixtureDir)) {
      console.log(`\n⚠️  Fixture ${size} not found. Run generate first.`);
      continue;
    }

    console.log(`\n📁 Benchmarking ${size.toLocaleString()} files:\n`);

    const sizeResult = { size, plugins: {} };

    for (const plugin of plugins) {
      console.log(`   🔄 ${plugin.name}...`);
      
      const times = [];
      const configPath = path.join(configsDir, plugin.config);
      
      for (let i = 0; i < iterations; i++) {
        process.stdout.write(`      Run ${i + 1}/${iterations}\r`);
        const time = runEslint(configPath, fixtureDir, path.dirname(fixturesDir));
        times.push(time);
      }
      
      const stats = calculateStats(times);
      sizeResult.plugins[plugin.name] = { times, stats };
      
      console.log(`   ✅ ${plugin.name}: ${stats.mean.toFixed(2)}s (±${stats.stdDev.toFixed(2)}s)`);
    }

    // Calculate speedup between first two plugins
    const pluginNames = Object.keys(sizeResult.plugins);
    if (pluginNames.length >= 2) {
      const baseTime = sizeResult.plugins[pluginNames[0]]?.stats.mean;
      const fastTime = sizeResult.plugins[pluginNames[1]]?.stats.mean;
      
      if (baseTime && fastTime) {
        const speedup = (baseTime / fastTime).toFixed(1);
        console.log(`\n   ⚡ Speedup: ${speedup}x faster`);
        sizeResult.speedup = parseFloat(speedup);
      }
    }

    results.results.push(sizeResult);
  }

  return results;
}

export function calculateStats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  const mean = sum / times.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  const variance = times.reduce((acc, t) => acc + Math.pow(t - mean, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  
  return { mean, median, min, max, stdDev };
}

export function printSummaryTable(results) {
  console.log('\n📊 Summary:\n');
  console.log('| Files | Plugin 1 | Plugin 2 | Speedup |');
  console.log('|-------|----------|----------|---------|');
  
  for (const result of results.results) {
    const pluginNames = Object.keys(result.plugins);
    const stats1 = result.plugins[pluginNames[0]]?.stats;
    const stats2 = result.plugins[pluginNames[1]]?.stats;
    
    if (stats1 && stats2) {
      console.log(`| ${result.size.toLocaleString().padEnd(5)} | ${stats1.mean.toFixed(2)}s | ${stats2.mean.toFixed(2)}s | ${result.speedup}x |`);
    }
  }
}
