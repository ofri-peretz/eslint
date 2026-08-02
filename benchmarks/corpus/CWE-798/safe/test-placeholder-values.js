// CWE-798: Safe — obvious test placeholders, not real credentials
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST NOT be flagged — these are self-evident fixtures with no provider pattern and no entropy
const TEST_CREDENTIALS = {
  apiKey: 'test-api-key',
  token: 'xxxxxxxxxxxx',
  password: 'changeme',
  secret: '<your-secret-here>',
};

function buildTestClient(createClient) {
  return createClient({
    baseUrl: 'http://localhost:3000',
    apiKey: TEST_CREDENTIALS.apiKey,
  });
}
