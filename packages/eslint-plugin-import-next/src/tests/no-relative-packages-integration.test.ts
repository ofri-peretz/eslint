/**
 * Integration tests for no-relative-packages rule
 * 
 * NOTE: These tests are currently skipped because @typescript-eslint/rule-tester
 * does not allow dynamic file system setup before running tests. The ruleTester.run()
 * executes at module load time, before beforeAll hooks run.
 * 
 * The unit tests in no-relative-packages-unit.test.ts provide coverage using mocks.
 * 
 * TODO: Restructure these tests to use manual ESLint API calls instead of RuleTester
 * if real file system integration testing is needed.
 */
import { describe, it } from 'vitest';

describe.skip('no-relative-packages - Integration Tests', () => {
  it('placeholder - integration tests need restructuring', () => {
    // See note at top of file
    // Unit tests provide coverage via mocking
  });
});
