import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Resets scroll on every route change (mobile SPAs otherwise keep the old offset).
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
