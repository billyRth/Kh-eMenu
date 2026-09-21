import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BookOpen, ChartColumn, ExternalLink, LogOut, QrCode, Settings, UtensilsCrossed, BellRing } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingScreen, MessageScreen, useBrandColor } from '@/components/common';
import { cn } from '@/lib/utils';
import { ALL_LANGS, LANGS, LangContext, useLang, useT, type StringKey } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import type { Restaurant } from '@/lib/types';
import { OrdersBoard } from './OrdersBoard';
import { MenuEditor } from './MenuEditor';
import { TablesManager } from './TablesManager';
import { SettingsForm } from './SettingsForm';
import { DailyReport } from './DailyReport';

type Tab = 'orders' | 'report' | 'menu' | 'tables' | 'settings';
const TABS: { id: Tab; label: StringKey; icon: typeof BellRing }[] = [
  { id: 'orders', label: 'orders', icon: BellRing },
  { id: 'report', label: 's_tabToday', icon: ChartColumn },
  { id: 'menu', label: 's_tabMenu', icon: BookOpen },
  { id: 'tables', label: 's_tabTables', icon: QrCode },
  { id: 'settings', label: 's_tabSettings', icon: Settings },
];

/** Compact EN / ខ្មែរ / 中文 switch. Shares the `khmenu:lang` choice with the diner menu. */
function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = useT();
  return (
    <div className={cn('flex shrink-0 items-center rounded-full bg-secondary p-0.5', className)} role="group" aria-label={t('s_language')}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setLang(l.id)}
          aria-pressed={lang === l.id}
          className={cn('rounded-full px-2 py-1 text-xs font-semibold leading-none transition-colors', lang === l.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}

export function AdminPage() {
  const i18n = useLang(ALL_LANGS, false);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    document.title = 'KhMenu Staff';
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <LangContext value={i18n}>
      {session === undefined ? <LoadingScreen label={i18n.t('loading')} /> : !session ? <Login /> : <Dashboard session={session} />}
    </LangContext>
  );
}

function Login() {
  const { t } = useT();
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
    if (authError) setError(authError.message === 'Invalid login credentials' ? t('s_wrongLogin') : authError.message);
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-secondary/60 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-3xl border bg-card p-7 shadow-xl shadow-black/5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <UtensilsCrossed className="size-6" />
            </div>
            <LangSwitch />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t('s_signInTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('s_signInIntro')}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('s_email')}</Label>
          <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('s_password')}</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        </div>
        {error && <p className="rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-11 w-full text-base font-bold" disabled={busy}>
          {busy ? t('s_signingIn') : t('s_signIn')}
        </Button>
        <a href="#/" className="block text-center text-sm text-muted-foreground hover:text-foreground">
          {t('s_backHome')}
        </a>
      </form>
    </div>
  );
}

function Dashboard({ session }: { session: Session }) {
  const { t } = useT();
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

  if (restaurant === undefined) return <LoadingScreen label={t('loading')} />;
  if (restaurant === null) {
    return (
      <MessageScreen icon={<UtensilsCrossed />} title={t('s_noRestaurant')}>
        <p className="text-muted-foreground">{t('s_noRestaurantBody')}</p>
        <LangSwitch />
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>
          {t('s_signOut')}
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
            <ExternalLink /> {t('s_viewMenu')}
          </a>
          <LangSwitch />
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} aria-label={t('s_signOut')}>
            <LogOut /> <span className="hidden sm:inline">{t('s_signOut')}</span>
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
              <Icon className="size-4" /> {t(label)}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        {/* Orders stays mounted so new-order alerts keep working on other tabs. */}
        <div hidden={tab !== 'orders'}>
          <OrdersBoard restaurant={restaurant} />
        </div>
        {tab === 'report' && <DailyReport restaurant={restaurant} />}
        {tab === 'menu' && <MenuEditor restaurant={restaurant} />}
        {tab === 'tables' && <TablesManager restaurant={restaurant} />}
        {tab === 'settings' && <SettingsForm restaurant={restaurant} onSaved={setRestaurant} />}
      </main>
    </div>
  );
}
