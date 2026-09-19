import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BellRing, Check, ChefHat, Clock, HandPlatter, MonitorSmartphone, Receipt, StickyNote, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { khr, timeAgo, usd } from '@/lib/format';
import type { Order, OrderStatus, Restaurant, ServiceRequest } from '@/lib/types';

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
    gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

/** Keep a kitchen tablet's screen from sleeping while the board is open. */
function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => {
      if (document.visibilityState === 'visible') {
        navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {});
      }
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      document.removeEventListener('visibilitychange', acquire);
      lock?.release().catch(() => {});
    };
  }, [enabled]);
}

export function OrdersBoard({ restaurant }: { restaurant: Restaurant }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [alertsOn, setAlertsOn] = useState(false);
  const [live, setLive] = useState(false);
  const [, setTick] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const seen = useRef<Set<string> | null>(null);
  useWakeLock(alertsOn);

  const refresh = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [o, r] = await Promise.all([
      supabase.from('orders').select(ORDER_SELECT).eq('restaurant_id', restaurant.id).gte('created_at', since).order('created_at', { ascending: true }),
      supabase.from('service_requests').select('*, dining_tables(label)').eq('restaurant_id', restaurant.id).is('resolved_at', null).order('created_at'),
    ]);
    if (o.data && r.data) {
      const nextOrders = o.data as unknown as Order[];
      const nextRequests = r.data as unknown as ServiceRequest[];
      const ids = new Set([...nextOrders.map((x) => x.id), ...nextRequests.map((x) => x.id)]);
      // Alert only for things that appeared since the last refresh, not on first load.
      if (seen.current) {
        const fresh = [...nextOrders.filter((x) => !seen.current!.has(x.id)), ...nextRequests.filter((x) => !seen.current!.has(x.id))];
        if (fresh.length) {
          if (audio.current) chime(audio.current);
          for (const f of fresh) {
            const label = f.dining_tables?.label ?? 'A table';
            if ('order_number' in f) toast(`New order #${f.order_number} · ${label}`, { icon: <ChefHat className="size-4" /> });
            else toast(`${label} ${f.kind === 'bill' ? 'asked for the bill' : 'is calling a waiter'}`, { icon: <BellRing className="size-4" /> });
          }
        }
      }
      seen.current = ids;
      setOrders(nextOrders);
      setRequests(nextRequests);
    }
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

  const newCount = orders.filter((o) => o.status === 'new' && !o.paid_at).length;
  useEffect(() => {
    const pending = newCount + requests.length;
    document.title = pending > 0 ? `(${pending}) eMenu Staff` : 'eMenu Staff';
  }, [newCount, requests.length]);

  function enableAlerts() {
    audio.current ??= new AudioContext();
    audio.current.resume();
    chime(audio.current);
    setAlertsOn(true);
  }

  async function setStatus(order: Order, status: OrderStatus) {
    if (status === 'cancelled' && !window.confirm(`Cancel order #${order.order_number}?`)) return;
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    const { error } = await supabase.from('orders').update({ status }).eq('id', order.id);
    if (error) toast.error(error.message);
    refresh();
  }

  async function resolveRequest(req: ServiceRequest) {
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    await supabase.from('service_requests').update({ resolved_at: new Date().toISOString() }).eq('id', req.id);
  }

  async function closeTable(tableId: string | null, label: string, total: number) {
    if (!window.confirm(`Mark ${label} as paid (${usd(total)}) and clear its bill?`)) return;
    const now = new Date().toISOString();
    let q = supabase.from('orders').update({ paid_at: now }).eq('restaurant_id', restaurant.id).is('paid_at', null);
    q = tableId ? q.eq('table_id', tableId) : q.is('table_id', null);
    const { error } = await q;
    if (error) return toast.error(error.message);
    if (tableId) await supabase.from('service_requests').update({ resolved_at: now }).eq('table_id', tableId).is('resolved_at', null);
    toast.success(`${label} closed · ${usd(total)}`);
    refresh();
  }

  const active = orders.filter((o) => (o.status === 'new' || o.status === 'preparing') && !o.paid_at);

  // Unpaid, non-cancelled orders grouped into each table's running bill, with a per-person split.
  type TableBill = { tableId: string | null; label: string; total: number; count: number; since: string; people: Map<string, number> };
  const bills = new Map<string, TableBill>();
  for (const o of orders) {
    if (o.paid_at || o.status === 'cancelled') continue;
    const key = o.table_id ?? 'none';
    const bill = bills.get(key) ?? { tableId: o.table_id, label: o.dining_tables?.label ?? 'No table', total: 0, count: 0, since: o.created_at, people: new Map() };
    const amount = Number(o.total_usd);
    bill.total += amount;
    bill.count += 1;
    const who = o.guest_name?.trim() || 'Guest';
    bill.people.set(who, (bill.people.get(who) ?? 0) + amount);
    bills.set(key, bill);
  }
  const billRequested = new Set(requests.filter((r) => r.kind === 'bill').map((r) => r.table_id));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn('inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-bold', live ? 'text-emerald-700' : 'text-muted-foreground')}>
          <span className={cn('size-2 rounded-full', live ? 'bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/20' : 'bg-muted-foreground/40')} />
          {live ? 'Live' : 'Connecting…'}
        </span>
        {alertsOn ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Volume2 className="size-3.5" /> Sound on · screen stays awake · keep this tab open
          </span>
        ) : (
          <Button size="lg" onClick={enableAlerts} className="font-bold">
            <Volume2 /> Turn on order alerts
          </Button>
        )}
      </div>

      {requests.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {requests.map((r) => (
            <div
              key={r.id}
              className={cn(
                'flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm',
                r.kind === 'bill' ? 'border-emerald-200 bg-emerald-50' : 'animate-pulse border-amber-200 bg-amber-50',
              )}
            >
              <div className={cn('grid size-10 place-items-center rounded-xl text-white', r.kind === 'bill' ? 'bg-emerald-600' : 'bg-amber-500')}>
                {r.kind === 'bill' ? <Receipt className="size-5" /> : <HandPlatter className="size-5" />}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-bold">
                  {r.dining_tables?.label ?? 'A table'} {r.kind === 'bill' ? 'wants the bill' : 'is calling a waiter'}
                </p>
                <p className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</p>
              </div>
              <Button size="sm" variant="outline" className="bg-card" onClick={() => resolveRequest(r)}>
                <Check /> Done
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {(['new', 'preparing'] as const).map((status) => {
          const list = active.filter((o) => o.status === status);
          return (
            <section key={status} className="space-y-3 rounded-3xl bg-card/60 p-3 ring-1 ring-foreground/5">
              <h3 className="flex items-center gap-2 px-1 pt-1 font-bold">
                {status === 'new' ? <BellRing className="size-4 text-blue-600" /> : <ChefHat className="size-4 text-amber-600" />}
                {status === 'new' ? 'New' : 'Preparing'}
                <span className="ml-auto rounded-full bg-secondary px-2.5 text-xs leading-5">{list.length}</span>
              </h3>
              {list.length === 0 && <p className="px-1 pb-2 text-sm text-muted-foreground">Nothing here.</p>}
              {list.map((o) => (
                <article key={o.id} className={cn('overflow-hidden rounded-2xl border-l-4 bg-card shadow-sm ring-1 ring-foreground/5', status === 'new' ? 'border-l-blue-500' : 'border-l-amber-500')}>
                  <div className="space-y-3 p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold">#{o.order_number}</span>
                      <Badge className="bg-foreground text-background">{o.dining_tables?.label ?? 'No table'}</Badge>
                      {o.guest_name && <span className="truncate text-xs text-muted-foreground">{o.guest_name}</span>}
                      <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" /> {timeAgo(o.created_at)}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {o.order_items.map((it) => (
                        <li key={it.id} className="text-[15px]">
                          <span className="mr-2 inline-grid min-w-6 place-items-center rounded-md bg-secondary px-1 text-sm font-extrabold">{it.qty}</span>
                          {it.name}
                          {it.note && <p className="ml-8 text-sm font-semibold text-amber-700">↳ {it.note}</p>}
                        </li>
                      ))}
                    </ul>
                    {o.note && (
                      <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-sm font-medium text-amber-800">
                        <StickyNote className="mt-0.5 size-3.5 shrink-0" /> {o.note}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 border-t bg-secondary/40 px-3.5 py-2.5">
                    <span className="font-bold tabular-nums">{usd(Number(o.total_usd))}</span>
                    <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => setStatus(o, 'cancelled')}>
                      <X /> Cancel
                    </Button>
                    {status === 'new' ? (
                      <Button size="sm" onClick={() => setStatus(o, 'preparing')}>
                        <ChefHat /> Start cooking
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setStatus(o, 'served')}>
                        <Check /> Served
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          );
        })}

        <section className="space-y-3 rounded-3xl bg-card/60 p-3 ring-1 ring-foreground/5">
          <h3 className="flex items-center gap-2 px-1 pt-1 font-bold">
            <Receipt className="size-4 text-emerald-600" /> Open bills
            <span className="ml-auto rounded-full bg-secondary px-2.5 text-xs leading-5">{bills.size}</span>
          </h3>
          {bills.size === 0 && <p className="px-1 pb-2 text-sm text-muted-foreground">No unpaid tables.</p>}
          {[...bills.values()].map((b) => (
            <article key={b.tableId ?? 'none'} className={cn('space-y-2.5 rounded-2xl bg-card p-3.5 shadow-sm ring-1', billRequested.has(b.tableId) ? 'ring-2 ring-emerald-500' : 'ring-foreground/5')}>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="font-bold">
                    {b.label}
                    {billRequested.has(b.tableId) && <Badge className="ml-2 bg-emerald-100 text-emerald-800">Wants bill</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.count} order{b.count === 1 ? '' : 's'} · since {timeAgo(b.since)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold tabular-nums">{usd(b.total)}</p>
                  {restaurant.show_khr && <p className="text-xs text-muted-foreground">{khr(b.total, restaurant.khr_rate)}</p>}
                </div>
              </div>
              {b.people.size > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {[...b.people.entries()].map(([name, amount]) => (
                    <span key={name} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">
                      {name} <b className="tabular-nums">{usd(amount)}</b>
                    </span>
                  ))}
                </div>
              )}
              <Button className="w-full bg-emerald-600 font-bold hover:bg-emerald-700" onClick={() => closeTable(b.tableId, b.label, b.total)}>
                <Check /> Paid, close bill
              </Button>
            </article>
          ))}
        </section>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <MonitorSmartphone className="size-3.5" /> Tip: open this page on a tablet at the counter or in the kitchen. Any phone signed in here gets the same live orders.
      </p>
    </div>
  );
}
