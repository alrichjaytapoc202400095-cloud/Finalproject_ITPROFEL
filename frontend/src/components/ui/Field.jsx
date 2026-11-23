import { cloneElement, useId } from 'react';
import { cx } from '../../utils/format.js';

/**
 * Accessible form field wrapper.
 * Accepts either a single input element child (cloned with id/aria props) or
 * a render function `({ id, ...aria }) => <input ... />`.
 */
export default function Field({
  label,
  id,
  error,
  hint,
  required = false,
  children,
  className = '',
  hideLabel = false,
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  const aria = {
    id: inputId,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
  };

  const control = typeof children === 'function' ? children(aria) : cloneElement(children, aria);

  return (
    <div className={cx('field', className)}>
      <label htmlFor={inputId} className={cx('field__label', hideLabel && 'sr-only')}>
        {label}
        {required && <span className="field__required" aria-hidden="true"> *</span>}
      </label>
      {control}
      {hint && !error && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
