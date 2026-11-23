import Icon from './Icon.jsx';

// 44x44 thumb-friendly quantity stepper. Live region announces the new value.
export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  label = 'Quantity',
  size = 'normal',
}) {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div className={`stepper stepper--${size}`} role="group" aria-label={label}>
      <button
        type="button"
        className="stepper__btn"
        onClick={decrease}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <Icon name="minus" size={16} />
      </button>
      <output className="stepper__value" aria-live="polite" aria-label={`${label}: ${value}`}>
        {value}
      </output>
      <button
        type="button"
        className="stepper__btn"
        onClick={increase}
        disabled={disabled || value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
