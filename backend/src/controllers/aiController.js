const container = require('../services/container');
const { ok } = require('../utils/response');

exports.assistant = async (req, res) => {
  const result = await container.aiService.ask(req.body.question);
  ok(res, result);
};
