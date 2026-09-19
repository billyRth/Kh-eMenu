import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { uploadImage } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import type { Restaurant } from '@/lib/types';
import { Field } from './MenuEditor';

export function SettingsForm({ restaurant, onSaved }: { restaurant: Restaurant; onSaved: (r: Restaurant) => void }) {
  const [r, setR] = useState<Restaurant>(restaurant);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Restaurant>(key: K, value: Restaurant[K]) => setR((prev) => ({ ...prev, [key]: value }));

  async function upload(key: 'logo_url' | 'cover_url', file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      set(key, await uploadImage(restaurant.id, file, key === 'logo_url' ? 400 : 1600));
    } catch (e) {
      toast.error(`Upload failed: ${(e as Error).message}`);
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
    if (error) return toast.error(error.message);
    toast.success('Settings saved');
    onSaved(data);
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-5">
      <Section title="Restaurant details">
        <Field label="Restaurant name">
          <Input required value={r.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Tagline">
          <Input value={r.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} placeholder="Home-style Khmer cooking" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Opening hours">
            <Input value={r.hours ?? ''} onChange={(e) => set('hours', e.target.value)} placeholder="Daily 7:00 – 22:00" />
          </Field>
          <Field label="Phone">
            <Input value={r.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="012 345 678" />
          </Field>
        </div>
        <Field label="Address">
          <Input value={r.address ?? ''} onChange={(e) => set('address', e.target.value)} />
        </Field>
      </Section>

      <Section title="Look">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
          <Field label="Brand colour">
            <input type="color" value={r.accent_color} onChange={(e) => set('accent_color', e.target.value)} className="h-10 w-20 cursor-pointer rounded-lg border bg-transparent p-1" />
          </Field>
          <Field label="Logo">
            <ImagePicker url={r.logo_url} onPick={(f) => upload('logo_url', f)} onRemove={() => set('logo_url', null)} previewClass="size-10 rounded-lg" />
          </Field>
        </div>
        <Field label="Cover photo (top of the menu)">
          <ImagePicker url={r.cover_url} onPick={(f) => upload('cover_url', f)} onRemove={() => set('cover_url', null)} previewClass="h-12 w-28 rounded-lg" />
        </Field>
      </Section>

      <Section title="Prices & ordering">
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <Field label="Riel per $1">
            <Input type="number" min={1000} max={10000} step={10} value={r.khr_rate} onChange={(e) => set('khr_rate', Number(e.target.value))} />
          </Field>
          <label className="flex h-10 cursor-pointer items-center justify-between gap-3 text-sm font-medium">
            Show riel prices too
            <Switch checked={r.show_khr} onCheckedChange={(v) => set('show_khr', v)} />
          </label>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-secondary/60 p-3 text-sm">
          <span>
            <b>Allow ordering from table QR codes</b>
            <span className="block text-muted-foreground">Turn off when the kitchen is too busy. The menu stays visible.</span>
          </span>
          <Switch checked={r.ordering_enabled} onCheckedChange={(v) => set('ordering_enabled', v)} />
        </label>
      </Section>

      <Button type="submit" size="lg" className="w-full font-bold sm:w-auto" disabled={busy}>
        {busy ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/5">
      <h2 className="text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function ImagePicker({ url, onPick, onRemove, previewClass }: { url: string | null; onPick: (f: File | undefined) => void; onRemove: () => void; previewClass: string }) {
  return (
    <div className="flex items-center gap-2">
      {url && <img src={url} alt="" className={`${previewClass} object-cover`} />}
      <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm font-medium hover:bg-muted">
        <ImagePlus className="size-4" /> Upload
        <input type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files?.[0])} />
      </label>
      {url && (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      )}
    </div>
  );
}
