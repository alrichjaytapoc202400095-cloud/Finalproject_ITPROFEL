// Skeleton primitives. They keep layout stable while data loads and are hidden
// from assistive technology (the live region announces loading state instead).
export function Skeleton({ className = '', style }) {
  return <span className={`skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className="product-card product-card--skeleton" aria-hidden="true">
      <Skeleton className="skeleton--cover" />
      <Skeleton className="skeleton--line skeleton--w80" />
      <Skeleton className="skeleton--line skeleton--w55" />
      <Skeleton className="skeleton--line skeleton--w40" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }) {
  return (
    <div className="stack" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="card-row" key={index}>
          <Skeleton className="skeleton--thumb" />
          <div className="card-row__body">
            <Skeleton className="skeleton--line skeleton--w70" />
            <Skeleton className="skeleton--line skeleton--w40" />
            <Skeleton className="skeleton--line skeleton--w30" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="stack page" aria-hidden="true">
      <Skeleton className="skeleton--hero" />
      <Skeleton className="skeleton--line skeleton--w40" />
      <ProductGridSkeleton count={4} />
    </div>
  );
}
