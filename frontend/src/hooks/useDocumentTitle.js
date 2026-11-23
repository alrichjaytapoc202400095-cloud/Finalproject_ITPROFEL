import { useEffect } from 'react';

const SUFFIX = 'SPC Book Store';

// Updates the document title per screen (SEO + back-button clarity).
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
  }, [title]);
}
