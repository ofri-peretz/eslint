// CWE-1007: Invisible Hangul filler (U+3164) hiding an array element from review
// @author      claude-sonnet-5-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-10-26
// This MUST be detected — the second command ends in a real U+3164 after the comma, which every editor draws as nothing, so the array has a third element no reviewer can see
const HEALTH_COMMANDS = [
  'ping -c 1 internal.example.com',
  'curl -s http://internal.example.com/health',ㅤ
];

async function runHealthChecks(run) {
  const results = [];
  for (const command of HEALTH_COMMANDS) {
    results.push(await run(command));
  }
  return results;
}
