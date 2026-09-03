/**
 * SAFE - Destructuring, same as the vulnerable fixture, from a domain object
 * loaded out of the database rather than from a request. The names bound are
 * `template` and `data` — both spelled like the thing the rule hunts.
 */
const util = require('node:util');

async function renderNotification(notificationRepository, notificationId) {
  const record = await notificationRepository.findById(notificationId);
  const { template, payload } = record;

  return util.format(template, payload.recipientName, payload.amountDue);
}

module.exports = { renderNotification };
