import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BookOpen, ExternalLink, LogOut, QrCode, Settings, UtensilsCrossed, BellRing } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingScreen, MessageScreen, useBrandColor } from '@/components/common';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Restaurant } from '@/lib/types';
import { OrdersBoard } from './OrdersBoard';
import { MenuEditor } from './MenuEditor';
import { TablesManager } from './TablesManager';
import { SettingsForm } from './SettingsForm';

type Tab = 'orders' | 'menu' | 'tables' | 'settings';
const TABS = [
  { id: 'orders', label: 'Orders', icon: BellRing },
  { id: 'menu', label: 'Menu', icon: BookOpen },
  { id: 'tables', label: 'Tables & QR', icon: QrCode },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    document.title = 'eMenu Staff';
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <LoadingScreen />;
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
    <div className="grid min-h-dvh place-items-center bg-secondary/60 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-3xl border bg-card p-7 shadow-xl shadow-black/5">
        <div className="space-y-2">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Staff sign in</h1>
          <p className="text-sm text-muted-foreground">Orders, menu and table QR codes for your restaurant.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        </div>
        {error && <p className="rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-11 w-full text-base font-bold" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        <a href="#/" className="block text-center text-sm text-muted-foreground hover:text-foreground">
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
  useBrandColor(restaurant?.accent_color);

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

  if (restaurant === undefined) return <LoadingScreen />;
  if (restaurant === null) {
    return (
      <MessageScreen icon={<UtensilsCrossed />} title="No restaurant linked">
        <p className="text-muted-foreground">This account isn’t linked to a restaurant yet. Contact eMenu support.</p>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>
          Sign out
        </Button>
      </MessageScreen>
    );
  }

  return (
    <div className="min-h-dvh bg-secondary/50">
      <header className="no-print sticky top-0 z-20 border-b bg-card/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary font-extrabold text-primary-foreground">
            {restaurant.logo_url ? <img src={restaurant.logo_url} alt="" className="size-full object-cover" /> : restaurant.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold leading-tight">{restaurant.name}</p>
            <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
          </div>
          <a className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'hidden sm:inline-flex')} href={`#/r/${restaurant.slug}`} target="_blank" rel="noreferrer">
            <ExternalLink /> View menu
          </a>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
            <LogOut /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={cn(
                'flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
                tab === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
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
