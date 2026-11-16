function stamp() {
  return new Date().toISOString();
}

function line(level, args) {
  // eslint-disable-next-line no-console
  console[level](`[${stamp()}] ${level.toUpperCase()}:`, ...args);
}

module.exports = {
  info: (...a) => line('info', a),
  warn: (...a) => line('warn', a),
  error: (...a) => line('error', a),
};
