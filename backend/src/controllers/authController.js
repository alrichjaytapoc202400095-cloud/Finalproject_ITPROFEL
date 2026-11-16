const container = require('../services/container');
const { ok, created } = require('../utils/response');

exports.register = async (req, res) => {
  const result = await container.authService.register(req.body);
  created(res, result);
};

exports.login = async (req, res) => {
  const result = await container.authService.login(req.body);
  ok(res, result);
};

exports.me = async (req, res) => {
  ok(res, await container.authService.me(req.user.id));
};

exports.submitStudentVerification = async (req, res) => {
  ok(res, await container.authService.submitStudentVerification(req.user.id, req.body));
};
