#!/bin/bash
#
# AI Security Benchmark — Overnight CLI Runner
#
# Runs Claude CLI and Gemini CLI models in PARALLEL pipelines with
# per-provider rate limiting to maximize throughput without hitting quotas.
#
# Models:
#   Claude Pipeline:  Opus 4.6, Sonnet 4.5, Haiku 4.5  (via claude --print)
#   Gemini Pipeline:  2.5 Flash, 2.5 Pro               (via gemini -p)
#
# Rate Limits (optimized per-provider):
#   - Anthropic (Claude Pro):  2s delay (Pro is usage/hour-based, not strict RPM)
#     Response time ~5s (Haiku) to ~15s (Opus) provides natural spacing
#   - Gemini CLI (Google):     2s delay (60 RPM limit, natural ~18s response time)
#   - Gemini RPD budget:       ~462 calls total (well under 1,000/day limit)
#
# Time Estimate (7 iterations, 20 prompts, 5 CLI models):
#   ── Anthropic Pipeline (3 models × 20 prompts × 7 iter = 420 gen calls)
#      With ~65% remediation:  420 + ~273 = ~693 calls
#      At ~7s effective (5s response + 2s delay): ~1.35 hours
#
#   ── Google Pipeline (2 models × 20 prompts × 7 iter = 280 gen calls)
#      With ~65% remediation:  280 + ~182 = ~462 calls
#      At ~20s effective (18s response + 2s delay): ~2.5 hours
#
#   Both pipelines run in PARALLEL → wall clock: ~2.5 hours
#
# Usage:
#   chmod +x benchmarks/ai-security/run-overnight.sh
#   nohup benchmarks/ai-security/run-overnight.sh &
#   # Or with screen/tmux:
#   screen -S benchmark benchmarks/ai-security/run-overnight.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUITE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Configuration ──────────────────────────────────────
ITERATIONS="${ITERATIONS:-7}"
# Per-provider rate limits (optimized for maximum safe throughput)
RATE_LIMIT_ANTHROPIC="${RATE_LIMIT_ANTHROPIC:-2000}"   # 2s delay (Claude Pro is usage/hour-based, natural ~5-15s response)
RATE_LIMIT_GOOGLE="${RATE_LIMIT_GOOGLE:-2000}"         # 2s = ~30 RPM (well under 60 RPM limit, ~462 calls under 1000 RPD)
OUTPUT_PREFIX="${OUTPUT_PREFIX:-overnight}"
ENABLE_REMEDIATION="${ENABLE_REMEDIATION:-true}"

# Models to benchmark (CLI-only for true zero-context isolation)
# Claude CLI models
CLAUDE_MODELS="${CLAUDE_MODELS:-opus-4.6,sonnet-4.5,haiku-4.5}"
# Gemini CLI models
GEMINI_MODELS="${GEMINI_MODELS:-gemini-2.5-flash-cli,gemini-2.5-pro-cli}"
# Combined for --model flag
ALL_MODELS="${CLAUDE_MODELS},${GEMINI_MODELS}"

# ── Timestamp ──────────────────────────────────────────
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
RESULTS_DIR="$SUITE_DIR/results/ai-security-overnight"
LOG_FILE="$RESULTS_DIR/overnight-${TIMESTAMP}.log"
mkdir -p "$RESULTS_DIR"

# ── Pre-flight checks ─────────────────────────────────
echo "═══════════════════════════════════════════════════════════"
echo "🌙 Overnight CLI Benchmark — Pre-flight Checks"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check Claude CLI
if command -v claude &> /dev/null; then
  CLAUDE_VERSION=$(claude --version 2>&1 | head -1)
  echo "  ✅ Claude CLI:   $CLAUDE_VERSION"
else
  echo "  ❌ Claude CLI:   NOT FOUND — install from https://docs.anthropic.com/en/docs/claude-code"
  echo "     Skipping Claude models."
  CLAUDE_MODELS=""
  ALL_MODELS="${GEMINI_MODELS}"
fi

# Check Gemini CLI
if command -v gemini &> /dev/null; then
  GEMINI_VERSION=$(gemini --version 2>&1 | head -1)
  echo "  ✅ Gemini CLI:   $GEMINI_VERSION"
else
  echo "  ❌ Gemini CLI:   NOT FOUND — install from https://github.com/google-gemini/gemini-cli"
  echo "     Skipping Gemini models."
  GEMINI_MODELS=""
  ALL_MODELS="${CLAUDE_MODELS}"
fi

# Check API key for Gemini SDK fallback (not strictly needed for CLI, but loaded by dotenv)
if [ -f "$SUITE_DIR/.env" ]; then
  echo "  ✅ .env file:    found"
else
  echo "  ⚠️  .env file:   not found (Gemini API key may be needed)"
fi

echo ""

# Abort if no models
if [ -z "$ALL_MODELS" ]; then
  echo "❌ No CLI tools available. Install claude or gemini CLI and try again."
  exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "🌙 Overnight CLI Benchmark — Starting"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Started:     $(date)"
echo "  Models:      $ALL_MODELS"
echo "  Iterations:  $ITERATIONS per prompt"
echo "  Rate Limit:  Anthropic=${RATE_LIMIT_ANTHROPIC}ms (~$((60000 / RATE_LIMIT_ANTHROPIC)) RPM) | Google=${RATE_LIMIT_GOOGLE}ms (~$((60000 / RATE_LIMIT_GOOGLE)) RPM)"
echo "  Remediation: $ENABLE_REMEDIATION"
echo "  Log File:    $LOG_FILE"
echo ""
echo "  Estimated duration: ~2.5 hours (7 iterations, parallel pipelines, optimized rate limits)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── Backup existing results ────────────────────────────
BACKUP_DIR="$RESULTS_DIR/backups/pre-overnight-${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"
cp "$SUITE_DIR/results/ai-security/"*.json "$BACKUP_DIR/" 2>/dev/null || true
cp "$RESULTS_DIR/"*.json "$BACKUP_DIR/" 2>/dev/null || true
echo "📦 Backed up existing results to: $BACKUP_DIR"
echo ""

# ── Build the CLI arguments ───────────────────────────
REMEDIATION_FLAG=""
if [ "$ENABLE_REMEDIATION" = "false" ]; then
  REMEDIATION_FLAG="--no-remediation"
fi

# ── Run all models ─────────────────────────────────────
echo "🚀 Starting benchmark..."
echo ""

cd "$SUITE_DIR"

node benchmarks/ai-security/run-antigravity.js \
  --model="$ALL_MODELS" \
  --iterations="$ITERATIONS" \
  --rate-limit-anthropic="$RATE_LIMIT_ANTHROPIC" \
  --rate-limit-google="$RATE_LIMIT_GOOGLE" \
  --output-prefix="$OUTPUT_PREFIX" \
  --resume \
  $REMEDIATION_FLAG \
  2>&1 | tee "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "═══════════════════════════════════════════════════════════"
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Overnight benchmark completed successfully!"
else
  echo "⚠️  Benchmark exited with code $EXIT_CODE"
fi
echo "  Finished:  $(date)"
echo "  Log:       $LOG_FILE"
echo "  Results:   $SUITE_DIR/results/ai-security/"
echo "═══════════════════════════════════════════════════════════"
