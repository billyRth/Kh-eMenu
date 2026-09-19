import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../../lib/supabase';
import { menuUrl, tableUrl } from '../../lib/format';
import type { DiningTable, Restaurant } from '../../lib/types';

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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('dining_tables').select('*').eq('restaurant_id', restaurant.id).order('sort_order').order('created_at');
    if (data) setTables(data);
  }, [restaurant.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    const { error: e } = await action;
    setError(e ? e.message : null);
    load();
  }

  const addTable = () => {
    const n = Math.max(0, ...tables.map((t) => t.sort_order)) + 1;
    run(supabase.from('dining_tables').insert({ restaurant_id: restaurant.id, label: `Table ${n}`, sort_order: n }));
  };

  const rename = (t: DiningTable) => {
    const label = window.prompt('Table name (shown to diners and on orders)', t.label)?.trim();
    if (label && label !== t.label) run(supabase.from('dining_tables').update({ label }).eq('id', t.id));
  };

  const regenerate = (t: DiningTable) => {
    if (window.confirm(`Make a new QR code for ${t.label}? The old printed code will stop working.`)) {
      run(supabase.from('dining_tables').update({ token: newToken() }).eq('id', t.id));
    }
  };

  const remove = (t: DiningTable) => {
    if (window.confirm(`Delete ${t.label}? Its QR code will stop working. Past orders are kept.`)) {
      run(supabase.from('dining_tables').delete().eq('id', t.id));
    }
  };

  return (
    <div className="tables-manager">
      <PublicMenuCard restaurant={restaurant} />

      <div className="section-head no-print">
        <h3>Table QR codes</h3>
        <div className="row-actions">
          <button className="btn small" onClick={addTable}>
            + Add table
          </button>
          <button className="btn small primary" onClick={() => window.print()} disabled={tables.length === 0}>
            🖨️ Print all
          </button>
        </div>
      </div>
      <p className="muted small no-print">
        Print these and stick one on each table. Scanning opens the menu with ordering switched on for that table. Diners can’t order without scanning a table code.
      </p>
      {error && <p className="error">{error}</p>}

      <div className="qr-grid print-area">
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
  const [copied, setCopied] = useState(false);

  return (
    <div className="card public-link no-print">
      <img src={qr} alt="QR code for the public menu" className="qr small-qr" />
      <div>
        <h3>Public menu link</h3>
        <p className="muted small">View-only. Put this on Google Maps, Facebook, Instagram, Telegram and your front door.</p>
        <code className="link-box">{url}</code>
        <div className="row-actions">
          <button
            className="btn small"
            onClick={() => {
              navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              });
            }}
          >
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
          <a className="btn small" href={qr} download={`${restaurant.slug}-menu-qr.png`}>
            Download QR
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
    <div className="qr-card">
      <p className="qr-restaurant">{restaurant.name}</p>
      <img src={qr} alt={`QR code for ${table.label}`} className="qr" />
      <p className="qr-label">{table.label}</p>
      <p className="qr-hint">Scan to see the menu & order</p>
      <div className="qr-actions no-print">
        <a className="btn small" href={url} target="_blank" rel="noreferrer">
          Open
        </a>
        <a className="btn small" href={qr} download={`${restaurant.slug}-${table.label.replace(/\s+/g, '-').toLowerCase()}.png`}>
          PNG
        </a>
        <button className="btn small ghost" onClick={onRename}>
          Rename
        </button>
        <button className="btn small ghost" onClick={onRegenerate}>
          New code
        </button>
        <button className="btn small ghost danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
