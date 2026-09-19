import { useState, type FormEvent } from 'react';
import { uploadImage } from '../../lib/images';
import { supabase } from '../../lib/supabase';
import type { Restaurant } from '../../lib/types';

export function SettingsForm({ restaurant, onSaved }: { restaurant: Restaurant; onSaved: (r: Restaurant) => void }) {
  const [r, setR] = useState<Restaurant>(restaurant);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof Restaurant>(key: K, value: Restaurant[K]) => setR((prev) => ({ ...prev, [key]: value }));

  async function upload(key: 'logo_url' | 'cover_url', file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      set(key, await uploadImage(restaurant.id, file, key === 'logo_url' ? 400 : 1600));
    } catch (e) {
      setMessage({ ok: false, text: `Upload failed: ${(e as Error).message}` });
    }
    setBusy(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase
      .from('restaurants')
      .update({
        name: r.name.trim(),
        tagline: r.tagline?.trim() || null,
        address: r.address?.trim() || null,
        phone: r.phone?.trim() || null,
        hours: r.hours?.trim() || null,
        khr_rate: Math.round(Number(r.khr_rate)) || 4100,
        show_khr: r.show_khr,
        ordering_enabled: r.ordering_enabled,
        accent_color: r.accent_color,
        logo_url: r.logo_url,
        cover_url: r.cover_url,
      })
      .eq('id', restaurant.id)
      .select()
      .single();
    setBusy(false);
    if (error) {
      setMessage({ ok: false, text: error.message });
    } else {
      setMessage({ ok: true, text: 'Saved ✓' });
      onSaved(data);
    }
  }

  return (
    <form className="card form-grid settings" onSubmit={save}>
      <h3>Restaurant details</h3>
      <label className="field">
        <span>Restaurant name</span>
        <input required value={r.name} onChange={(e) => set('name', e.target.value)} />
      </label>
      <label className="field">
        <span>Tagline</span>
        <input value={r.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} placeholder="Home-style Khmer cooking" />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Opening hours</span>
          <input value={r.hours ?? ''} onChange={(e) => set('hours', e.target.value)} placeholder="Daily 7:00 – 22:00" />
        </label>
        <label className="field">
          <span>Phone</span>
          <input value={r.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="012 345 678" />
        </label>
      </div>
      <label className="field">
        <span>Address</span>
        <input value={r.address ?? ''} onChange={(e) => set('address', e.target.value)} />
      </label>

      <h3>Look</h3>
      <div className="field-row">
        <label className="field">
          <span>Brand colour</span>
          <input type="color" value={r.accent_color} onChange={(e) => set('accent_color', e.target.value)} />
        </label>
        <div className="field">
          <span>Logo</span>
          <div className="row-actions">
            {r.logo_url && <img src={r.logo_url} alt="" className="settings-logo" />}
            <label className="btn small">
              Upload
              <input type="file" accept="image/*" hidden onChange={(e) => upload('logo_url', e.target.files?.[0])} />
            </label>
            {r.logo_url && (
              <button type="button" className="btn small ghost" onClick={() => set('logo_url', null)}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="field">
        <span>Cover photo (top of the menu)</span>
        <div className="row-actions">
          {r.cover_url && <img src={r.cover_url} alt="" className="settings-cover" />}
          <label className="btn small">
            Upload
            <input type="file" accept="image/*" hidden onChange={(e) => upload('cover_url', e.target.files?.[0])} />
          </label>
          {r.cover_url && (
            <button type="button" className="btn small ghost" onClick={() => set('cover_url', null)}>
              Remove
            </button>
          )}
        </div>
      </div>

      <h3>Prices & ordering</h3>
      <div className="field-row">
        <label className="field">
          <span>Riel per $1</span>
          <input type="number" min={1000} max={10000} step={10} value={r.khr_rate} onChange={(e) => set('khr_rate', Number(e.target.value))} />
        </label>
        <label className="check">
          <input type="checkbox" checked={r.show_khr} onChange={(e) => set('show_khr', e.target.checked)} /> Show riel prices too
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={r.ordering_enabled} onChange={(e) => set('ordering_enabled', e.target.checked)} /> Allow ordering from table QR codes (turn off
        when the kitchen is too busy)
      </label>

      {message && <p className={message.ok ? 'notice' : 'error'}>{message.text}</p>}
      <button className="btn primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
