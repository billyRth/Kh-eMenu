import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BellRing, ChefHat, Clock, Flame, HandPlatter, MapPin, Phone, Plus, Receipt, Search, ShoppingBag, Star, UtensilsCrossed, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FoodImage, LoadingScreen, MessageScreen, Panel, Price, QtyStepper, useBrandColor } from '@/components/common';
import { cn } from '@/lib/utils';
import { fetchMenu, useCart, type MenuData } from '@/lib/menu';
import { clockTime, khr, STATUS_LABEL, usd } from '@/lib/format';
import { friendlyError, supabase } from '@/lib/supabase';
import { readGuestName, saveGuestName, splitByPerson, splitEqually } from '@/lib/split';
import type { MenuItem, OrderStatus, Restaurant, TabOrder } from '@/lib/types';

type TableInfo = { token: string; label: string };

export function MenuPage({ slug, table }: { slug: string; table?: TableInfo }) {
  const [data, setData] = useState<MenuData | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [detail, setDetail] = useState<MenuItem | null>(null);
  const [panel, setPanel] = useState<'cart' | 'tab' | null>(null);
  const cart = useCart(table?.token);

  const load = useCallback(async () => {
    try {
      setData(await fetchMenu(slug));
      setLoadError(null);
    } catch (e) {
      setLoadError(friendlyError((e as Error).message));
    }
  }, [slug]);

  useEffect(() => {
    load();
    // Keep "sold out" flags fresh while a diner browses.
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useBrandColor(data?.restaurant.accent_color);
  useEffect(() => {
    if (data?.restaurant) document.title = `${data.restaurant.name} — Menu`;
  }, [data?.restaurant]);

  const itemsById = useMemo(() => new Map((data?.items ?? []).map((i) => [i.id, i])), [data?.items]);

  const sections = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.categories
      .map((c) => ({
        category: c,
        items: data.items.filter((i) => i.category_id === c.id && (!q || i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q))),
      }))
      .filter((s) => s.items.length > 0);
  }, [data, query]);

  // Highlight the category tab for the section currently on screen.
  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveCat(visible.target.id.replace('cat-', ''));
      },
      { rootMargin: '-130px 0px -60% 0px' },
    );
    document.querySelectorAll('[data-menu-section]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-cat="${activeCat}"]`);
    if (row && chip) row.scrollTo({ left: chip.offsetLeft - 16, behavior: 'smooth' });
  }, [activeCat]);

  if (loadError && !data) {
    return (
      <MessageScreen icon={<UtensilsCrossed />} title="Couldn’t load the menu">
        <p className="text-muted-foreground">{loadError}</p>
        <Button onClick={load}>Try again</Button>
      </MessageScreen>
    );
  }
  if (data === undefined) return <LoadingScreen label="Loading menu…" />;
  if (data === null) {
    return (
      <MessageScreen icon={<UtensilsCrossed />} title="Menu not found">
        <p className="text-muted-foreground">Check the link, or ask the restaurant for their menu QR code.</p>
      </MessageScreen>
    );
  }

  const { restaurant, items, popularIds } = data;
  const canOrder = !!table && restaurant.ordering_enabled;
  const featured = items.filter((i) => i.is_featured && i.is_available);
  const cartCount = cart.lines.reduce((n, l) => n + l.qty, 0);
  const cartTotal = cart.lines.reduce((sum, l) => sum + (itemsById.get(l.item_id)?.price_usd ?? 0) * l.qty, 0);
  const qtyInCart = (id: string) => cart.lines.filter((l) => l.item_id === id).reduce((n, l) => n + l.qty, 0);

  function quickAdd(item: MenuItem) {
    cart.add(item.id, 1, '');
    toast.success(`${item.name} added`, { duration: 1500 });
  }

  return (
    <div className={cn('mx-auto min-h-dvh max-w-2xl bg-background', canOrder && 'pb-28')}>
      {/* Cover + restaurant card */}
      <header className="relative">
        <div
          className="h-40 bg-primary bg-cover bg-center sm:h-52"
          style={{
            backgroundImage: restaurant.cover_url
              ? `linear-gradient(180deg, rgb(0 0 0 / .05), rgb(0 0 0 / .35)), url(${restaurant.cover_url})`
              : 'radial-gradient(circle at 20% 20%, rgb(255 255 255 / .22), transparent 45%), radial-gradient(circle at 85% 70%, rgb(0 0 0 / .25), transparent 50%)',
          }}
        />
        <div className="relative -mt-14 px-4">
          <div className="rounded-3xl border bg-card p-4 shadow-lg shadow-black/5">
            <div className="flex items-center gap-3.5">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary text-2xl font-extrabold text-primary-foreground ring-4 ring-card">
                {restaurant.logo_url ? <img src={restaurant.logo_url} alt="" className="size-full object-cover" /> : restaurant.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-extrabold tracking-tight">{restaurant.name}</h1>
                {restaurant.tagline && <p className="text-sm text-muted-foreground">{restaurant.tagline}</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
              {restaurant.hours && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" /> {restaurant.hours}
                </span>
              )}
              {restaurant.address && (
                <a className="inline-flex items-center gap-1.5 hover:text-foreground" href={`https://maps.google.com/?q=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`} target="_blank" rel="noreferrer">
                  <MapPin className="size-3.5" /> {restaurant.address}
                </a>
              )}
              {restaurant.phone && (
                <a className="inline-flex items-center gap-1.5 hover:text-foreground" href={`tel:${restaurant.phone.replace(/\s/g, '')}`}>
                  <Phone className="size-3.5" /> {restaurant.phone}
                </a>
              )}
            </div>
            {table && (
              <div className="mt-3.5 flex items-center gap-3 rounded-2xl bg-primary/8 px-3.5 py-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <HandPlatter className="size-4.5" />
                </div>
                <div className="flex-1 text-sm leading-tight">
                  <p className="font-bold">{table.label}</p>
                  <p className="text-muted-foreground">{canOrder ? 'Order from your phone · pay at the counter' : 'Please order with our staff'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sticky search + categories */}
      <div className="sticky top-0 z-20 mt-3 border-b bg-background/90 px-4 pt-3 pb-2 backdrop-blur-lg">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes" aria-label="Search dishes" className="h-11 rounded-full bg-card pr-10 pl-10" />
          {query && (
            <button className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground" onClick={() => setQuery('')} aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div ref={chipsRef} className="no-scrollbar relative mt-2.5 flex gap-2 overflow-x-auto pb-1">
          {sections.map(({ category }) => (
            <button
              key={category.id}
              data-cat={category.id}
              onClick={() => document.getElementById(`cat-${category.id}`)?.scrollIntoView({ behavior: 'smooth' })}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                activeCat === category.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-foreground/80 hover:bg-secondary',
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4">
        {!query && featured.length > 0 && (
          <section className="pt-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
              <ChefHat className="size-5 text-primary" /> Chef’s picks
            </h2>
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {featured.map((item) => (
                <button key={item.id} onClick={() => setDetail(item)} className="w-44 shrink-0 snap-start overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition active:scale-[.98]">
                  <FoodImage src={item.image_url} emoji={item.emoji} alt={item.name} className="aspect-[4/3] w-full" emojiClass="text-5xl" />
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-1 text-sm font-bold">{item.name}</p>
                    <Price amount={item.price_usd} rate={restaurant.khr_rate} showKhr={restaurant.show_khr} className="text-sm" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {sections.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Search className="mx-auto mb-3 size-8 opacity-40" />
            No dishes match “{query}”.
          </div>
        )}

        {sections.map(({ category, items: catItems }) => (
          <section key={category.id} id={`cat-${category.id}`} data-menu-section className="scroll-mt-32 pt-6">
            <h2 className="mb-3 text-lg font-extrabold">{category.name}</h2>
            <div className="divide-y overflow-hidden rounded-2xl border bg-card">
              {catItems.map((item) => {
                const inCart = canOrder ? qtyInCart(item.id) : 0;
                return (
                  <div key={item.id} className={cn('relative flex gap-3.5 p-3.5', !item.is_available && 'opacity-50')}>
                    <button className="absolute inset-0 z-0" onClick={() => setDetail(item)} aria-label={`About ${item.name}`} />
                    <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col gap-1.5">
                      <h3 className="font-bold leading-snug">{item.name}</h3>
                      {item.description && <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{item.description}</p>}
                      <ItemBadges item={item} popular={popularIds.has(item.id)} />
                      <div className="mt-auto pt-1">
                        {item.is_available ? (
                          <Price amount={item.price_usd} rate={restaurant.khr_rate} showKhr={restaurant.show_khr} />
                        ) : (
                          <span className="text-sm font-bold text-destructive">Sold out today</span>
                        )}
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <FoodImage src={item.image_url} emoji={item.emoji} alt={item.name} className="pointer-events-none size-24 rounded-xl" />
                      {canOrder && item.is_available && (
                        <button
                          onClick={() => quickAdd(item)}
                          aria-label={`Add ${item.name}`}
                          className={cn(
                            'absolute -right-1.5 -bottom-1.5 z-10 grid h-9 min-w-9 place-items-center rounded-full border-2 border-card px-2 text-sm font-bold shadow-md transition active:scale-90',
                            inCart ? 'bg-primary text-primary-foreground' : 'bg-card text-primary',
                          )}
                        >
                          {inCart ? inCart : <Plus className="size-4.5" strokeWidth={3} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <footer className="py-10 text-center text-xs text-muted-foreground">
          {restaurant.show_khr && <p>Riel prices at {restaurant.khr_rate.toLocaleString()}៛ = $1</p>}
          <p className="mt-1">
            Powered by{' '}
            <a href="#/" className="font-semibold text-foreground">
              eMenu
            </a>
          </p>
        </footer>
      </main>

      {canOrder && table && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-2xl gap-2.5 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" className="h-14 rounded-2xl bg-card px-4 shadow-lg" onClick={() => setPanel('tab')}>
            <Receipt className="size-5" />
            <span className="font-semibold">Bill</span>
          </Button>
          <Button
            className="h-14 flex-1 justify-between rounded-2xl px-4 text-base shadow-lg shadow-primary/30 disabled:border-border disabled:bg-card disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-black/5"
            onClick={() => setPanel('cart')}
            disabled={cartCount === 0}
          >
            <span className="flex items-center gap-2.5">
              <span className="relative">
                <ShoppingBag className="size-5" />
                {cartCount > 0 && <span className="absolute -top-2 -right-2.5 grid size-4.5 place-items-center rounded-full bg-primary-foreground text-[10px] font-bold text-primary">{cartCount}</span>}
              </span>
              <span className="font-bold">{cartCount === 0 ? 'Add dishes to order' : 'View order'}</span>
            </span>
            {cartCount > 0 && <span className="font-bold tabular-nums">{usd(cartTotal)}</span>}
          </Button>
        </div>
      )}

      <ItemPanel
        item={detail}
        restaurant={restaurant}
        popular={detail ? popularIds.has(detail.id) : false}
        canOrder={canOrder}
        onClose={() => setDetail(null)}
        onAdd={(item, qty, note) => {
          cart.add(item.id, qty, note);
          setDetail(null);
          toast.success(`${qty} × ${item.name} added`, { duration: 1500 });
        }}
      />

      {table && (
        <>
          <CartPanel
            open={panel === 'cart'}
            table={table}
            restaurant={restaurant}
            itemsById={itemsById}
            cart={cart}
            onClose={() => setPanel(null)}
            onPlaced={(orderNumber) => {
              cart.clear();
              setPanel('tab');
              toast.success(`Order #${orderNumber} sent to the kitchen!`);
              load();
            }}
            onError={() => load()}
          />
          <BillPanel open={panel === 'tab'} table={table} restaurant={restaurant} onClose={() => setPanel(null)} />
        </>
      )}
    </div>
  );
}

function ItemBadges({ item, popular }: { item: MenuItem; popular: boolean }) {
  if (!popular && !item.is_featured && item.spicy_level === 0 && item.tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {popular && (
        <Badge className="bg-red-50 text-red-700">
          <Flame /> Popular
        </Badge>
      )}
      {item.is_featured && (
        <Badge className="bg-amber-50 text-amber-800">
          <Star /> Chef’s pick
        </Badge>
      )}
      {item.spicy_level > 0 && <Badge className="bg-rose-50 px-1.5 tracking-[-0.2em] text-rose-700">{'🌶️'.repeat(item.spicy_level)}</Badge>}
      {item.tags.map((t) => (
        <Badge key={t} variant="secondary">
          {t}
        </Badge>
      ))}
    </div>
  );
}

function ItemPanel({
  item,
  restaurant,
  popular,
  canOrder,
  onClose,
  onAdd,
}: {
  item: MenuItem | null;
  restaurant: Restaurant;
  popular: boolean;
  canOrder: boolean;
  onClose: () => void;
  onAdd: (item: MenuItem, qty: number, note: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  useEffect(() => {
    setQty(1);
    setNote('');
  }, [item?.id]);

  // Keep the last item rendered while the drawer animates closed.
  const last = useRef<MenuItem | null>(null);
  if (item) last.current = item;
  const shown = item ?? last.current;
  if (!shown) return null;
  const orderable = canOrder && shown.is_available;

  return (
    <Panel
      open={!!item}
      onClose={onClose}
      footer={
        orderable ? (
          <div className="flex items-center gap-3">
            <QtyStepper value={qty} onChange={setQty} min={1} />
            <Button className="h-12 flex-1 rounded-xl text-base font-bold" onClick={() => onAdd(shown, qty, note)}>
              Add · {usd(shown.price_usd * qty)}
            </Button>
          </div>
        ) : undefined
      }
    >
      <FoodImage src={shown.image_url} emoji={shown.emoji} alt={shown.name} className="aspect-[16/10] w-full rounded-2xl" emojiClass="text-7xl" />
      <div className="mt-4 space-y-2.5">
        <h2 className="text-2xl font-extrabold tracking-tight">{shown.name}</h2>
        <ItemBadges item={shown} popular={popular} />
        {shown.description && <p className="leading-relaxed text-foreground/80">{shown.description}</p>}
        <p className="text-lg">
          {shown.is_available ? <Price amount={shown.price_usd} rate={restaurant.khr_rate} showKhr={restaurant.show_khr} /> : <span className="font-bold text-destructive">Sold out today</span>}
        </p>
        {orderable && (
          <label className="block space-y-1.5 pt-1">
            <span className="text-sm font-semibold">Special requests</span>
            <Textarea rows={2} maxLength={200} placeholder="e.g. no chilli, less sugar, no peanuts" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        )}
        {!canOrder && <p className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">To order, scan the QR code on your table or ask our staff.</p>}
      </div>
    </Panel>
  );
}

function CartPanel({
  open,
  table,
  restaurant,
  itemsById,
  cart,
  onClose,
  onPlaced,
  onError,
}: {
  open: boolean;
  table: TableInfo;
  restaurant: Restaurant;
  itemsById: Map<string, MenuItem>;
  cart: ReturnType<typeof useCart>;
  onClose: () => void;
  onPlaced: (orderNumber: number) => void;
  onError: () => void;
}) {
  const [note, setNote] = useState('');
  const [guest, setGuest] = useState(readGuestName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = cart.lines.map((l, index) => ({ ...l, index, item: itemsById.get(l.item_id) }));
  const total = lines.reduce((sum, l) => sum + (l.item?.price_usd ?? 0) * l.qty, 0);
  const hasProblem = lines.some((l) => !l.item || !l.item.is_available);

  async function placeOrder() {
    setBusy(true);
    setError(null);
    saveGuestName(guest);
    const { data, error: rpcError } = await supabase.rpc('place_order', {
      p_token: table.token,
      p_items: cart.lines.map((l) => ({ item_id: l.item_id, qty: l.qty, note: l.note })),
      p_note: note,
      p_guest: guest,
    });
    setBusy(false);
    if (rpcError) {
      setError(friendlyError(rpcError.message));
      onError();
      return;
    }
    setNote('');
    onPlaced((data as { order_number: number }).order_number);
  }

  return (
    <Panel
      open={open}
      onClose={onClose}
      title="Your order"
      description={`${table.label} · the kitchen starts as soon as you send it`}
      footer={
        <div className="space-y-3">
          {error && <p className="rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>}
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Total</span>
            <Price amount={total} rate={restaurant.khr_rate} showKhr={restaurant.show_khr} className="text-xl" />
          </div>
          <Button className="h-12 w-full rounded-xl text-base font-bold" disabled={busy || lines.length === 0 || hasProblem} onClick={placeOrder}>
            {busy ? 'Sending…' : 'Send order to kitchen'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">You pay at the counter when you’re done.</p>
        </div>
      }
    >
      {lines.length === 0 && <p className="py-8 text-center text-muted-foreground">Your order is empty.</p>}
      <ul className="divide-y">
        {lines.map((l) => (
          <li key={`${l.item_id}-${l.note}`} className="flex items-center gap-3 py-3">
            <FoodImage src={l.item?.image_url ?? null} emoji={l.item?.emoji ?? null} alt="" className="size-14 shrink-0 rounded-xl" emojiClass="text-2xl" />
            <div className="min-w-0 flex-1">
              <p className={cn('font-semibold', (!l.item || !l.item.is_available) && 'line-through')}>{l.item?.name ?? 'Removed item'}</p>
              {l.note && <p className="truncate text-xs text-muted-foreground">“{l.note}”</p>}
              {l.item && !l.item.is_available && <p className="text-xs font-semibold text-destructive">Sold out, please remove</p>}
              {!l.item && <p className="text-xs font-semibold text-destructive">No longer on the menu, please remove</p>}
              <p className="text-sm font-bold tabular-nums">{usd((l.item?.price_usd ?? 0) * l.qty)}</p>
            </div>
            <QtyStepper size="sm" value={l.qty} onChange={(v) => cart.setQty(l.index, v)} />
          </li>
        ))}
      </ul>
      {lines.length > 0 && (
        <div className="mt-3 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Your name <span className="font-normal text-muted-foreground">(optional, for splitting the bill)</span></span>
            <Input value={guest} maxLength={40} onChange={(e) => setGuest(e.target.value)} placeholder="e.g. Dara" className="h-11" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Note for the kitchen <span className="font-normal text-muted-foreground">(optional)</span></span>
            <Textarea rows={2} maxLength={500} placeholder="e.g. bring drinks first" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
      )}
    </Panel>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  new: 'bg-blue-50 text-blue-700',
  preparing: 'bg-amber-50 text-amber-800',
  served: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-muted text-muted-foreground',
};

function BillPanel({ open, table, restaurant, onClose }: { open: boolean; table: TableInfo; restaurant: Restaurant; onClose: () => void }) {
  const [orders, setOrders] = useState<TabOrder[] | null>(null);
  const [people, setPeople] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('get_table_tab', { p_token: table.token });
    if (rpcError) setError(friendlyError(rpcError.message));
    else {
      setError(null);
      setOrders((data ?? []) as TabOrder[]);
    }
  }, [table.token]);

  useEffect(() => {
    if (!open) return;
    refresh();
    const id = window.setInterval(refresh, 5000);
    return () => window.clearInterval(id);
  }, [open, refresh]);

  async function callStaff(kind: 'waiter' | 'bill') {
    const { error: rpcError } = await supabase.rpc('call_staff', { p_token: table.token, p_kind: kind });
    if (rpcError) toast.error(friendlyError(rpcError.message));
    else toast.success(kind === 'bill' ? 'Bill requested. Staff will bring it shortly.' : 'A staff member is on the way.');
  }

  const live = (orders ?? []).filter((o) => o.status !== 'cancelled');
  const total = live.reduce((sum, o) => sum + Number(o.total_usd), 0);
  const shares = splitByPerson(live);
  const even = splitEqually(total, people);
  const money = (n: number) => <Price amount={n} rate={restaurant.khr_rate} showKhr={restaurant.show_khr} />;

  return (
    <Panel
      open={open}
      onClose={onClose}
      title={`${table.label} · bill`}
      description="Everyone at this table can order from their own phone. It all adds up here."
      footer={
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Table total</span>
            <Price amount={total} rate={restaurant.khr_rate} showKhr={restaurant.show_khr} className="text-xl" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" className="h-12 rounded-xl" onClick={() => callStaff('waiter')}>
              <BellRing /> Call waiter
            </Button>
            <Button className="h-12 rounded-xl font-bold" onClick={() => callStaff('bill')} disabled={live.length === 0}>
              <Receipt /> Ask for bill
            </Button>
          </div>
        </div>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>}
      {orders === null ? (
        <p className="py-8 text-center text-muted-foreground">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No orders yet.</p>
      ) : (
        <Tabs defaultValue="orders">
          <TabsList className="w-full">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="person">Split by person</TabsTrigger>
            <TabsTrigger value="equal">Split equally</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-2 space-y-3">
            {orders.map((o) => (
              <div key={o.id} className={cn('rounded-2xl border p-3.5', o.status === 'cancelled' && 'opacity-50')}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">
                    Order #{o.order_number}
                    <span className="ml-2 text-xs font-medium text-muted-foreground">
                      {o.guest_name ? `${o.guest_name} · ` : ''}
                      {clockTime(o.created_at)}
                    </span>
                  </p>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', STATUS_STYLE[o.status])}>{STATUS_LABEL[o.status]}</span>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {o.items.map((it, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>
                        {it.qty} × {it.name}
                        {it.note && <span className="text-muted-foreground italic"> · {it.note}</span>}
                      </span>
                      <span className="tabular-nums">{usd(it.unit_price_usd * it.qty)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="person" className="mt-2 space-y-3">
            {shares.length === 1 && shares[0].name === 'Guest' && (
              <p className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">Tip: type your name when you send an order and the bill splits itself by person.</p>
            )}
            {shares.map((s) => (
              <div key={s.name} className="rounded-2xl border p-3.5">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{s.name}</p>
                  {money(s.total)}
                </div>
                <ul className="mt-1.5 space-y-0.5 text-sm text-muted-foreground">
                  {s.items.map((it) => (
                    <li key={it.name} className="flex justify-between">
                      <span>
                        {it.qty} × {it.name}
                      </span>
                      <span className="tabular-nums">{usd(it.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="equal" className="mt-2">
            <div className="flex flex-col items-center gap-4 rounded-2xl border p-5 text-center">
              <p className="text-sm font-semibold text-muted-foreground">How many people?</p>
              <QtyStepper value={people} onChange={setPeople} min={1} max={30} />
              <div>
                <p className="text-sm text-muted-foreground">Each person pays</p>
                <p className="text-3xl font-extrabold tabular-nums">{usd(even.base)}</p>
                {restaurant.show_khr && <p className="font-semibold text-muted-foreground">{khr(even.base, restaurant.khr_rate)}</p>}
                {even.extraCount > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {even.extraCount} {even.extraCount === 1 ? 'person pays' : 'people pay'} {usd(even.base + 0.01)} so it adds up exactly
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </Panel>
  );
}
