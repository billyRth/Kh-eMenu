import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Copy, Download, ExternalLink, Globe, Pencil, Plus, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { menuUrl, tableUrl } from '@/lib/format';
import type { DiningTable, Restaurant } from '@/lib/types';

const newToken = () => crypto.randomUUID().replace(/-/g, '').slice(0, 14);

function useQr(text: string) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(text, { width: 600, margin: 1, errorCorrectionLevel: 'M' }).then(setSrc);
  }, [text]);
  return src;
}

export function TablesManager({ restaurant }: { restaurant: Restaurant }) {
  const [tables, setTables] = useState<DiningTable[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from('dining_tables').select('*').eq('restaurant_id', restaurant.id).order('sort_order').order('created_at');
    if (data) setTables(data);
  }, [restaurant.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: PromiseLike<{ error: { message: string } | null }>, success?: string) {
    const { error } = await action;
    if (error) toast.error(error.message);
    else if (success) toast.success(success);
    load();
  }

  const addTable = () => {
    const n = Math.max(0, ...tables.map((t) => t.sort_order)) + 1;
    run(supabase.from('dining_tables').insert({ restaurant_id: restaurant.id, label: `Table ${n}`, sort_order: n }), `Table ${n} added`);
  };

  const rename = (t: DiningTable) => {
    const label = window.prompt('Table name (shown to diners and on orders)', t.label)?.trim();
    if (label && label !== t.label) run(supabase.from('dining_tables').update({ label }).eq('id', t.id));
  };

  const regenerate = (t: DiningTable) => {
    if (window.confirm(`Make a new QR code for ${t.label}? The old printed code will stop working.`)) {
      run(supabase.from('dining_tables').update({ token: newToken() }).eq('id', t.id), 'New QR code made. Print it again.');
    }
  };

  const remove = (t: DiningTable) => {
    if (window.confirm(`Delete ${t.label}? Its QR code will stop working. Past orders are kept.`)) {
      run(supabase.from('dining_tables').delete().eq('id', t.id), `${t.label} deleted`);
    }
  };

  return (
    <div className="space-y-6">
      <PublicMenuCard restaurant={restaurant} />

      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-bold">Table QR codes</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Stick one on each table. Scanning opens the menu with ordering turned on for that table. People can only order after scanning a table code.
          </p>
        </div>
        <Button variant="outline" onClick={addTable}>
          <Plus /> Add table
        </Button>
        <Button onClick={() => window.print()} disabled={tables.length === 0}>
          <Printer /> Print all
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-2 print:gap-0">
        {tables.map((t) => (
          <TableCard key={t.id} table={t} restaurant={restaurant} onRename={() => rename(t)} onRegenerate={() => regenerate(t)} onDelete={() => remove(t)} />
        ))}
      </div>
    </div>
  );
}

function PublicMenuCard({ restaurant }: { restaurant: Restaurant }) {
  const url = menuUrl(restaurant.slug);
  const qr = useQr(url);

  return (
    <div className="no-print flex flex-col gap-5 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/5 sm:flex-row sm:items-center">
      {qr && <img src={qr} alt="QR code for the public menu" className="size-32 shrink-0 rounded-xl border p-1.5" />}
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Globe className="size-5 text-primary" /> Public menu link
          </h2>
          <p className="text-sm text-muted-foreground">View only, no ordering. Put it on Google Maps, Facebook, Instagram, Telegram and your front door.</p>
        </div>
        <code className="block truncate rounded-lg bg-secondary px-3 py-2 text-xs">{url}</code>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(url).then(() => toast.success('Link copied'))}
          >
            <Copy /> Copy link
          </Button>
          <a className={buttonVariants({ variant: 'outline', size: 'sm' })} href={qr} download={`${restaurant.slug}-menu-qr.png`}>
            <Download /> Download QR
          </a>
          <a className={buttonVariants({ variant: 'outline', size: 'sm' })} href={url} target="_blank" rel="noreferrer">
            <ExternalLink /> Open
          </a>
        </div>
      </div>
    </div>
  );
}

function TableCard({
  table,
  restaurant,
  onRename,
  onRegenerate,
  onDelete,
}: {
  table: DiningTable;
  restaurant: Restaurant;
  onRename: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}) {
  const url = tableUrl(table.token);
  const qr = useQr(url);

  return (
    <div className="flex flex-col items-center rounded-3xl bg-card p-4 text-center shadow-sm ring-1 ring-foreground/5 print:break-inside-avoid print:rounded-none print:p-10 print:shadow-none print:ring-1 print:ring-foreground/30">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{restaurant.name}</p>
      {qr && <img src={qr} alt={`QR code for ${table.label}`} className="my-2 aspect-square w-full max-w-44 print:max-w-60" />}
      <p className="text-xl font-extrabold">{table.label}</p>
      <p className="text-xs text-muted-foreground">Scan to see the menu & order</p>
      <div className="no-print mt-3 flex flex-wrap justify-center gap-0.5">
        <a className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))} href={url} target="_blank" rel="noreferrer" title="Open">
          <ExternalLink />
        </a>
        <a className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))} href={qr} download={`${restaurant.slug}-${table.label.replace(/\s+/g, '-').toLowerCase()}.png`} title="Download PNG">
          <Download />
        </a>
        <Button variant="ghost" size="icon-sm" onClick={onRename} title="Rename">
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onRegenerate} title="Make a new code">
          <RefreshCw />
        </Button>
        <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={onDelete} title="Delete">
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
