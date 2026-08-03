/**
 * Shared benchmark runner
 * Used by all plugin benchmarks
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Run ESLint once and return `{ seconds, ok, reason }`.
 *
 * `ok` matters as much as the timing. This used to swallow every failure with
 * "ESLint returns non-zero on lint errors, which is expected" — true for exit
 * code 1, but it also swallowed exit code 2, which is how ESLint reports a rule
 * that threw. A plugin that crashes partway through the corpus exits *early*,
 * so the crash was recorded as a fast run. The bias only ever ran one way:
 * toward flattering whichever plugin failed sooner.
 *
 * Exit codes: 0 = clean, 1 = lint errors found (expected), 2 = fatal.
 */
export function runEslint(configPath, fixtureDir, rootDir) {
  const start = process.hrtime.bigint();

  let ok = true;
  let reason = null;

  try {
    execSync(
      `npx eslint "${fixtureDir}" --config "${configPath}" --no-error-on-unmatched-pattern`,
      {
        cwd: rootDir,
        // Discard stdout: a fixture with many violations emits tens of
        // thousands of report lines, and buffering them overruns execSync's
        // 1 MB maxBuffer, which kills the child with SIGTERM. That looks
        // exactly like a timeout. dense-5000 (20,000 reports) tripped this for
        // both plugins and read as ">300s" when both actually finish in ~5s.
        // Only the exit status and stderr matter here.
        stdio: ['ignore', 'ignore', 'pipe'],
        maxBuffer: 32 * 1024 * 1024,
        timeout: 300000, // 5 min timeout
      }
    );
  } catch (e) {
    if (e.killed || e.signal) {
      ok = false;
      reason = `killed (${e.signal || 'timeout'})`;
    } else if (e.status === 1) {
      // Lint errors found — the expected outcome on fixtures containing cycles.
    } else {
      ok = false;
      const stderr = (e.stderr?.toString() || '').trim().split('\n').slice(-3).join(' | ');
      reason = `exit ${e.status}${stderr ? `: ${stderr}` : ''}`;
    }
  }

  const end = process.hrtime.bigint();
  return { seconds: Number(end - start) / 1e9, ok, reason };
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

    // Interleave the plugins, alternating which one goes first each round.
    //
    // Running all of plugin A's iterations and then all of plugin B's makes the
    // result depend on when the machine happened to be busy: any load that
    // builds during the window lands entirely on whoever runs second. That is a
    // systematic bias, not noise, so more iterations do not cancel it — a
    // sequential run of this suite showed our side at ±0.61 stdev against its
    // usual ±0.06 purely from going second under background load, which read as
    // a 0.8x loss on a shape that is a dead tie when interleaved.
    const times = new Map(plugins.map((p) => [p.name, []]));
    const failures = new Map();

    for (let i = 0; i < iterations; i++) {
      const order = i % 2 === 0 ? plugins : [...plugins].reverse();
      for (const plugin of order) {
        if (failures.has(plugin.name)) continue;
        process.stdout.write(`      Round ${i + 1}/${iterations} — ${plugin.name}\r`);
        const run = runEslint(
          path.join(configsDir, plugin.config),
          fixtureDir,
          path.dirname(fixturesDir)
        );
        if (!run.ok) {
          failures.set(plugin.name, run.reason);
          continue;
        }
        times.get(plugin.name).push(run.seconds);
      }
    }

    for (const plugin of plugins) {
      if (failures.has(plugin.name)) {
        // Record the failure instead of a duration. A crashed run exits early,
        // so timing it would score the crash as a win.
        const reason = failures.get(plugin.name);
        sizeResult.plugins[plugin.name] = { failed: true, reason };
        console.log(`   ❌ ${plugin.name}: FAILED — ${reason}`);
        continue;
      }

      const stats = calculateStats(times.get(plugin.name));
      sizeResult.plugins[plugin.name] = { times: times.get(plugin.name), stats };

      console.log(
        `   ✅ ${plugin.name}: median ${stats.median.toFixed(2)}s (mean ${stats.mean.toFixed(2)}s ±${stats.stdDev.toFixed(2)}s)`
      );
    }

    // Calculate speedup between first two plugins
    const pluginNames = Object.keys(sizeResult.plugins);
    if (pluginNames.length >= 2) {
      const base = sizeResult.plugins[pluginNames[0]];
      const fast = sizeResult.plugins[pluginNames[1]];

      if (base?.failed || fast?.failed) {
        // No ratio is meaningful when one side never completed.
        sizeResult.speedup = null;
        sizeResult.speedupNote = `not comparable — ${
          base?.failed ? pluginNames[0] : pluginNames[1]
        } failed`;
        console.log(`\n   ⚠️  Speedup: n/a (${sizeResult.speedupNote})`);
      } else {
        // Medians, not means. A single outlier is enough to invert the verdict:
        // on wide-5000 the official plugin threw a 6.05s run against a 2.81s
        // median, dragging its mean to 3.70s and making us look 0.9x slower on
        // a shape that is actually a dead tie. This value is written to the
        // result JSON and read by CLAIMS.md, so it has to be the robust one.
        const baseTime = base?.stats.median;
        const fastTime = fast?.stats.median;

        if (baseTime && fastTime) {
          const speedup = (baseTime / fastTime).toFixed(1);
          console.log(`\n   ⚡ Speedup: ${speedup}x faster`);
          sizeResult.speedup = parseFloat(speedup);
        }
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
