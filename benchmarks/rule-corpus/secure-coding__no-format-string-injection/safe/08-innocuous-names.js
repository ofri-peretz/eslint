/**
 * SAFE (false-negative direction, inverted) - Ordinary reporting code whose
 * identifiers happen to be spelled like the default userInputVariables list:
 * `requestId` contains `request`, `bodyText` contains `body`, `queryPlan`
 * contains `query`, `inputRef` contains `input`.
 *
 * Not one of them comes off a request, and not one of them is a format string.
 */
function summarise(row) {
  const requestId = row.id;
  const bodyText = row.renderedBody;
  const queryPlan = row.explain;
  const inputRef = row.sourceRef;

  console.error(requestId, bodyText);
  console.log(queryPlan, inputRef);
  return { requestId, bodyText, queryPlan, inputRef };
}

module.exports = { summarise };
