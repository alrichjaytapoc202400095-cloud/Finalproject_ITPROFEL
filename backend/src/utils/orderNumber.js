const crypto = require('crypto');

function newOrderNumber() {
  return `SPC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

module.exports = { newOrderNumber };
