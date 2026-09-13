import { defineConfig } from 'vitest/config';

/**
 * Lock tests for the bench harness itself (not for the benches — those are
 * long-running and network-heavy, and live behind `npm run ilb:*`).
 *
 * Scoped to `__tests__/` so the corpus fixtures under `suites/` are never
 * picked up as test files.
 */
export default defineConfig({
  test: {
    // Repo-wide floor: pre-push runs 47 turbo tasks concurrently, so I/O-bound
    // tests are routinely starved. Vitest's 5s default is tuned for unit tests on
    // an idle machine and mis-reports contention as failure. A hang still fails,
    // just at 30s instead of 5s.
    testTimeout: 30_000,
    // Same rationale as testTimeout above, for setup/teardown: hookTimeout
    // defaults to 10s and is NOT covered by testTimeout, so a beforeAll/afterEach
    // starved by the parallel turbo fan-out fails as "Hook timed out in 10000ms".
    hookTimeout: 30_000,

    environment: 'node',
    watch: false,
    /*
     * These files share an exclusive resource on disk, so they cannot run at
     * the same time.
     *
     * `sealed-vs-open-lock` writes a deliberately invalid
     * `__coherence-probe.test.ts` into eslint-plugin-import-next to prove the
     * rule-case ledger rejects it. `methodology-lock` shells out to that same
     * ledger. Run concurrently — vitest's default across files — the ledger
     * sees the other test's probe and throws, and WHICH of the two fails
     * depends on scheduling, so it reads as a flake in whichever file lost
     * the race rather than as the contention it is.
     *
     * The suite is 12 files and a few seconds; serialising costs nothing worth
     * having.
     */
    fileParallelism: false,
    include: ['__tests__/**/*.test.ts'],
    // configs-load executes the benchmark configs, which import our plugins by
    // package name and therefore resolve through `exports` into `dist/`. The
    // jobs that run this `test` task (the lock jobs and the test shards) do not
    // build, so here it would only ever report a missing dist/ as a broken
    // config. It is pinned to `test:configs-load` and run by the `Benchmark
    // configs load` job, which builds first.
    /*
     * The suites that only mean anything on a BUILT tree. Both load real
     * plugins through their package entry points, which resolve to `dist/`.
     *
     * `real-source-config.lock.test.ts` joined `configs-load` here once this
     * workspace actually started running in CI. It had been in the default
     * task all along, passing or erroring on whether the machine happened to
     * have dists lying around — and `turbo`'s `test` task declares
     * `dependsOn: []`, so a clean checkout has none. Nobody saw it because
     * `@interlace/benchmarks` was invisible to the sharder (see
     * scripts/lib/ci-shard-affected.mts). Both run in the `bench-configs`
     * job, which builds `eslint-plugin-*` and the devkit first.
     */
    exclude: [
      '__tests__/configs-load.test.ts',
      '__tests__/real-source-config.lock.test.ts',
    ],
  },
});
