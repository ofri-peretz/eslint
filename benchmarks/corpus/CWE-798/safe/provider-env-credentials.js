// CWE-798: Safe — provider credentials read from the environment
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — the variable NAMES look like secrets, but no secret value is present in source
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;

function assertConfigured() {
  for (const [name, value] of Object.entries({
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    GITHUB_TOKEN,
    JWT_SECRET,
  })) {
    if (!value) {
      throw new Error(`missing required env var: ${name}`);
    }
  }
}
