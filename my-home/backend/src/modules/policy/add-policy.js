const logger = require('../../logger')(module);
const sessionState = require('../../sessionState');

const AUTHORIZED_TYPE = 'AUTHORIZED';

/**
 * Request handler
 * @function requestHandler
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @returns {undefined}
 */
module.exports = function requestHandler(req, res) {
  try {
    const { device, serviceProvider, goal } = req.body;
    const { mamClient } = sessionState[req.sessionId];
    const policy = {
      serviceProvider, // actor
      action: 'read P1 energy data',
      device, // actee
      goal,
      conditions: [],
    };
    const event = { type: AUTHORIZED_TYPE, timestamp: Date.now(), policy };
    mamClient.attach(event);
    return res
      .status(200)
      .send({
        success: true,
        message: 'Created',
        policy,
      });
  } catch (err) {
    logger.error(err.message);
    return res
      .status(500)
      .send({
        success: false,
        message: err,
      });
  }
};
