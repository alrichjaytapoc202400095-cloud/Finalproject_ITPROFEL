// Reusable validation rule builders used by routes (validators layer).
const R = {
  email: (required = true) => ({ type: 'email', required, max: 120 }),
  password: (required = true) => ({ type: 'string', required, min: 8, max: 72 }),
  string: (required = true, min = 1, max = 200) => ({ type: 'string', required, min, max }),
  text: (required = true, max = 4000) => ({ type: 'string', required, max }),
  objectId: (required = true) => ({ type: 'objectId', required }),
  int: (required = true, min = 0, max = 100000) => ({ type: 'int', required, min, max }),
  cents: (required = true) => ({ type: 'cents', required }),
  bool: (required = true) => ({ type: 'boolean', required }),
  date: (required = true) => ({ type: 'date', required }),
  enumOf: (values, required = true) => ({ type: 'enum', required, enumOf: values }),
  array: (required = true, min = 0, max = 50) => ({ type: 'array', required, min, max }),
  object: (required = true) => ({ type: 'object', required }),
};

module.exports = R;
