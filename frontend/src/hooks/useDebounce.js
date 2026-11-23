import { useEffect, useState } from 'react';

// Delays a rapidly-changing value (search boxes, filters) to avoid a request
// per keystroke. The timer is cleared on every change / unmount.
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
