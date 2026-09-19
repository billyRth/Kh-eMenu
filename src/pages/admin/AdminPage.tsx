import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Spinner } from '../../components/Sheet';
import { supabase } from '../../lib/supabase';
import type { Restaurant } from '../../lib/types';
import { OrdersBoard } from './OrdersBoard';
import { MenuEditor } from './MenuEditor';
import { TablesManager } from './TablesManager';
import { SettingsForm } from './SettingsForm';

type Tab = 'orders' | 'menu' | 'tables' | 'settings';
const TABS: { id: Tab; label: string }[] = [
  { id: 'orders', label: '🛎️ Orders' },
  { id: 'menu', label: '📋 Menu' },
  { id: 'tables', label: '🔳 Tables & QR' },
  { id: 'settings', label: '⚙️ Settings' },
];

export function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    document.title = 'eMenu — Staff';
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Spinner />;
  if (!session) return <Login />;
  return <Dashboard session={session} />;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (authError) setError(authError.message === 'Invalid login credentials' ? 'Wrong email or password.' : authError.message);
  }

  return (
    <div className="center-screen">
      <form className="card login" onSubmit={submit}>
        <h1>Staff sign in</h1>
        <p className="muted">Manage orders, your menu and table QR codes.</p>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <a className="small muted center" href="#/">
          ← Back to eMenu
        </a>
      </form>
    </div>
  );
}

function Dashboard({ session }: { session: Session }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>(() => {
    try {
      return (localStorage.getItem('emenu:admin-tab') as Tab) || 'orders';
    } catch {
      return 'orders';
    }
  });

  useEffect(() => {
    supabase
      .from('restaurant_staff')
      .select('restaurants(*)')
      .eq('user_id', session.user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setRestaurant((data?.restaurants as unknown as Restaurant) ?? null));
  }, [session.user.id]);

  function switchTab(t: Tab) {
    setTab(t);
    try {
      localStorage.setItem('emenu:admin-tab', t);
    } catch {
      // Remembering the tab is only a convenience.
    }
  }

  if (restaurant === undefined) return <Spinner />;
  if (restaurant === null) {
    return (
      <div className="center-screen">
        <h2>No restaurant linked</h2>
        <p className="muted">This account isn’t linked to a restaurant yet. Contact eMenu support.</p>
        <button className="btn" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="admin" style={{ '--accent': restaurant.accent_color } as CSSProperties}>
      <header className="admin-head">
        <div>
          <strong>{restaurant.name}</strong>
          <span className="muted small"> · {session.user.email}</span>
        </div>
        <div className="admin-head-actions">
          <a className="btn small" href={`#/r/${restaurant.slug}`} target="_blank" rel="noreferrer">
            View menu ↗
          </a>
          <button className="btn small" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>
      <nav className="admin-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => switchTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main className="admin-main">
        {/* Orders stays mounted so new-order alerts keep working on other tabs. */}
        <div hidden={tab !== 'orders'}>
          <OrdersBoard restaurant={restaurant} />
        </div>
        {tab === 'menu' && <MenuEditor restaurant={restaurant} />}
        {tab === 'tables' && <TablesManager restaurant={restaurant} />}
        {tab === 'settings' && <SettingsForm restaurant={restaurant} onSaved={setRestaurant} />}
      </main>
    </div>
  );
}
