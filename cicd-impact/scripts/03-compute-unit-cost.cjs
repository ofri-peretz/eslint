#!/usr/bin/env node
// Combine measured metrics (data/metrics.json) with executive inputs
// (inputs.yml) to produce the headline unit cost ($/CI minute) and a
// sensitivity table.
//
// Formula (from plan, simplified):
//
//   cost_per_ci_minute =
//       D × R × W                              <- direct waste base
//     × (1 + S(T_dur+T_queue) / (T_dur+T_queue))    <- piecewise cognitive tax
//     × (1 + F × K)                            <- failure rework with blast radius
//
// Annualised:
//   C_annual = cost_per_ci_minute × (T_dur + T_queue) × R × D × business_days
//
// Outputs:
//   outputs/unit-cost.json
//   outputs/sensitivity.csv
//
// Usage: ./03-compute-unit-cost.cjs [--inputs path] [--metrics path] [--outdir path]
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('./lib/yaml-lite.cjs');
const fmt = require('./lib/format.cjs');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const root = path.join(__dirname, '..');
const inputsPath = arg('--inputs', path.join(root, 'inputs.yml'));
const metricsPath = arg('--metrics', path.join(root, 'data', 'metrics.json'));
const outDir = arg('--outdir', path.join(root, 'outputs'));
fs.mkdirSync(outDir, { recursive: true });

const inputs = yaml.parse(fs.readFileSync(inputsPath, 'utf8'));
const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));

// --- Resolve inputs ----------------------------------------------------------
const W = inputs.wage_per_minute_usd;
const D = inputs.active_developers ?? metrics.D_distinct_actors;
const R = metrics.R_runs_per_business_day;
const T_dur = metrics.T_dur_minutes.mean;
const T_queue = metrics.T_queue_minutes.mean;
const T_pipeline = T_dur + T_queue; // total wall-clock the dev waits on
const F_measured = metrics.F_failure_rate.policy_adjusted;
const K_input = inputs.blast_radius_multiplier;
const K = K_input ?? metrics.blast_radius_empirical.multiplier;
const businessDays = inputs.working_days_per_year;

// --- Piecewise cognitive tax -------------------------------------------------
// inputs.cognitive_tax_minutes = {short: 0, medium: 5, long: 23}
// thresholds                   = {short_threshold: 2, long_threshold: 10}
const taxMin = inputs.cognitive_tax_minutes;
const thresholds = inputs.cognitive_tax_thresholds_minutes;

const cognitiveS = (waitMinutes) => {
  if (waitMinutes < thresholds.short_threshold) return taxMin.short;
  if (waitMinutes < thresholds.long_threshold) return taxMin.medium;
  return taxMin.long;
};

const S_for_pipeline = cognitiveS(T_pipeline);

// --- The formula -------------------------------------------------------------
// "How many dev-minutes does each minute of pipeline cost the org?"
//
// Per-pipeline-minute, we pay:
//   1.  D × R × W           — every dev's pro-rated wage during a build.
//   ×  (1 + S/T_pipeline)   — cognitive tax amortised over the wait.
//   ×  (1 + F × K)          — rework + spillover when the build fails.
//
// Note: the first term is "per build started, per minute waited, per developer
// affected" — D × R amortises across the org's actual push cadence. If only
// 1 dev pushes once a day, the per-minute cost is ~W. If 20 devs push 4 times
// each, it's 80 × W.
const directCostPerMin = D * R * W / businessDays;
// (We divide by business days because R is *per business day* but we want a
// per-minute rate normalised across a working year. Equivalently: 1 build of
// 10 min costs the org 10 × directCostPerMin × business_days when annualised.)
//
// Cleaner derivation:
//   annual direct waste = D × R × T_pipeline × W × business_days
//                       = (D × R × W) × T_pipeline × business_days
// So $/min direct = D × R × W × business_days / business_days = D × R × W.
// We use that simpler form here.
const directCostPerMin_clean = D * R * W;

const cognitiveMultiplier = 1 + (S_for_pipeline / T_pipeline);
const reworkMultiplier = 1 + (F_measured * K);

const costPerCiMinute = directCostPerMin_clean * cognitiveMultiplier * reworkMultiplier;

// --- Annualised TCO ----------------------------------------------------------
const annualPipelineMinutes = T_pipeline * R * businessDays;
const annualCost = costPerCiMinute * annualPipelineMinutes;
// Equivalent decomposition for the report:
const annualDirect = directCostPerMin_clean * annualPipelineMinutes;
const annualCognitive = annualDirect * (cognitiveMultiplier - 1);
const annualRework = (annualDirect + annualCognitive) * (reworkMultiplier - 1);

// --- Sensitivity sweep -------------------------------------------------------
const sens = inputs.sensitivity;
const wageMults = sens.wage_multipliers;
const krMults = sens.blast_radius_multipliers;
const fOverrides = sens.ci_failure_rate_overrides; // null = use measured

const rows = [];
rows.push(['wage_multiplier', 'wage_per_min', 'K_blast_radius', 'F_used', 'cost_per_ci_min', 'annual_cost']);

for (const wm of wageMults) {
  for (const km of krMults) {
    for (const fo of fOverrides) {
      const W2 = W * wm;
      const F2 = fo == null ? F_measured : fo;
      const K2 = km;
      const direct2 = D * R * W2;
      const cog2 = 1 + (S_for_pipeline / T_pipeline);
      const rew2 = 1 + (F2 * K2);
      const cpm = direct2 * cog2 * rew2;
      const annual = cpm * annualPipelineMinutes;
      rows.push([
        wm.toFixed(2),
        W2.toFixed(2),
        K2.toFixed(2),
        F2.toFixed(3),
        cpm.toFixed(2),
        Math.round(annual),
      ]);
    }
  }
}

const csv = rows.map((r) => r.join(',')).join('\n') + '\n';
fs.writeFileSync(path.join(outDir, 'sensitivity.csv'), csv);

// --- Headline output ---------------------------------------------------------
const result = {
  generated_at: new Date().toISOString(),
  headline: {
    cost_per_ci_minute_usd: Number(costPerCiMinute.toFixed(2)),
    cost_per_ci_second_usd: Number((costPerCiMinute / 60).toFixed(4)),
    annual_cost_usd: Math.round(annualCost),
  },
  decomposition: {
    direct_per_min: Number(directCostPerMin_clean.toFixed(2)),
    cognitive_multiplier: Number(cognitiveMultiplier.toFixed(3)),
    rework_multiplier: Number(reworkMultiplier.toFixed(3)),
    annual_direct: Math.round(annualDirect),
    annual_cognitive: Math.round(annualCognitive),
    annual_rework: Math.round(annualRework),
  },
  inputs_resolved: {
    W_wage_per_min_usd: W,
    D_active_developers: D,
    D_source: inputs.active_developers == null ? 'measured' : 'override',
    R_runs_per_business_day: R,
    T_dur_mean_min: T_dur,
    T_queue_mean_min: T_queue,
    T_pipeline_min: T_pipeline,
    F_failure_rate: F_measured,
    K_blast_radius: K,
    K_source: K_input == null ? 'empirical' : 'override',
    S_cognitive_min: S_for_pipeline,
    S_band: T_pipeline < thresholds.short_threshold
      ? 'short'
      : T_pipeline < thresholds.long_threshold
        ? 'medium'
        : 'long',
    business_days_per_year: businessDays,
  },
  context: {
    annual_pipeline_minutes: Math.round(annualPipelineMinutes),
    metrics_window: metrics.window,
  },
};

fs.writeFileSync(path.join(outDir, 'unit-cost.json'), JSON.stringify(result, null, 2));

// --- Console output ----------------------------------------------------------
console.log('='.repeat(64));
console.log(`CI/CD Unit Cost — ${process.env.REPO || '<unspecified-repo>'}`);
console.log('='.repeat(64));
console.log();
console.log(`Headline:`);
console.log(`  $/CI minute: ${fmt.usd(costPerCiMinute)}`);
console.log(`  $/CI second: ${fmt.usd(costPerCiMinute / 60, { precision: 4 })}`);
console.log(`  Annualised:  ${fmt.usd(annualCost, { compact: true })}`);
console.log();
console.log(`Decomposition (annual):`);
console.log(`  Direct waste:    ${fmt.usd(annualDirect, { compact: true })}`);
console.log(`  Cognitive tax:   ${fmt.usd(annualCognitive, { compact: true })}  (×${(cognitiveMultiplier - 1).toFixed(2)})`);
console.log(`  Failure rework:  ${fmt.usd(annualRework, { compact: true })}  (×${(reworkMultiplier - 1).toFixed(2)})`);
console.log();
console.log(`Resolved inputs:`);
console.log(`  W (wage/min):     ${fmt.usd(W)}/min`);
console.log(`  D (devs):         ${D} (${inputs.active_developers == null ? 'measured' : 'override'})`);
console.log(`  R (runs/biz-day): ${R.toFixed(1)}`);
console.log(`  T_dur:            ${fmt.minutes(T_dur)}`);
console.log(`  T_queue:          ${fmt.minutes(T_queue)}`);
console.log(`  F (failure rate): ${fmt.percent(F_measured)}`);
console.log(`  K (blast radius): ${K.toFixed(2)} (${K_input == null ? 'empirical' : 'override'})`);
console.log(`  S (cog. tax):     ${S_for_pipeline} min  (band: ${result.inputs_resolved.S_band})`);
console.log();
console.log(`Sensitivity table: ${path.join(outDir, 'sensitivity.csv')}`);
console.log(`Headline JSON:     ${path.join(outDir, 'unit-cost.json')}`);
