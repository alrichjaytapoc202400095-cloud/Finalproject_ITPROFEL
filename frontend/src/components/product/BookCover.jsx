import { useState } from 'react';
import { coverAccent, initials } from '../../utils/format.js';

/**
 * Product cover with a graceful, deterministic fallback.
 * Real `imageUrl` values (from the API) are rendered as lazy images with fixed
 * dimensions to avoid layout shift; otherwise a CSS book cover is drawn.
 */
export default function BookCover({ product, eager = false, className = '' }) {
  const [failed, setFailed] = useState(false);
  const title = product?.title || 'SPC Book Store';
  const author = product?.author || '';
  const imageUrl = product?.imageUrl;
  const hue = coverAccent(title);

  if (imageUrl && !failed) {
    return (
      <div className={`book-cover ${className}`.trim()}>
        <img
          className="book-cover__img"
          src={imageUrl}
          alt={`${title} book cover`}
          width="300"
          height="400"
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`book-cover book-cover--fallback ${className}`.trim()}
      role="img"
      aria-label={`${title} book cover`}
      style={{
        '--cover-hue': hue,
        '--cover-hue-2': (hue + 28) % 360,
      }}
    >
      <span className="book-cover__spine" aria-hidden="true" />
      <span className="book-cover__initials" aria-hidden="true">
        {initials(title)}
      </span>
      <span className="book-cover__mini-title" aria-hidden="true">
        {title}
      </span>
      {author && (
        <span className="book-cover__mini-author" aria-hidden="true">
          {author}
        </span>
      )}
    </div>
  );
}
