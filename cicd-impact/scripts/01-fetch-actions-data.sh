#!/usr/bin/env bash
# Fetch GitHub Actions workflow runs and per-run jobs for the target repo's
# CI/CD workflow, write to cicd-impact/data/. Idempotent: if data files exist
# and are <24h old, exit. Use --refresh to force re-fetch.
#
# Required: REPO=<owner>/<repo>. Optional: WORKFLOW_FILE (default: ci-cd.yml).
# Requires: gh (authenticated), jq
#
# Output:
#   data/runs-90d.json       - workflow runs (id, status, conclusion, timings, actor)
#   data/jobs-90d.json       - per-job timings (one entry per job, run_id linked)
#   data/actors-90d.txt      - distinct actors (login per line, count appended)
#   data/fetched-at.txt      - ISO timestamp of last successful fetch
#
# Usage:
#   ./01-fetch-actions-data.sh                # use cache if fresh
#   ./01-fetch-actions-data.sh --refresh      # force re-fetch
#   ./01-fetch-actions-data.sh --window 30    # last N days instead of 90
set -euo pipefail

# Target repo and workflow. Override at the call site:
#   REPO=Acme/web-app WORKFLOW_FILE=build.yml ./01-fetch-actions-data.sh
REPO="${REPO:-OWNER/REPO}"
WORKFLOW_FILE="${WORKFLOW_FILE:-ci-cd.yml}"
WINDOW_DAYS=90
REFRESH=0

if [[ "$REPO" == "OWNER/REPO" ]]; then
  echo "REPO not set. Either edit this script or invoke as:" >&2
  echo "  REPO=<owner>/<repo> WORKFLOW_FILE=<workflow.yml> $0" >&2
  exit 1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --refresh) REFRESH=1; shift ;;
    --window)  WINDOW_DAYS="$2"; shift 2 ;;
    -h|--help)
      sed -n '1,/^set /p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

DATA_DIR="$(cd "$(dirname "$0")/.." && pwd)/data"
mkdir -p "$DATA_DIR"

if ! command -v gh >/dev/null; then echo "gh not found" >&2; exit 1; fi
if ! command -v jq >/dev/null; then echo "jq not found" >&2; exit 1; fi

# --- Cache check -------------------------------------------------------------
FETCHED_AT_FILE="$DATA_DIR/fetched-at.txt"
if [[ "$REFRESH" -eq 0 && -f "$FETCHED_AT_FILE" ]]; then
  age_seconds=$(( $(date +%s) - $(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$(cat "$FETCHED_AT_FILE")" +%s 2>/dev/null || echo 0) ))
  if [[ "$age_seconds" -lt 86400 ]]; then
    echo "Data is ${age_seconds}s old (<24h). Skipping fetch. Use --refresh to force."
    exit 0
  fi
fi

# --- Compute the cutoff date (BSD date on macOS) -----------------------------
CUTOFF=$(date -u -v-"${WINDOW_DAYS}"d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || \
         date -u -d "${WINDOW_DAYS} days ago" +%Y-%m-%dT%H:%M:%SZ)

echo "Fetching CI/CD runs since $CUTOFF (window: ${WINDOW_DAYS} days)..."

# --- Step 1: workflow runs (paginated, filter by created>=cutoff) ------------
# The Actions API caps at 1000 results per query but supports a `created` filter.
# We page through until we hit a run before the cutoff.
RUNS_TMP="$(mktemp)"
trap 'rm -f "$RUNS_TMP"' EXIT

gh api --paginate \
  "repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=100&created=>=${CUTOFF}" \
  -q '.workflow_runs[] | {
        id,
        run_number,
        event,
        status,
        conclusion,
        created_at,
        run_started_at,
        updated_at,
        head_branch,
        head_sha,
        actor: (.actor.login // null),
        triggering_actor: (.triggering_actor.login // null),
        run_attempt
      }' > "$RUNS_TMP"

# Wrap NDJSON into a JSON array
jq -s '.' "$RUNS_TMP" > "$DATA_DIR/runs-90d.json"
RUNS_COUNT=$(jq 'length' "$DATA_DIR/runs-90d.json")
echo "  -> $RUNS_COUNT runs in window"

# --- Step 2: jobs for each run -----------------------------------------------
# This is N API calls (one per run). For large windows (~500 runs) this is the
# slow step but still runs in a few minutes. We cache and only fetch missing.
JOBS_OUT="$DATA_DIR/jobs-90d.json"
JOBS_TMP="$(mktemp)"
trap 'rm -f "$RUNS_TMP" "$JOBS_TMP"' EXIT

# Build a set of run_ids we already have (resume support)
EXISTING_IDS=""
if [[ -f "$JOBS_OUT" && "$REFRESH" -eq 0 ]]; then
  EXISTING_IDS=$(jq -r 'map(.run_id) | unique | .[]' "$JOBS_OUT" 2>/dev/null || true)
fi

i=0
total=$RUNS_COUNT
> "$JOBS_TMP"
[[ -f "$JOBS_OUT" ]] && cat "$JOBS_OUT" | jq -c '.[]' >> "$JOBS_TMP" 2>/dev/null || true

for run_id in $(jq -r '.[].id' "$DATA_DIR/runs-90d.json"); do
  i=$((i + 1))
  if echo "$EXISTING_IDS" | grep -qx "$run_id"; then
    continue
  fi

  if (( i % 25 == 0 )); then
    echo "  -> fetching jobs ${i}/${total}..."
  fi

  # Each job: name, status, conclusion, created_at (queued), started_at (running),
  # completed_at, runner_name. We tag run_id and run-level metadata for joinability.
  gh api "repos/${REPO}/actions/runs/${run_id}/jobs" --paginate \
    -q ".jobs[] | {
          run_id,
          job_id: .id,
          name,
          status,
          conclusion,
          created_at,
          started_at,
          completed_at,
          runner_name,
          run_attempt
        }" >> "$JOBS_TMP" 2>/dev/null || echo "    !! failed for run $run_id (continuing)" >&2
done

jq -s 'unique_by(.job_id)' "$JOBS_TMP" > "$JOBS_OUT"
JOBS_COUNT=$(jq 'length' "$JOBS_OUT")
echo "  -> $JOBS_COUNT jobs total"

# --- Step 3: distinct actors -------------------------------------------------
ACTORS_OUT="$DATA_DIR/actors-90d.txt"
jq -r '[.[] | .actor // empty] | unique | .[]' "$DATA_DIR/runs-90d.json" > "$ACTORS_OUT"
ACTORS_COUNT=$(wc -l < "$ACTORS_OUT" | tr -d ' ')
echo "  -> $ACTORS_COUNT distinct actors"
echo "# Distinct actors: $ACTORS_COUNT" >> "$ACTORS_OUT"

# --- Step 4: stamp fetch time ------------------------------------------------
date -u +%Y-%m-%dT%H:%M:%SZ > "$FETCHED_AT_FILE"

echo "Done. Outputs:"
echo "  $DATA_DIR/runs-90d.json   ($RUNS_COUNT runs)"
echo "  $DATA_DIR/jobs-90d.json   ($JOBS_COUNT jobs)"
echo "  $DATA_DIR/actors-90d.txt  ($ACTORS_COUNT actors)"
