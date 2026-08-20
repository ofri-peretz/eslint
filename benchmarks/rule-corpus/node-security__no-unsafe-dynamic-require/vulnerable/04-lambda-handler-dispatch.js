/**
 * VULNERABLE - Lambda dispatcher. `event.pathParameters` is attacker-supplied,
 * and the layer filesystem contains far more than the handlers directory.
 */
exports.handler = async (event) => {
  const handlerModule = require('/opt/nodejs/handlers/' + event.pathParameters.name);
  return handlerModule.run(event);
};
