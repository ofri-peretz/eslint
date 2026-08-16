/**
 * SAFE - One argument. There is nothing after the message for a specifier to
 * consume, so console prints the user's `%s` literally. This is the shape a
 * request logger writes thousands of times a day.
 */
function logRejection(req) {
  console.warn(req.body.message);
  console.log(req.query.reason);
}

module.exports = { logRejection };
