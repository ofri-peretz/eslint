/**
 * SAFE - Ordinary structured logging in a payments module. Nothing here comes
 * off a request: `paymentData` is built from the database row, `orderMetadata`
 * from the fulfilment service, `validationParams` from this file's own
 * constants.
 *
 * All three contain a word from the default userInputVariables list as a
 * SUBSTRING (`data`, `data`, `params`), which is the whole point of the
 * fixture: spelling is not provenance.
 */
function auditSettlement(paymentData, orderMetadata) {
  const validationParams = { retries: 3, window: '24h' };

  console.error(paymentData, orderMetadata);
  console.info(validationParams, paymentData.settlementId);
  console.log(orderMetadata, validationParams);
}

module.exports = { auditSettlement };
