import { AdminPage } from './pages/AdminPage';
import { BookingPage } from './pages/BookingPage';

function bookingSlug(pathname: string) {
  const match = pathname.match(/^\/book\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function App() {
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return <AdminPage />;
  const slug = bookingSlug(path) || (path === '/book' || path === '/book/' ? 'niki' : null);
  if (slug) return <BookingPage slug={slug} />;

  return (
    <main className="landing-shell">
      <section className="landing-card">
        <div className="eyebrow">BOOKINGCAL</div>
        <h1>Scheduling, without the scheduling.</h1>
        <p>Use a booking link to choose a time in your own timezone.</p>
      </section>
    </main>
  );
}
