import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Coffee, CupSoda, IceCreamCone, Lock, Receipt, Salad, ShoppingBag, TrendingDown, TrendingUp, Trophy, Utensils, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { friendlyError, supabase } from '@/lib/supabase';
import { khr, usd } from '@/lib/format';
import type { Restaurant } from '@/lib/types';

type Report = {
  date: string;
  orders: number;
  sales: number;
  collected: number;
  profit: number;
  profit_coverage: number;
  items_sold: number;
  groups: Partial<Record<'starter' | 'main' | 'drink' | 'dessert' | 'other', { qty: number; sales: number }>>;
  top_dish: { name: string; qty: number } | null;
  top_drink: { name: string; qty: number } | null;
  top_items: { name: string; qty: number; sales: number; group: string }[];
  by_hour: { hour: number; orders: number; sales: number }[];
  yesterday: { sales: number; orders: number };
};

/** Restaurants close late, so before 5am Phnom Penh time "today" still means the previous business day. */
function businessDate(): string {
  const pp = new Date(Date.now() + 7 * 3600_000 - 5 * 3600_000);
  return pp.toISOString().slice(0, 10);
}

function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayLabel(iso: string) {
  const today = businessDate();
  if (iso === today) return 'Today';
  if (iso === shiftDate(today, -1)) return 'Yesterday';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`;

export function DailyReport({ restaurant }: { restaurant: Restaurant }) {
  const [date, setDate] = useState(businessDate);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('daily_report', { p_restaurant_id: restaurant.id, p_date: date });
    if (rpcError) {
      setReport(null);
      setError(rpcError.message.includes('REPORTS_DISABLED') ? 'disabled' : friendlyError(rpcError.message));
    } else {
      setReport(data as Report);
    }
  }, [restaurant.id, date]);

  useEffect(() => {
    load();
  }, [load]);

  if (error === 'disabled' || !restaurant.reports_enabled) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-card p-8 text-center shadow-sm ring-1 ring-foreground/5">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="size-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold">Daily report is an add-on</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          See today’s sales, profit, orders, drinks and best sellers the moment you close. Ask KhMenu to switch it on for your restaurant.
        </p>
      </div>
    );
  }

  const r = report;
  const change = r && r.yesterday.sales > 0 ? ((r.sales - r.yesterday.sales) / r.yesterday.sales) * 100 : null;
  const groups = r?.groups ?? {};
  const topMax = Math.max(1, ...(r?.top_items ?? []).map((i) => i.qty));
  const hourMax = Math.max(1, ...(r?.by_hour ?? []).map((h) => h.orders));
  const peak = r?.by_hour.reduce<Report['by_hour'][number] | null>((best, h) => (!best || h.orders > best.orders ? h : best), null);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-2xl font-extrabold tracking-tight">{dayLabel(date)}</h2>
          <p className="text-sm text-muted-foreground">End-of-day report · {date}</p>
        </div>
        <Button variant="outline" size="icon" aria-label="Previous day" onClick={() => setDate((d) => shiftDate(d, -1))}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" aria-label="Next day" disabled={date >= businessDate()} onClick={() => setDate((d) => shiftDate(d, 1))}>
          <ChevronRight />
        </Button>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {!r && !error && <p className="text-sm text-muted-foreground">Loading…</p>}

      {r && r.orders === 0 && (
        <div className="rounded-3xl bg-card p-8 text-center text-muted-foreground ring-1 ring-foreground/5">No orders on this day yet.</div>
      )}

      {r && r.orders > 0 && (
        <>
          {/* Headline numbers */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={<Receipt />} label="Total sales" value={usd(Number(r.sales))} sub={restaurant.show_khr ? khr(Number(r.sales), restaurant.khr_rate) : undefined}>
              {change !== null && (
                <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', change >= 0 ? 'text-emerald-700' : 'text-destructive')}>
                  {change >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {change >= 0 ? '+' : ''}
                  {change.toFixed(0)}% vs day before
                </span>
              )}
            </Stat>
            <Stat
              icon={<Wallet />}
              label="Profit"
              value={r.profit_coverage > 0 ? usd(Number(r.profit)) : 'n/a'}
              sub={r.profit_coverage >= 100 ? 'After food costs' : r.profit_coverage > 0 ? `Based on ${r.profit_coverage}% of items with a cost set` : 'Add dish costs in Menu to see profit'}
            />
            <Stat icon={<ShoppingBag />} label="Orders" value={String(r.orders)} sub={`Avg ${usd(Number(r.sales) / r.orders)} per order`} />
            <Stat icon={<Utensils />} label="Items sold" value={String(r.items_sold)} sub={`Collected ${usd(Number(r.collected))}`} />
          </div>

          {/* By category */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <GroupTile icon={<CupSoda />} label="Drinks" data={groups.drink} />
            <GroupTile icon={<Salad />} label="Appetizers" data={groups.starter} />
            <GroupTile icon={<Utensils />} label="Mains" data={groups.main} />
            <GroupTile icon={<IceCreamCone />} label="Desserts" data={groups.dessert} />
          </div>

          {/* Winners */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Winner icon={<Trophy />} label="Most popular dish" item={r.top_dish} />
            <Winner icon={<Coffee />} label="Most popular drink" item={r.top_drink} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top sellers: horizontal bars, value at the tip */}
            <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/5">
              <h3 className="font-bold">Best sellers</h3>
              <p className="text-xs text-muted-foreground">Portions sold</p>
              <ul className="mt-4 space-y-3">
                {r.top_items.map((it) => (
                  <li key={it.name} title={`${it.name}: ${it.qty} sold · ${usd(Number(it.sales))}`}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{it.name}</span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">{usd(Number(it.sales))}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 rounded-r bg-primary" style={{ width: `${Math.max(4, (it.qty / topMax) * 85)}%` }} />
                      <span className="text-xs font-semibold tabular-nums">{it.qty}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Orders by hour: columns from one baseline, hover for values, label only the peak */}
            <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/5">
              <h3 className="font-bold">Busiest hours</h3>
              <p className="text-xs text-muted-foreground">
                Orders per hour{peak ? ` · peak ${hourLabel(peak.hour)} with ${peak.orders} orders` : ''}
              </p>
              <HourChart data={r.by_hour} max={hourMax} peakHour={peak?.hour} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value, sub, children }: { icon: ReactNode; label: string; value: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-card p-4 ring-1 ring-foreground/5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground [&_svg]:size-4">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

function GroupTile({ icon, label, data }: { icon: ReactNode; label: string; data?: { qty: number; sales: number } }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/5">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label} sold</p>
        <p className="font-bold tabular-nums">
          {data?.qty ?? 0}
          <span className="ml-1.5 text-xs font-medium text-muted-foreground">{usd(Number(data?.sales ?? 0))}</span>
        </p>
      </div>
    </div>
  );
}

function Winner({ icon, label, item }: { icon: ReactNode; label: string; item: { name: string; qty: number } | null }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-card p-4 ring-1 ring-foreground/5">
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800 [&_svg]:size-6">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-bold">{item ? item.name : 'None yet'}</p>
        {item && <p className="text-xs text-muted-foreground">{item.qty} sold</p>}
      </div>
    </div>
  );
}

function HourChart({ data, max, peakHour }: { data: Report['by_hour']; max: number; peakHour?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;
  // Show a continuous range from the first to the last active hour so quiet hours read as gaps.
  const first = Math.min(...data.map((d) => d.hour));
  const last = Math.max(...data.map((d) => d.hour));
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const byHour = new Map(data.map((d) => [d.hour, d]));

  return (
    <div className="relative mt-4">
      <div className="flex h-44 items-end gap-0.5 border-b border-border" onMouseLeave={() => setHover(null)}>
        {hours.map((h) => {
          const d = byHour.get(h);
          const height = d ? Math.max(4, (d.orders / max) * 100) : 0;
          return (
            <div key={h} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(h)} onTouchStart={() => setHover(h)}>
              {d && h === peakHour && <span className="absolute text-xs font-semibold tabular-nums" style={{ bottom: `calc(${height}% + 4px)` }}>{d.orders}</span>}
              <div className={cn('w-full max-w-6 rounded-t bg-primary transition-opacity', hover !== null && hover !== h && 'opacity-50')} style={{ height: `${height}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-0.5 text-[10px] text-muted-foreground">
        {hours.map((h) => (
          <span key={h} className="flex-1 text-center">
            {(h - first) % 2 === 0 ? hourLabel(h) : ''}
          </span>
        ))}
      </div>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 right-0 rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background shadow">
          <b>{hourLabel(hover)}</b> · {byHour.get(hover)?.orders ?? 0} orders · {usd(Number(byHour.get(hover)?.sales ?? 0))}
        </div>
      )}
    </div>
  );
}
