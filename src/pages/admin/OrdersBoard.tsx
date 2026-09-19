import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { khr, timeAgo, usd } from '../../lib/format';
import type { Order, OrderStatus, Restaurant, ServiceRequest } from '../../lib/types';

const ORDER_SELECT = '*, order_items(id, name, unit_price_usd, qty, note), dining_tables(label)';

/** Short two-tone chime generated in the browser, so there is no audio file to host. */
function chime(ctx: AudioContext) {
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const start = ctx.currentTime + i * 0.18;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

export function OrdersBoard({ restaurant }: { restaurant: Restaurant }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const [live, setLive] = useState(false);
  const [, setTick] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const seen = useRef<Set<string> | null>(null);

  const refresh = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [o, r] = await Promise.all([
      supabase.from('orders').select(ORDER_SELECT).eq('restaurant_id', restaurant.id).gte('created_at', since).order('created_at', { ascending: true }),
      supabase.from('service_requests').select('*, dining_tables(label)').eq('restaurant_id', restaurant.id).is('resolved_at', null).order('created_at'),
    ]);
    if (o.data) {
      const next = o.data as unknown as Order[];
      const ids = new Set([...next.map((x) => x.id), ...((r.data ?? []) as ServiceRequest[]).map((x) => x.id)]);
      // Chime only for things that appeared since the last refresh, not on first load.
      if (seen.current && [...ids].some((id) => !seen.current!.has(id)) && audio.current) chime(audio.current);
      seen.current = ids;
      setOrders(next);
    }
    if (r.data) setRequests(r.data as unknown as ServiceRequest[]);
  }, [restaurant.id]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`orders-${restaurant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `restaurant_id=eq.${restaurant.id}` }, () => refresh())
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    // Backup in case the realtime connection drops on flaky Wi-Fi.
    const poll = window.setInterval(refresh, 20_000);
    const tick = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [restaurant.id, refresh]);

  const newCount = orders.filter((o) => o.status === 'new').length;
  useEffect(() => {
    document.title = newCount + requests.length > 0 ? `(${newCount + requests.length}) eMenu — Staff` : 'eMenu — Staff';
  }, [newCount, requests.length]);

  function enableSound() {
    audio.current ??= new AudioContext();
    audio.current.resume();
    chime(audio.current);
    setSoundOn(true);
  }

  async function setStatus(order: Order, status: OrderStatus) {
    if (status === 'cancelled' && !window.confirm(`Cancel order #${order.order_number}?`)) return;
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    await supabase.from('orders').update({ status }).eq('id', order.id);
    refresh();
  }

  async function resolveRequest(req: ServiceRequest) {
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    await supabase.from('service_requests').update({ resolved_at: new Date().toISOString() }).eq('id', req.id);
  }

  async function closeTable(tableId: string | null, label: string, total: number) {
    if (!window.confirm(`Mark ${label} as paid (${usd(total)}) and clear its orders?`)) return;
    const now = new Date().toISOString();
    let q = supabase.from('orders').update({ paid_at: now }).eq('restaurant_id', restaurant.id).is('paid_at', null);
    q = tableId ? q.eq('table_id', tableId) : q.is('table_id', null);
    await q;
    if (tableId) {
      await supabase.from('service_requests').update({ resolved_at: now }).eq('table_id', tableId).is('resolved_at', null);
    }
    refresh();
  }

  const active = orders.filter((o) => (o.status === 'new' || o.status === 'preparing') && !o.paid_at);
  const columns: { status: OrderStatus; title: string }[] = [
    { status: 'new', title: 'New' },
    { status: 'preparing', title: 'Preparing' },
  ];

  // Unpaid, non-cancelled orders grouped into each table's running bill.
  const tabs = new Map<string, { tableId: string | null; label: string; total: number; count: number; since: string }>();
  for (const o of orders) {
    if (o.paid_at || o.status === 'cancelled') continue;
    const key = o.table_id ?? 'none';
    const t = tabs.get(key) ?? { tableId: o.table_id, label: o.dining_tables?.label ?? 'No table', total: 0, count: 0, since: o.created_at };
    t.total += Number(o.total_usd);
    t.count += 1;
    tabs.set(key, t);
  }
  const billRequested = new Set(requests.filter((r) => r.kind === 'bill').map((r) => r.table_id));

  return (
    <div className="orders-board">
      <div className="board-toolbar">
        <span className={`live-dot ${live ? 'on' : ''}`}>{live ? 'Live' : 'Connecting…'}</span>
        {!soundOn ? (
          <button className="btn small primary" onClick={enableSound}>
            🔔 Turn on order sound
          </button>
        ) : (
          <span className="small muted">🔔 Sound on — keep this tab open</span>
        )}
      </div>

      {requests.length > 0 && (
        <div className="requests">
          {requests.map((r) => (
            <div key={r.id} className={`request ${r.kind}`}>
              <span>
                {r.kind === 'bill' ? '🧾' : '🙋'} <strong>{r.dining_tables?.label ?? 'A table'}</strong> {r.kind === 'bill' ? 'asked for the bill' : 'is calling a waiter'}
                <span className="muted small"> · {timeAgo(r.created_at)}</span>
              </span>
              <button className="btn small" onClick={() => resolveRequest(r)}>
                Done
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="board-columns">
        {columns.map((col) => {
          const list = active.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="board-col">
              <h3>
                {col.title} <span className="count">{list.length}</span>
              </h3>
              {list.length === 0 && <p className="muted small">Nothing here.</p>}
              {list.map((o) => (
                <article key={o.id} className={`order-card status-${o.status}`}>
                  <header>
                    <strong>#{o.order_number}</strong>
                    <span className="table-tag">{o.dining_tables?.label ?? 'No table'}</span>
                    <span className="muted small">{timeAgo(o.created_at)}</span>
                  </header>
                  <ul>
                    {o.order_items.map((it) => (
                      <li key={it.id}>
                        <b>{it.qty}×</b> {it.name}
                        {it.note && <div className="item-note">↳ {it.note}</div>}
                      </li>
                    ))}
                  </ul>
                  {o.note && <p className="order-note">📝 {o.note}</p>}
                  <footer>
                    <span>{usd(Number(o.total_usd))}</span>
                    <div className="card-actions">
                      <button className="btn small ghost" onClick={() => setStatus(o, 'cancelled')}>
                        Cancel
                      </button>
                      {o.status === 'new' ? (
                        <button className="btn small primary" onClick={() => setStatus(o, 'preparing')}>
                          Start preparing
                        </button>
                      ) : (
                        <button className="btn small primary" onClick={() => setStatus(o, 'served')}>
                          Mark served
                        </button>
                      )}
                    </div>
                  </footer>
                </article>
              ))}
            </section>
          );
        })}

        <section className="board-col">
          <h3>
            Open tables <span className="count">{tabs.size}</span>
          </h3>
          {tabs.size === 0 && <p className="muted small">No unpaid tables.</p>}
          {[...tabs.values()].map((t) => (
            <article key={t.tableId ?? 'none'} className={`tab-card ${billRequested.has(t.tableId) ? 'wants-bill' : ''}`}>
              <div>
                <strong>{t.label}</strong>
                {billRequested.has(t.tableId) && <span className="badge hot">Bill requested</span>}
                <p className="small muted">
                  {t.count} order{t.count === 1 ? '' : 's'} · since {timeAgo(t.since)}
                </p>
              </div>
              <div className="tab-card-right">
                <strong>{usd(t.total)}</strong>
                {restaurant.show_khr && <span className="small muted">{khr(t.total, restaurant.khr_rate)}</span>}
                <button className="btn small primary" onClick={() => closeTable(t.tableId, t.label, t.total)}>
                  Paid ✓
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
