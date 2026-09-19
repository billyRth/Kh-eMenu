import { useEffect } from 'react';

// Sales settings — edit these when pricing or contact details change.
const PRICING = { setupUsd: 200, monthlyUsd: 10.99 };
const CONTACT_URL = ''; // e.g. 'https://t.me/yourname' — the contact button is hidden while empty
const DEMO_TABLE_TOKEN = 'f6751323731a43';

const FEATURES = [
  { icon: '📱', title: 'No app to download', text: 'Diners scan the QR code on the table and the menu opens in their phone’s browser.' },
  { icon: '🛎️', title: 'Orders straight to the kitchen', text: 'Orders appear instantly on the staff screen with a sound alert. No more lost paper tickets.' },
  { icon: '👨‍👩‍👧', title: 'The whole table orders together', text: 'Everyone orders from their own phone and sees one shared bill for the table.' },
  { icon: '💵', title: 'Dollars and riel', text: 'Every price is shown in USD and KHR at your own exchange rate.' },
  { icon: '🙋', title: 'Call waiter & ask for the bill', text: 'One tap from the table and your staff see which table needs them.' },
  { icon: '🚫', title: 'Sold out in one tap', text: 'Ran out of amok? Switch it off and every phone updates. No reprinting menus.' },
  { icon: '🔥', title: 'Popular dishes, automatically', text: 'Your best sellers get a “Popular” badge based on real orders.' },
  { icon: '🔗', title: 'A menu link for Google & Facebook', text: 'Share one link on Google Maps, Facebook, Instagram and Telegram.' },
];

export function LandingPage() {
  useEffect(() => {
    document.title = 'eMenu — QR menus & table ordering for Cambodian restaurants';
  }, []);

  return (
    <div className="landing">
      <nav className="landing-nav">
        <strong className="brand">
          <span className="brand-mark">≡</span> eMenu
        </strong>
        <a href="#/admin" className="btn small">
          Staff sign in
        </a>
      </nav>

      <header className="landing-hero">
        <p className="eyebrow">For restaurants & cafés in Cambodia</p>
        <h1>Your menu on every phone. Orders straight to your kitchen.</h1>
        <p className="lead">A QR code on each table. Diners see your menu with photos, order from their seat and ask for the bill, while your staff see every order on one live screen.</p>
        <div className="hero-ctas">
          <a className="btn primary big" href={`#/t/${DEMO_TABLE_TOKEN}`}>
            Try ordering as a diner →
          </a>
          <a className="btn big" href="#/r/demo">
            See a demo menu
          </a>
        </div>
      </header>

      <section className="landing-section">
        <h2>Everything a busy restaurant needs</h2>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section steps">
        <h2>How it works</h2>
        <ol>
          <li>
            <strong>We set up your menu</strong> with your dishes, prices and photos.
          </li>
          <li>
            <strong>We print a QR code for each table</strong>, plus a link for Google and Facebook.
          </li>
          <li>
            <strong>Diners scan and order.</strong> Your staff get the order on a phone, tablet or laptop.
          </li>
          <li>
            <strong>Customers pay at the counter</strong> as usual. Nothing changes at checkout.
          </li>
        </ol>
      </section>

      <section className="landing-section pricing">
        <h2>Simple pricing</h2>
        <div className="price-card">
          <p className="price-big">
            ${PRICING.monthlyUsd}
            <span>/month</span>
          </p>
          <p className="muted">+ ${PRICING.setupUsd} one-time setup</p>
          <ul>
            <li>✓ Menu setup and QR codes for every table</li>
            <li>✓ Unlimited dishes, orders and menu changes</li>
            <li>✓ Live order screen for your staff</li>
            <li>✓ Support by phone & Telegram</li>
          </ul>
          {CONTACT_URL && (
            <a className="btn primary block" href={CONTACT_URL} target="_blank" rel="noreferrer">
              Get started
            </a>
          )}
        </div>
      </section>

      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} eMenu · Made in Cambodia</p>
      </footer>
    </div>
  );
}
