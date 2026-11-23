import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar.jsx';
import BottomNav from './BottomNav.jsx';
import OfflineBanner from './OfflineBanner.jsx';
import { PageSkeleton } from '../ui/Skeleton.jsx';

// The application shell: sticky top bar, offline banner, routed <main>, footer
// and mobile bottom navigation. On tablets/desktop the shell is centered at a
// phone-like max width so cards never stretch.
export default function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <TopBar />
      <OfflineBanner />
      <main id="main-content" className="app-main" tabIndex={-1}>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="app-footer">
        <p>SPC Book Store · St. Peter&apos;s College campus bookstore</p>
        <p className="app-footer__meta">Mobile-first PWA · Prices and stock are confirmed by the server</p>
      </footer>
      <BottomNav />
    </div>
  );
}
