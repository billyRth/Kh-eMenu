import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Sheet, Spinner, Stepper } from '../components/Sheet';
import { fetchMenu, useCart, type MenuData } from '../lib/menu';
import { clockTime, khr, STATUS_LABEL, usd } from '../lib/format';
import { friendlyError, supabase } from '../lib/supabase';
import type { MenuItem, Restaurant, TabOrder } from '../lib/types';

type TableInfo = { token: string; label: string };

export function MenuPage({ slug, table }: { slug: string; table?: TableInfo }) {
  const [data, setData] = useState<MenuData | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [detail, setDetail] = useState<MenuItem | null>(null);
  const [sheet, setSheet] = useState<'cart' | 'tab' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
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

  useEffect(() => {
    if (data?.restaurant) document.title = `${data.restaurant.name} — Menu`;
  }, [data?.restaurant]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const itemsById = useMemo(() => new Map((data?.items ?? []).map((i) => [i.id, i])), [data?.items]);

  const sections = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.categories
      .map((c) => ({
        category: c,
        items: data.items.filter(
          (i) => i.category_id === c.id && (!q || i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)),
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [data, query]);

  // Highlight the category chip for the section currently on screen.
  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveCat(visible.target.id.replace('cat-', ''));
      },
      { rootMargin: '-120px 0px -60% 0px' },
    );
    document.querySelectorAll('.menu-section').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    if (!activeCat) return;
    chipsRef.current?.querySelector(`[data-cat="${activeCat}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeCat]);

  if (loadError && !data) {
    return (
      <div className="center-screen">
        <p>{loadError}</p>
        <button className="btn" onClick={load}>
          Try again
        </button>
      </div>
    );
  }
  if (data === undefined) return <Spinner label="Loading menu…" />;
  if (data === null) {
    return (
      <div className="center-screen">
        <h2>Menu not found</h2>
        <p className="muted">Check the link, or ask the restaurant for their menu QR code.</p>
      </div>
    );
  }

  const { restaurant, items, popularIds } = data;
  const canOrder = !!table && restaurant.ordering_enabled;
  const featured = items.filter((i) => i.is_featured && i.is_available);
  const cartCount = cart.lines.reduce((n, l) => n + l.qty, 0);
  const cartTotal = cart.lines.reduce((sum, l) => sum + (itemsById.get(l.item_id)?.price_usd ?? 0) * l.qty, 0);
  const qtyInCart = (id: string) => cart.lines.filter((l) => l.item_id === id).reduce((n, l) => n + l.qty, 0);

  return (
    <div className={`menu-page ${canOrder ? 'has-bar' : ''}`} style={{ '--accent': restaurant.accent_color } as CSSProperties}>
      <header className="menu-hero" style={restaurant.cover_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.65)), url(${restaurant.cover_url})` } : undefined}>
        <div className="hero-inner">
          <div className="logo">{restaurant.logo_url ? <img src={restaurant.logo_url} alt="" /> : restaurant.name.charAt(0)}</div>
          <div>
            <h1>{restaurant.name}</h1>
            {restaurant.tagline && <p className="tagline">{restaurant.tagline}</p>}
          </div>
        </div>
        <div className="hero-meta">
          {restaurant.hours && <span>🕒 {restaurant.hours}</span>}
          {restaurant.address && <span>📍 {restaurant.address}</span>}
          {restaurant.phone && (
            <a href={`tel:${restaurant.phone.replace(/\s/g, '')}`}>📞 {restaurant.phone}</a>
          )}
        </div>
        {table && (
          <div className="table-pill">
            <span>🍽️ {table.label}</span>
            {canOrder ? <span className="muted-on-dark">Order right from your phone</span> : <span className="muted-on-dark">Please order with our staff</span>}
          </div>
        )}
      </header>

      <div className="menu-toolbar">
        <input className="search" type="search" placeholder="Search the menu…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the menu" />
        <div className="chips" ref={chipsRef}>
          {sections.map(({ category }) => (
            <button
              key={category.id}
              data-cat={category.id}
              className={`chip ${activeCat === category.id ? 'active' : ''}`}
              onClick={() => document.getElementById(`cat-${category.id}`)?.scrollIntoView({ behavior: 'smooth' })}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <main className="menu-main">
        {!query && featured.length > 0 && (
          <section className="featured">
            <h2 className="section-title">⭐ Chef’s picks</h2>
            <div className="featured-row">
              {featured.map((item) => (
                <button key={item.id} className="featured-card" onClick={() => setDetail(item)}>
                  <ItemMedia item={item} large />
                  <div className="featured-info">
                    <strong>{item.name}</strong>
                    <Price usdAmount={item.price_usd} restaurant={restaurant} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {sections.length === 0 && <p className="muted empty">No dishes match “{query}”.</p>}

        {sections.map(({ category, items: catItems }) => (
          <section key={category.id} id={`cat-${category.id}`} className="menu-section">
            <h2 className="section-title">{category.name}</h2>
            <div className="item-list">
              {catItems.map((item) => {
                const inCart = canOrder ? qtyInCart(item.id) : 0;
                return (
                  <button key={item.id} className={`item-card ${item.is_available ? '' : 'sold-out'}`} onClick={() => setDetail(item)}>
                    <div className="item-body">
                      <h3>{item.name}</h3>
                      {item.description && <p className="desc">{item.description}</p>}
                      <Badges item={item} popular={popularIds.has(item.id)} />
                      <div className="item-foot">
                        {item.is_available ? <Price usdAmount={item.price_usd} restaurant={restaurant} /> : <span className="sold-label">Sold out today</span>}
                        {canOrder && item.is_available && <span className="add-pill">{inCart > 0 ? `${inCart} in order` : '+ Add'}</span>}
                      </div>
                    </div>
                    <ItemMedia item={item} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <footer className="menu-footer">
          {restaurant.show_khr && <p>Riel prices at {restaurant.khr_rate.toLocaleString()}៛ = $1</p>}
          <p>
            Menu by <a href="#/">eMenu</a>
          </p>
        </footer>
      </main>

      {canOrder && table && (
        <div className="order-bar">
          <button className="bar-btn secondary" onClick={() => setSheet('tab')}>
            🧾 Table orders
          </button>
          <button className="bar-btn primary" onClick={() => setSheet('cart')} disabled={cartCount === 0}>
            {cartCount === 0 ? 'Your order is empty' : `View order · ${cartCount} · ${usd(cartTotal)}`}
          </button>
        </div>
      )}

      {detail && (
        <ItemSheet
          item={detail}
          restaurant={restaurant}
          popular={popularIds.has(detail.id)}
          canOrder={canOrder}
          onClose={() => setDetail(null)}
          onAdd={(qty, note) => {
            cart.add(detail.id, qty, note);
            setDetail(null);
            setToast(`Added ${qty} × ${detail.name}`);
          }}
        />
      )}

      {sheet === 'cart' && table && (
        <CartSheet
          table={table}
          restaurant={restaurant}
          itemsById={itemsById}
          cart={cart}
          onClose={() => setSheet(null)}
          onPlaced={(orderNumber) => {
            cart.clear();
            setSheet('tab');
            setToast(`Order #${orderNumber} sent to the kitchen!`);
            load();
          }}
          onError={() => load()}
        />
      )}

      {sheet === 'tab' && table && <TabSheet table={table} restaurant={restaurant} onClose={() => setSheet(null)} />}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function Price({ usdAmount, restaurant }: { usdAmount: number; restaurant: Restaurant }) {
  return (
    <span className="price">
      {usd(usdAmount)}
      {restaurant.show_khr && <small> · {khr(usdAmount, restaurant.khr_rate)}</small>}
    </span>
  );
}

function Badges({ item, popular }: { item: MenuItem; popular: boolean }) {
  if (!popular && !item.is_featured && item.spicy_level === 0 && item.tags.length === 0) return null;
  return (
    <div className="badges">
      {popular && <span className="badge hot">🔥 Popular</span>}
      {item.is_featured && <span className="badge star">⭐ Chef’s pick</span>}
      {item.spicy_level > 0 && <span className="badge spicy">{'🌶️'.repeat(item.spicy_level)}</span>}
      {item.tags.map((t) => (
        <span key={t} className="badge">
          {t}
        </span>
      ))}
    </div>
  );
}

function ItemMedia({ item, large }: { item: MenuItem; large?: boolean }) {
  return (
    <div className={`item-media ${large ? 'large' : ''}`}>
      {item.image_url ? <img src={item.image_url} alt={item.name} loading="lazy" /> : <span className="emoji">{item.emoji || '🍽️'}</span>}
    </div>
  );
}

function ItemSheet({
  item,
  restaurant,
  popular,
  canOrder,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  restaurant: Restaurant;
  popular: boolean;
  canOrder: boolean;
  onClose: () => void;
  onAdd: (qty: number, note: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const orderable = canOrder && item.is_available;

  return (
    <Sheet
      onClose={onClose}
      footer={
        orderable ? (
          <div className="add-row">
            <Stepper value={qty} onChange={setQty} min={1} />
            <button className="btn primary grow" onClick={() => onAdd(qty, note)}>
              Add to order · {usd(item.price_usd * qty)}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="detail-media">
        {item.image_url ? <img src={item.image_url} alt={item.name} /> : <span className="emoji">{item.emoji || '🍽️'}</span>}
      </div>
      <h2 className="detail-title">{item.name}</h2>
      <Badges item={item} popular={popular} />
      {item.description && <p className="detail-desc">{item.description}</p>}
      <p className="detail-price">
        {item.is_available ? <Price usdAmount={item.price_usd} restaurant={restaurant} /> : <span className="sold-label">Sold out today</span>}
      </p>
      {orderable && (
        <label className="field">
          <span>Special requests</span>
          <textarea rows={2} maxLength={200} placeholder="e.g. no chilli, less sugar, no peanuts" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      )}
    </Sheet>
  );
}

function CartSheet({
  table,
  restaurant,
  itemsById,
  cart,
  onClose,
  onPlaced,
  onError,
}: {
  table: TableInfo;
  restaurant: Restaurant;
  itemsById: Map<string, MenuItem>;
  cart: ReturnType<typeof useCart>;
  onClose: () => void;
  onPlaced: (orderNumber: number) => void;
  onError: () => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = cart.lines.map((l, index) => ({ ...l, index, item: itemsById.get(l.item_id) }));
  const total = lines.reduce((sum, l) => sum + (l.item?.price_usd ?? 0) * l.qty, 0);
  const hasProblem = lines.some((l) => !l.item || !l.item.is_available);

  async function placeOrder() {
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('place_order', {
      p_token: table.token,
      p_items: cart.lines.map((l) => ({ item_id: l.item_id, qty: l.qty, note: l.note })),
      p_note: note,
    });
    setBusy(false);
    if (rpcError) {
      setError(friendlyError(rpcError.message));
      onError();
      return;
    }
    onPlaced((data as { order_number: number }).order_number);
  }

  return (
    <Sheet
      title={`Your order · ${table.label}`}
      onClose={onClose}
      footer={
        <>
          {error && <p className="error">{error}</p>}
          <div className="total-row">
            <span>Total</span>
            <strong>
              {usd(total)}
              {restaurant.show_khr && <small> · {khr(total, restaurant.khr_rate)}</small>}
            </strong>
          </div>
          <button className="btn primary block" disabled={busy || lines.length === 0 || hasProblem} onClick={placeOrder}>
            {busy ? 'Sending…' : 'Send order to kitchen'}
          </button>
          <p className="muted small center">You pay at the counter when you’re done.</p>
        </>
      }
    >
      {lines.length === 0 && <p className="muted">Your order is empty.</p>}
      <ul className="cart-lines">
        {lines.map((l) => (
          <li key={`${l.item_id}-${l.note}`} className={!l.item || !l.item.is_available ? 'problem' : ''}>
            <div>
              <strong>{l.item?.name ?? 'Removed item'}</strong>
              {l.note && <p className="small muted">“{l.note}”</p>}
              {l.item && !l.item.is_available && <p className="small error">Sold out — please remove</p>}
              {!l.item && <p className="small error">No longer on the menu — please remove</p>}
              <p className="small">{usd((l.item?.price_usd ?? 0) * l.qty)}</p>
            </div>
            <Stepper value={l.qty} onChange={(v) => cart.setQty(l.index, v)} />
          </li>
        ))}
      </ul>
      {lines.length > 0 && (
        <label className="field">
          <span>Note for the kitchen (optional)</span>
          <textarea rows={2} maxLength={500} placeholder="e.g. bring drinks first" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      )}
    </Sheet>
  );
}

function TabSheet({ table, restaurant, onClose }: { table: TableInfo; restaurant: Restaurant; onClose: () => void }) {
  const [orders, setOrders] = useState<TabOrder[] | null>(null);
  const [requested, setRequested] = useState<'waiter' | 'bill' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('get_table_tab', { p_token: table.token });
    if (rpcError) setError(friendlyError(rpcError.message));
    else setOrders((data ?? []) as TabOrder[]);
  }, [table.token]);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 5000);
    return () => window.clearInterval(id);
  }, [refresh]);

  async function callStaff(kind: 'waiter' | 'bill') {
    const { error: rpcError } = await supabase.rpc('call_staff', { p_token: table.token, p_kind: kind });
    if (rpcError) setError(friendlyError(rpcError.message));
    else setRequested(kind);
  }

  const live = (orders ?? []).filter((o) => o.status !== 'cancelled');
  const total = live.reduce((sum, o) => sum + Number(o.total_usd), 0);

  return (
    <Sheet
      title={`${table.label} · orders`}
      onClose={onClose}
      footer={
        <>
          {requested && <p className="notice">{requested === 'bill' ? '🧾 Bill requested — staff will bring it shortly.' : '🙋 A staff member is on the way.'}</p>}
          {error && <p className="error">{error}</p>}
          <div className="total-row">
            <span>Table total</span>
            <strong>
              {usd(total)}
              {restaurant.show_khr && <small> · {khr(total, restaurant.khr_rate)}</small>}
            </strong>
          </div>
          <div className="two-btns">
            <button className="btn" onClick={() => callStaff('waiter')}>
              🙋 Call waiter
            </button>
            <button className="btn primary" onClick={() => callStaff('bill')} disabled={live.length === 0}>
              🧾 Ask for bill
            </button>
          </div>
        </>
      }
    >
      {orders === null && <p className="muted">Loading…</p>}
      {orders?.length === 0 && <p className="muted">No orders yet. Everyone at this table can order from their own phone — it all shows up here.</p>}
      <ul className="tab-orders">
        {orders?.map((o) => (
          <li key={o.id} className={o.status === 'cancelled' ? 'cancelled' : ''}>
            <div className="tab-order-head">
              <strong>Order #{o.order_number}</strong>
              <span className={`status status-${o.status}`}>{STATUS_LABEL[o.status]}</span>
            </div>
            <p className="small muted">{clockTime(o.created_at)}</p>
            <ul className="tab-items">
              {o.items.map((it, i) => (
                <li key={i}>
                  <span>
                    {it.qty} × {it.name}
                    {it.note && <em className="muted"> — {it.note}</em>}
                  </span>
                  <span>{usd(it.unit_price_usd * it.qty)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
