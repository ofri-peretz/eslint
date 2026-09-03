# AI Security Benchmark — Overnight Statistical Significance Results

This folder contains results from high-iteration overnight benchmark runs
designed for statistical significance testing.

## Run Configuration

- **Models:** All 6 (Claude Opus 4.6, Sonnet 4.5, Haiku 4.5 + Gemini 3 Flash, 3 Pro, 2.5 Flash)
- **Iterations:** 10+ per prompt (configurable via `ITERATIONS` env var)
- **Prompts:** 20 across 5 security-critical domains
- **Rate Limiting:** 5 RPM per provider with 10% safety margin (13.2s between calls)
- **Parallelism:** 2 provider pipelines (Anthropic + Google) running simultaneously

## How to Run

```bash
# Default: 10 iterations, safe rate limits
cd eslint-benchmark-suite
benchmarks/ai-security/run-overnight.sh

# Run unattended (detached from terminal)
nohup benchmarks/ai-security/run-overnight.sh &

# With screen/tmux
screen -S benchmark benchmarks/ai-security/run-overnight.sh

# Customize iterations
ITERATIONS=15 benchmarks/ai-security/run-overnight.sh

# Without remediation
ENABLE_REMEDIATION=false benchmarks/ai-security/run-overnight.sh
```

## Time Estimates

| Iterations | Total Calls | Per Provider | Est. Duration |
| ---------- | ----------- | ------------ | ------------- |
| 5          | 600         | 300          | ~1.2 hours    |
| 10         | 1,200       | 600          | ~2.5 hours    |
| 15         | 1,800       | 900          | ~3.5 hours    |
| 20         | 2,400       | 1,200        | ~4.5 hours    |

## Statistical Goals

With 10 iterations × 20 prompts = 200 data points per model:

- **Wilson Score 95% CI** narrows from ±20% (n=20) to ±7% (n=200)
- **Chi-squared test** can detect real differences as small as 10% between models
- **Per-CWE analysis** becomes statistically meaningful

## File Naming

```
overnight-{model}-{condition}-{iterations}iter-{date}.json
```

Example: `overnight-opus-4.6-treatment-10iter-2026-02-09.json`

## Backups

Each overnight run automatically creates a timestamped backup of existing results
in `backups/pre-overnight-{timestamp}/` before starting.
