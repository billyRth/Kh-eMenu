import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRightLeft, Ban, BellRing, Check, Combine, Receipt, Unlink, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { usd } from '@/lib/format';
import { useT } from '@/lib/i18n';
import type { DiningTable, ServiceRequest } from '@/lib/types';

type Props = {
  table: DiningTable | null;
  tables: DiningTable[];
  busyIds: Set<string>;
  billTotal: number | undefined;
  requests: ServiceRequest[];
  onClear: (table: DiningTable) => void;
  onResolve: (req: ServiceRequest) => void;
  onChanged: () => void;
  onClose: () => void;
};

/** What happens when staff tap a table: seat guests, combine, move, change guests or clear. */
export function TableSheet({ table, tables, busyIds, billTotal, requests, onClear, onResolve, onChanged, onClose }: Props) {
  const { t } = useT();
  const [mode, setMode] = useState<'main' | 'guests' | 'move' | 'combine' | 'unavailable'>('main');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');

  if (!table) return null;
  const label = table.label;
  const main = table.joined_to ? tables.find((x) => x.id === table.joined_to) : undefined;
  const off = table.unavailable !== null;
  const isFree = !busyIds.has(table.id);
  const freeTables = tables.filter((x) => x.id !== table.id && !busyIds.has(x.id));
  const partyTables = tables.filter((x) => x.id !== table.id && busyIds.has(x.id) && !x.joined_to && x.unavailable === null);

  const close = () => {
    setMode('main');
    onClose();
  };

  // Every write here is guarded so a second phone with an older screen can't overwrite a newer change.
  async function run(action: PromiseLike<{ data: unknown; error: { message: string } | null }>, success?: string) {
    setBusy(true);
    const { data, error } = await action;
    setBusy(false);
    if (error) toast.error(/TABLE_BUSY|table_unavailable/.test(error.message) ? t('s_tableNotFree') : error.message);
    else if (Array.isArray(data) && data.length === 0) toast.warning(t('s_tableChanged', { table: label }));
    else if (success) toast.success(success);
    onChanged();
    close();
  }

  const seat = (n: number) =>
    run(
      isFree
        ? supabase.from('dining_tables').update({ seated_at: new Date().toISOString(), party_size: n }).eq('id', table.id).is('seated_at', null).is('joined_to', null).select('id')
        : supabase.from('dining_tables').update({ party_size: n }).eq('id', table.id).select('id'),
      `${label} · ${t('s_guestsCount', { n })}`,
    );

  const moveTo = (to: DiningTable) => run(supabase.rpc('move_table', { p_from: table.id, p_to: to.id }), t('s_moved', { from: label, to: to.label }));
  const combineWith = (into: DiningTable) => run(supabase.rpc('join_table', { p_table: table.id, p_into: into.id }), t('s_combined', { table: label, into: into.label }));
  const separate = () =>
    run(
      supabase
        .from('dining_tables')
        .update({ joined_to: null, seated_at: null, party_size: null, cleared_at: new Date().toISOString() })
        .eq('id', table.id)
        .eq('joined_to', table.joined_to!)
        .select('id'),
    );

  const markUnavailable = () =>
    run(
      supabase.from('dining_tables').update({ unavailable: reason.trim().slice(0, 60) }).eq('id', table.id).is('seated_at', null).is('joined_to', null).select('id'),
      `${label} · ${t('s_unavailable')}`,
    );
  const makeAvailable = () => run(supabase.from('dining_tables').update({ unavailable: null }).eq('id', table.id).select('id'));

  const subtitle = off
    ? table.unavailable || t('s_unavailable')
    : main
    ? t('s_joinedWith', { table: main.label })
    : isFree
      ? t('s_free')
      : [table.party_size ? t('s_guestsCount', { n: table.party_size }) : t('s_seated'), billTotal ? usd(billTotal) : ''].filter(Boolean).join(' · ');

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold">{label}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        {mode !== 'main' && (
          <Button variant="ghost" size="sm" className="-mt-2 w-fit" onClick={() => setMode('main')}>
            <ArrowLeft /> {t('s_back')}
          </Button>
        )}

        {/* Free table: how many people, or combine with a table that already has guests. */}
        {mode === 'main' && isFree && (
          <div className="space-y-4">
            <GuestPicker title={t('howMany')} onPick={seat} disabled={busy} />
            <Button variant="outline" className="h-12 w-full justify-start text-base" disabled={busy} onClick={() => setMode('combine')}>
              <Combine /> {t('s_combine')}
            </Button>
            <Button variant="ghost" className="h-12 w-full justify-start text-base text-muted-foreground" disabled={busy} onClick={() => setMode('unavailable')}>
              <Ban /> {t('s_markUnavailable')}
            </Button>
          </div>
        )}

        {mode === 'unavailable' && (
          <div className="space-y-2">
            <p className="font-bold">{t('s_markUnavailable')}</p>
            <Input autoFocus maxLength={60} placeholder={t('s_unavailableReason')} value={reason} onChange={(e) => setReason(e.target.value)} className="h-12 text-base" />
            <Button className="h-12 w-full text-base font-bold" disabled={busy} onClick={markUnavailable}>
              <Ban /> {t('s_unavailable')}
            </Button>
          </div>
        )}

        {mode === 'main' && off && (
          <Button className="h-12 w-full justify-start text-base font-bold" disabled={busy} onClick={makeAvailable}>
            <Check /> {t('s_makeAvailable')}
          </Button>
        )}

        {mode === 'main' && main && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('s_joinedHint', { table: main.label })}</p>
            <Button variant="outline" className="h-12 w-full justify-start text-base" disabled={busy} onClick={separate}>
              <Unlink /> {t('s_separate')}
            </Button>
          </div>
        )}

        {mode === 'main' && !isFree && !main && (!off || !!billTotal || requests.length > 0) && (
          <div className="grid gap-2">
            {requests.map((r) => (
              <Button key={r.id} variant="outline" className="h-12 justify-start border-amber-300 bg-amber-50 text-base" onClick={() => { onResolve(r); close(); }}>
                <BellRing /> {r.kind === 'bill' ? t('s_wantsBill') : t('s_calling')} <Check className="ml-auto" /> {t('s_done')}
              </Button>
            ))}
            <Button className="h-12 justify-start bg-emerald-600 text-base font-bold hover:bg-emerald-700" disabled={busy} onClick={() => { close(); onClear(table); }}>
              <Receipt /> {billTotal ? t('s_clearPaid', { amt: usd(billTotal) }) : t('s_clearLeft')}
            </Button>
            <Button variant="outline" className="h-12 justify-start text-base" disabled={busy} onClick={() => setMode('move')}>
              <ArrowRightLeft /> {t('s_move')}
            </Button>
            <Button variant="outline" className="h-12 justify-start text-base" disabled={busy} onClick={() => setMode('guests')}>
              <Users /> {t('s_changeGuests')}
            </Button>
          </div>
        )}

        {mode === 'guests' && <GuestPicker title={t('s_changeGuests')} onPick={seat} disabled={busy} />}

        {mode === 'move' && (
          <TablePicker title={t('s_moveTo', { table: label })} empty={t('s_noFreeTables')} options={freeTables} onPick={moveTo} disabled={busy} />
        )}

        {mode === 'combine' && (
          <TablePicker title={t('s_combineWith', { table: label })} empty={t('s_noBusyTables')} options={partyTables} onPick={combineWith} disabled={busy} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function GuestPicker({ title, onPick, disabled }: { title: string; onPick: (n: number) => void; disabled: boolean }) {
  const { t } = useT();
  const [custom, setCustom] = useState('');
  const n = Number(custom);
  return (
    <div className="space-y-2">
      <p className="font-bold">{title}</p>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => (
          <Button key={k} variant="outline" className="h-14 text-xl font-extrabold" disabled={disabled} onClick={() => onPick(k)}>
            {k}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input type="number" inputMode="numeric" min={1} max={99} placeholder={t('s_more')} value={custom} onChange={(e) => setCustom(e.target.value)} className="h-12 text-base" />
        <Button className="h-12 px-5" disabled={disabled || !Number.isInteger(n) || n < 1 || n > 99} onClick={() => onPick(n)}>
          <Check />
        </Button>
      </div>
    </div>
  );
}

function TablePicker({ title, empty, options, onPick, disabled }: { title: string; empty: string; options: DiningTable[]; onPick: (t: DiningTable) => void; disabled: boolean }) {
  return (
    <div className="space-y-2">
      <p className="font-bold">{title}</p>
      {options.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <Button key={o.id} variant="outline" className="h-12 text-base font-bold" disabled={disabled} onClick={() => onPick(o)}>
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
