// Client-side validation only. The server repeats every rule and remains the
// authority; these helpers simply give instant, field-level mobile feedback.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(?:\+63|0)9\d{9}$/;

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function validateRegister({ name, email, password, confirmPassword, studentNumber, course, year }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Enter your full name.';
  else if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';

  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address.';

  if (!password) errors.password = 'Choose a password.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';

  if (!confirmPassword) errors.confirmPassword = 'Re-type your password.';
  else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';

  const hasStudentInfo = Boolean(studentNumber.trim() || course.trim() || year.trim());
  if (hasStudentInfo) {
    if (!studentNumber.trim()) errors.studentNumber = 'Enter your student number.';
    if (!course.trim()) errors.course = 'Enter your course.';
    if (!year.trim()) errors.year = 'Enter your year level.';
  }
  return errors;
}

export function validateCheckout(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Enter the recipient name.';
  else if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';

  if (!form.phone.trim()) errors.phone = 'Enter a mobile number.';
  else if (!PHONE_RE.test(form.phone.replace(/[\s-]/g, ''))) {
    errors.phone = 'Use a valid PH mobile number (e.g. 09171234567).';
  }

  if (form.method === 'delivery') {
    if (!form.address.trim()) errors.address = 'Enter the delivery address.';
    else if (form.address.trim().length < 8) errors.address = 'Add a complete street and city address.';
  } else if (!form.pickupSlotId) {
    errors.pickupSlotId = 'Choose a campus pickup slot.';
  }

  if (form.couponCode && form.couponCode.trim().length > 30) {
    errors.couponCode = 'Coupon codes are at most 30 characters.';
  }
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
