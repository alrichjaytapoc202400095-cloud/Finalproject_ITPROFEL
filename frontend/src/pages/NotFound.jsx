import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import Icon from '../components/ui/Icon.jsx';

export default function NotFound() {
  useDocumentTitle('Page not found');

  return (
    <div className="page not-found">
      <div className="not-found__art" aria-hidden="true">
        <svg viewBox="0 0 200 150" width="200" height="150" fill="none">
          <ellipse cx="100" cy="132" rx="62" ry="9" fill="#eadfce" />
          <path d="M100 34c-13-9-30-12-47-11v74c17-1 34 2 47 11 13-9 30-12 47-11V23c-17-1-34 2-47 11Z" fill="#fffaf2" stroke="#c9a27f" strokeWidth="3" />
          <path d="M100 34v74" stroke="#c9a27f" strokeWidth="3" />
          <text x="100" y="86" textAnchor="middle" fontFamily="Georgia, serif" fontSize="34" fill="#7b1f2b" fontWeight="700">
            404
          </text>
          <circle cx="160" cy="38" r="13" fill="#f6e7c8" />
          <path d="M154 38h12M160 32v12" stroke="#7b1f2b" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>
      <h1>This page is off the shelf</h1>
      <p className="muted">
        The link may be outdated, or the book was moved. Let&apos;s get you back to the catalog.
      </p>
      <div className="not-found__actions">
        <Link to="/" className="btn btn--primary">
          <Icon name="home" size={17} />
          Go home
        </Link>
        <Link to="/products" className="btn btn--secondary">
          Browse books
        </Link>
      </div>
    </div>
  );
}
