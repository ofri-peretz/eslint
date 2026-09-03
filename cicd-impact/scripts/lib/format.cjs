// Formatters for money / duration / percent. Used by the report generator.
// All en-US, no localisation needed for an internal report.

const usd = (n, opts = {}) => {
  const { precision = 2, compact = false } = opts;
  if (!Number.isFinite(n)) return 'n/a';
  if (compact && Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(1)}k`;
  }
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
};

const minutes = (n, opts = {}) => {
  const { precision = 1 } = opts;
  if (!Number.isFinite(n)) return 'n/a';
  if (n < 1) return `${(n * 60).toFixed(0)}s`;
  if (n < 60) return `${n.toFixed(precision)} min`;
  return `${(n / 60).toFixed(1)} h`;
};

const percent = (n, opts = {}) => {
  const { precision = 1 } = opts;
  if (!Number.isFinite(n)) return 'n/a';
  return `${(n * 100).toFixed(precision)}%`;
};

const number = (n, opts = {}) => {
  const { precision = 0 } = opts;
  if (!Number.isFinite(n)) return 'n/a';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
};

// Diff in minutes between two ISO timestamps. Returns null if either is missing.
const isoMinutesBetween = (start, end) => {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return null;
  return (e - s) / 60000;
};

// Percentile from a sorted-or-unsorted array. Returns null for empty input.
const percentile = (arr, p) => {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

const mean = (arr) => {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
};

module.exports = { usd, minutes, percent, number, isoMinutesBetween, percentile, mean };
