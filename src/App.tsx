import { useState } from 'react';
import { AdminPage } from './pages/AdminPage';
import { BookingPage } from './pages/BookingPage';

function bookingSlug(pathname: string) {
  const match = pathname.match(/^\/book\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function App() {
  const initialAdmin = window.location.pathname.startsWith('/admin') || new URLSearchParams(window.location.search).get('admin') === '1';
  const [showAdmin, setShowAdmin] = useState(initialAdmin);
  const path = window.location.pathname;

  if (showAdmin) return <AdminPage />;

  const slug = bookingSlug(path) || (path === '/book' || path === '/book/' ? 'niki' : null);
  if (slug) return <BookingPage slug={slug} />;

  const openAdmin = () => {
    window.history.replaceState({}, '', '/?admin=1');
    setShowAdmin(true);
  };

  return (
    <main className="landing-shell">
      <section className="landing-card">
        <div className="eyebrow">BOOKINGCAL</div>
        <h1>Scheduling, without the scheduling.</h1>
        <p>Use a booking link to choose a time in your own timezone.</p>
        <button className="admin-login-link" type="button" onClick={openAdmin}>Admin login</button>
      </section>
    </main>
  );
}
