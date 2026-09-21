import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BellRing, Check, LayoutGrid, ChefHat, Clock, HandPlatter, MonitorSmartphone, Receipt, StickyNote, Users, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { khr, timeAgo, usd } from '@/lib/format';
import { useT } from '@/lib/i18n';
import type { DiningTable, Order, OrderStatus, Restaurant, ServiceRequest } from '@/lib/types';
import { DeviceSetup } from './DeviceSetup';
import { TableSheet } from './TableSheet';

type TableBill = { tableId: string | null; label: string; total: number; orderIds: string[]; since: string; people: Map<string, number> };

const ORDER_SELECT ='*, order_items(id, name, unit_price_usd, qty, note, options), dining_tables(label)';

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
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [alertsOn, setAlertsOn] = useState(false);
  const [live, setLive] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const seen = useRef<Set<string> | null>(null);
  useWakeLock(alertsOn);
  const { lang, t } = useT();
  // refresh() reads the language through a ref so switching language doesn't resubscribe realtime.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const refresh = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [o, r, tb] = await Promise.all([
      supabase.from('orders').select(ORDER_SELECT).eq('restaurant_id', restaurant.id).gte('created_at', since).order('created_at', { ascending: true }),
      supabase.from('service_requests').select('*, dining_tables(label)').eq('restaurant_id', restaurant.id).is('resolved_at', null).order('created_at'),
      supabase.from('dining_tables').select('*').eq('restaurant_id', restaurant.id).eq('is_active', true).order('sort_order').order('created_at'),
    ]);
    if (tb.data) setTables(tb.data);
    if (o.data && r.data) {
      const nextOrders = o.data as unknown as Order[];
      const nextRequests = r.data as unknown as ServiceRequest[];
      const ids = new Set([...nextOrders.map((x) => x.id), ...nextRequests.map((x) => x.id)]);
      // Alert only for things that appeared since the last refresh, not on first load.
      if (seen.current) {
        const fresh = [...nextOrders.filter((x) => !seen.current!.has(x.id)), ...nextRequests.filter((x) => !seen.current!.has(x.id))];
        if (fresh.length) {
          if (audio.current) chime(audio.current);
          const t = tRef.current;
          for (const f of fresh) {
            const label = f.dining_tables?.label ?? t('s_aTable');
            if ('order_number' in f) toast(t('s_newOrderToast', { n: f.order_number, table: label }), { icon: <ChefHat className="size-4" /> });
            else toast(t(f.kind === 'bill' ? 's_askedBillToast' : 's_callingToast', { table: label }), { icon: <BellRing className="size-4" /> });
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dining_tables', filter: `restaurant_id=eq.${restaurant.id}` }, () => refresh())
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
    document.title = pending > 0 ? `(${pending}) KhMenu Staff` : 'KhMenu Staff';
  }, [newCount, requests.length]);

  function enableAlerts() {
    audio.current ??= new AudioContext();
    audio.current.resume();
    chime(audio.current);
    setAlertsOn(true);
  }

  async function setStatus(order: Order, status: OrderStatus) {
    if (status === 'cancelled' && !window.confirm(t('s_confirmCancel', { n: order.order_number }))) return;
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    // Only change it if nobody else did first: another phone may be showing an older status.
    const { data, error } = await supabase.from('orders').update({ status }).eq('id', order.id).eq('status', order.status).select('id');
    if (error) toast.error(error.message);
    else if (!data.length) toast.warning(t('s_alreadyUpdated', { n: order.order_number }));
    refresh();
  }

  async function resolveRequest(req: ServiceRequest) {
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    await supabase.from('service_requests').update({ resolved_at: new Date().toISOString() }).eq('id', req.id);
  }

  async function closeTable({ tableId, label, total, orderIds }: TableBill) {
    if (!window.confirm(t('s_confirmClose', { table: label, amt: usd(total) }))) return;
    const now = new Date().toISOString();
    // Pay only the orders on the bill that was shown, never one that arrived while the prompt was open.
    const { data: paid, error } = await supabase.from('orders').update({ paid_at: now }).in('id', orderIds).is('paid_at', null).select('id');
    if (error) return toast.error(error.message);
    if (!paid.length) {
      toast.warning(t('s_alreadyClosed', { table: label }));
      return refresh();
    }
    if (tableId) {
      const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('table_id', tableId).is('paid_at', null).neq('status', 'cancelled');
      if (count) {
        toast.warning(t('s_paidButNew', { table: label, amt: usd(total) }));
        return refresh();
      }
      await resetTable(tableId, now);
    }
    toast.success(t('s_tableClosed', { table: label, amt: usd(total) }));
    refresh();
  }

  // Clearing a table starts fresh: the next guests who scan see nothing from before, and joined tables are freed.
  async function resetTable(tableId: string, now = new Date().toISOString()) {
    await Promise.all([
      supabase.from('service_requests').update({ resolved_at: now }).eq('table_id', tableId).is('resolved_at', null),
      supabase.from('dining_tables').update({ cleared_at: now, seated_at: null, party_size: null }).eq('id', tableId),
      supabase.from('dining_tables').update({ cleared_at: now, seated_at: null, party_size: null, joined_to: null }).eq('joined_to', tableId),
    ]);
  }

  function clearTable(tb: DiningTable) {
    const bill = bills.get(tb.id);
    if (bill) return closeTable(bill);
    resetTable(tb.id).then(refresh);
  }

  const active = orders.filter((o) => (o.status === 'new' || o.status === 'preparing') && !o.paid_at);

  // Unpaid, non-cancelled orders grouped into each table's running bill, with a per-person split.
  const bills = new Map<string, TableBill>();
  for (const o of orders) {
    if (o.paid_at || o.status === 'cancelled') continue;
    const key = o.table_id ?? 'none';
    const bill: TableBill = bills.get(key) ?? { tableId: o.table_id, label: o.dining_tables?.label ?? t('s_noTable'), total: 0, orderIds: [], since: o.created_at, people: new Map() };
    const amount = Number(o.total_usd);
    bill.total += amount;
    bill.orderIds.push(o.id);
    const who = o.guest_name?.trim() || t('guest');
    bill.people.set(who, (bill.people.get(who) ?? 0) + amount);
    bills.set(key, bill);
  }
  const billRequested = new Set(requests.filter((r) => r.kind === 'bill').map((r) => r.table_id));
  // A table is taken if it has guests seated, an open bill, a call, or is joined to / by another table.
  const busyIds = new Set(
    tables
      .filter((tb) => tb.seated_at || tb.joined_to || tb.unavailable !== null || bills.has(tb.id) || requests.some((r) => r.table_id === tb.id) || tables.some((x) => x.joined_to === tb.id))
      .map((tb) => tb.id),
  );
  const sheetTable = tables.find((tb) => tb.id === sheetId) ?? null;

  return (
    <div className="space-y-5">
      <DeviceSetup restaurant={restaurant} />
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn('inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-bold', live ? 'text-emerald-700' : 'text-muted-foreground')}>
          <span className={cn('size-2 rounded-full', live ? 'bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/20' : 'bg-muted-foreground/40')} />
          {live ? t('s_live') : t('s_connecting')}
        </span>
        {alertsOn ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Volume2 className="size-3.5" /> {t('s_alertsOnNote')}
          </span>
        ) : (
          <Button size="lg" onClick={enableAlerts} className="font-bold">
            <Volume2 /> {t('s_turnOnAlerts')}
          </Button>
        )}
      </div>

      {tables.length > 0 && (
        <section className="rounded-3xl bg-card/60 p-3 ring-1 ring-foreground/5">
          <h3 className="flex items-center gap-2 px-1 pb-2 font-bold">
            <LayoutGrid className="size-4 text-muted-foreground" /> {t('s_tables')}
            <span className="ml-auto text-xs font-medium text-muted-foreground">{t('s_tablesHint')}</span>
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
            {tables.map((tb) => {
              const bill = bills.get(tb.id);
              const wants = requests.find((r) => r.table_id === tb.id && r.kind === 'bill');
              const calling = requests.find((r) => r.table_id === tb.id && r.kind === 'waiter');
              const main = tb.joined_to ? tables.find((x) => x.id === tb.joined_to) : undefined;
              const busy = busyIds.has(tb.id);
              const off = tb.unavailable !== null;
              return (
                <button
                  key={tb.id}
                  onClick={() => setSheetId(tb.id)}
                  className={cn(
                    'rounded-2xl border-2 p-2.5 text-left transition active:scale-95',
                    wants ? 'border-emerald-500 bg-emerald-50' : calling ? 'border-amber-400 bg-amber-50' : off ? 'border-border bg-muted text-muted-foreground' : main ? 'border-primary/25 bg-primary/5' : busy ? 'border-primary/40 bg-card' : 'border-dashed border-border bg-transparent',
                  )}
                >
                  <p className="flex items-center gap-1 truncate text-sm font-bold">
                    {tb.label}
                    {tb.party_size && (
                      <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
                        <Users className="size-3" /> {tb.party_size}
                      </span>
                    )}
                  </p>
                  <p className={cn('truncate text-xs font-semibold', wants ? 'text-emerald-700' : calling ? 'text-amber-700' : busy ? 'text-foreground' : 'text-muted-foreground')}>
                    {wants ? t('s_wantsBill') : calling ? t('s_calling') : off ? tb.unavailable || t('s_unavailable') : main ? t('s_joinedWith', { table: main.label }) : bill ? usd(bill.total) : busy ? t('s_seated') : t('s_free')}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <TableSheet
        key={sheetId ?? 'none'}
        table={sheetTable}
        tables={tables}
        busyIds={busyIds}
        billTotal={sheetTable ? bills.get(sheetTable.id)?.total : undefined}
        requests={requests.filter((r) => r.table_id === sheetId)}
        onClear={clearTable}
        onResolve={resolveRequest}
        onChanged={refresh}
        onClose={() => setSheetId(null)}
      />

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
                  {t(r.kind === 'bill' ? 's_wantsBillLine' : 's_callingToast', { table: r.dining_tables?.label ?? t('s_aTable') })}
                </p>
                <p className="text-xs text-muted-foreground">{timeAgo(r.created_at, lang)}</p>
              </div>
              <Button size="sm" variant="outline" className="bg-card" onClick={() => resolveRequest(r)}>
                <Check /> {t('s_done')}
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
                {status === 'new' ? t('s_colNew') : t('status_preparing')}
                <span className="ml-auto rounded-full bg-secondary px-2.5 text-xs leading-5">{list.length}</span>
              </h3>
              {list.length === 0 && <p className="px-1 pb-2 text-sm text-muted-foreground">{t('s_nothingHere')}</p>}
              {list.map((o) => (
                <article key={o.id} className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-foreground/5">
                  <div className="space-y-3 p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold">#{o.order_number}</span>
                      <Badge className="bg-foreground text-background">{o.dining_tables?.label ?? t('s_noTable')}</Badge>
                      {o.guest_name && <span className="truncate text-xs text-muted-foreground">{o.guest_name}</span>}
                      <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" /> {timeAgo(o.created_at, lang)}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {o.order_items.map((it) => (
                        <li key={it.id} className="text-[15px]">
                          <span className="mr-2 inline-grid min-w-6 place-items-center rounded-md bg-secondary px-1 text-sm font-extrabold">{it.qty}</span>
                          {it.name}
                          {it.options?.length > 0 && <p className="ml-8 text-sm font-semibold text-blue-700">{it.options.map((op) => op.choice).join(' · ')}</p>}
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
                      <X /> {t('s_cancel')}
                    </Button>
                    {status === 'new' ? (
                      <Button size="sm" onClick={() => setStatus(o, 'preparing')}>
                        <ChefHat /> {t('s_startCooking')}
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setStatus(o, 'served')}>
                        <Check /> {t('status_served')}
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
            <Receipt className="size-4 text-emerald-600" /> {t('s_openBills')}
            <span className="ml-auto rounded-full bg-secondary px-2.5 text-xs leading-5">{bills.size}</span>
          </h3>
          {bills.size === 0 && <p className="px-1 pb-2 text-sm text-muted-foreground">{t('s_noOpenBills')}</p>}
          {[...bills.values()].map((b) => (
            <article key={b.tableId ?? 'none'} className={cn('space-y-2.5 rounded-2xl bg-card p-3.5 shadow-sm ring-1', billRequested.has(b.tableId) ? 'ring-2 ring-emerald-500' : 'ring-foreground/5')}>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="font-bold">
                    {b.label}
                    {billRequested.has(b.tableId) && <Badge className="ml-2 bg-emerald-100 text-emerald-800">{t('s_wantsBill')}</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(b.orderIds.length === 1 ? 's_billOrders1' : 's_billOrdersN', { n: b.orderIds.length, time: timeAgo(b.since, lang) })}
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
              <Button className="w-full bg-emerald-600 font-bold hover:bg-emerald-700" onClick={() => closeTable(b)}>
                <Check /> {t('s_paidClose')}
              </Button>
            </article>
          ))}
        </section>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <MonitorSmartphone className="size-3.5" /> {t('s_boardTip')}
      </p>
    </div>
  );
}
