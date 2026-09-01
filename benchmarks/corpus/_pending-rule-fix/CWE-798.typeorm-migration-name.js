// CWE-798: safe — a TypeORM migration's `name` is a class identifier, not a secret
// @author        ofri-peretz
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-08-26
// @source        humanprotocol/human-protocol@114980f103659c574efc6cfb06c83a42e83c3998 packages/apps/job-launcher/server/src/database/migrations/*.ts:4
// @sealed        secure-coding/no-hardcoded-credentials
// This MUST NOT be flagged
//
// Every generated TypeORM migration carries this field, so a single repository
// produced roughly twenty findings from one pattern. The trailing digits are a
// timestamp, which is what makes the literal look high-entropy.
class AddRewardTokenToJobTable1733127731356 {
  name = 'AddRewardTokenToJobTable1733127731356';

  async up(queryRunner) {
    await queryRunner.query('ALTER TABLE "jobs" ADD "reward_token" character varying');
  }

  async down(queryRunner) {
    await queryRunner.query('ALTER TABLE "jobs" DROP COLUMN "reward_token"');
  }
}

module.exports = { AddRewardTokenToJobTable1733127731356 };
