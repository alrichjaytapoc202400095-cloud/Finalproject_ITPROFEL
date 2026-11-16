// All money in the system is an integer number of CENTAVOS (never floating point).
// 45000 centavos = PHP 450.00
function toCents(pesos) {
  return Math.round(Number(pesos) * 100);
}

function fromCents(cents) {
  return Number(cents) / 100;
}

function formatPeso(cents) {
  return `PHP ${(Number(cents) / 100).toFixed(2)}`;
}

module.exports = { toCents, fromCents, formatPeso };
