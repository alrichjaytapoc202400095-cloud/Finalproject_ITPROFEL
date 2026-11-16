// Input validation middleware (S-04 / T-03): declarative per-route rules -> 422 with field details.
const { AppError } = require('../utils/errors');

function checkField(value, rule, allValues) {
  if (value === undefined || value === null || value === '') {
    return rule.required ? 'This field is required.' : null;
  }
  switch (rule.type) {
    case 'string':
    case 'email':
    case 'objectId':
      if (typeof value !== 'string') return 'Must be text.';
      if (rule.min && value.length < rule.min) return `Must be at least ${rule.min} characters.`;
      if (rule.max && value.length > rule.max) return `Must be at most ${rule.max} characters.`;
      if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Must be a valid email address.';
      if (rule.type === 'objectId' && !/^[0-9a-fA-F]{24}$/.test(value)) return 'Must be a valid id.';
      return null;
    case 'int':
      if (!Number.isInteger(Number(value))) return 'Must be a whole number.';
      if (rule.min !== undefined && Number(value) < rule.min) return `Must be at least ${rule.min}.`;
      if (rule.max !== undefined && Number(value) > rule.max) return `Must be at most ${rule.max}.`;
      return null;
    case 'cents':
      if (!Number.isInteger(Number(value)) || Number(value) < 0) return 'Must be a non-negative integer amount (centavos).';
      return null;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) return 'Must be a number.';
      return null;
    case 'boolean':
      if (typeof value !== 'boolean') return 'Must be true or false.';
      return null;
    case 'enum':
      if (!rule.enumOf.includes(value)) return `Must be one of: ${rule.enumOf.join(', ')}.`;
      return null;
    case 'date':
      if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return 'Must be a valid date (ISO string).';
      return null;
    case 'array':
      if (!Array.isArray(value)) return 'Must be a list.';
      if (rule.max && value.length > rule.max) return `Must have at most ${rule.max} items.`;
      if (rule.min && value.length < rule.min) return `Must have at least ${rule.min} items.`;
      return null;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) return 'Must be an object.';
      return null;
    default:
      return null;
  }
}

// rules: { body: { field: ruleObj }, query: {...}, params: {...} }
// If `pick` is set for a part, unknown fields are stripped (T-03).
function validate(rules) {
  return (req, res, next) => {
    const details = {};
    for (const part of Object.keys(rules)) {
      const source = req[part] || {};
      const partRules = rules[part];
      for (const field of Object.keys(partRules)) {
        if (field.startsWith('__')) continue; // control keys like __pick
        const error = checkField(source[field], partRules[field], source);
        if (error) details[`${part}.${field}`] = error;
      }
      if (partRules.__pick) {
        const allowed = partRules.__pick;
        const clean = {};
        for (const key of allowed) if (source[key] !== undefined) clean[key] = source[key];
        req[part] = clean;
      }
    }
    if (Object.keys(details).length) {
      return next(new AppError(422, 'VALIDATION_ERROR', 'Please check the highlighted fields.', details));
    }
    return next();
  };
}

module.exports = { validate };
