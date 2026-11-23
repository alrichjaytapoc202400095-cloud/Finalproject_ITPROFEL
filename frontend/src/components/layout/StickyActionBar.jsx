// Fixed action bar that sits just above the bottom navigation.
export default function StickyActionBar({ children, label = 'Page actions' }) {
  return (
    <div className="sticky-action-bar" role="region" aria-label={label}>
      {children}
    </div>
  );
}
