// CWE-798: Hardcoded Credentials — GitHub personal access token in source
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — the ghp_ prefix plus 36 base62 chars is GitHub's documented token shape
const GITHUB_TOKEN = 'ghp_16C7e42F292c6912E7710c838347Ae178B4a';

async function listRepos(org) {
  const res = await fetch(`https://api.github.com/orgs/${org}/repos`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
  });
  return res.json();
}
