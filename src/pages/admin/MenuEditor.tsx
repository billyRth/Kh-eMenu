import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FoodImage } from '@/components/common';
import { cn } from '@/lib/utils';
import { uploadImage } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import { usd } from '@/lib/format';
import type { Category, MenuItem, Restaurant } from '@/lib/types';

type Draft = Omit<MenuItem, 'id' | 'restaurant_id' | 'sort_order'> & { id?: string };

const blankDraft = (categoryId: string): Draft => ({
  category_id: categoryId,
  name: '',
  description: '',
  price_usd: 0,
  cost_usd: null,
  image_url: null,
  emoji: '',
  is_available: true,
  is_featured: false,
  spicy_level: 0,
  tags: [],
});

export const nativeSelect =
  'h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export function MenuEditor({ restaurant }: { restaurant: Restaurant }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newCategory, setNewCategory] = useState('');

  const load = useCallback(async () => {
    const [c, i] = await Promise.all([
      supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order').order('created_at'),
      supabase.from('menu_items').select('*').eq('restaurant_id', restaurant.id).order('sort_order').order('created_at'),
    ]);
    if (c.data) setCategories(c.data);
    if (i.data) setItems(i.data);
  }, [restaurant.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action;
    if (error) toast.error(error.message);
    await load();
    return !error;
  }

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    const sort = Math.max(0, ...categories.map((c) => c.sort_order)) + 1;
    if (await run(supabase.from('categories').insert({ restaurant_id: restaurant.id, name, sort_order: sort }))) setNewCategory('');
  }

  async function renameCategory(cat: Category) {
    const name = window.prompt('Category name', cat.name)?.trim();
    if (name && name !== cat.name) await run(supabase.from('categories').update({ name }).eq('id', cat.id));
  }

  async function deleteCategory(cat: Category) {
    if (items.some((i) => i.category_id === cat.id)) {
      toast.error(`Move or delete the dishes in “${cat.name}” first.`);
      return;
    }
    if (window.confirm(`Delete category “${cat.name}”?`)) await run(supabase.from('categories').delete().eq('id', cat.id));
  }

  async function moveCategory(index: number, dir: -1 | 1) {
    const a = categories[index];
    const b = categories[index + dir];
    if (!a || !b) return;
    // Renumber everything so equal sort values from older data can't get stuck.
    const reordered = [...categories];
    reordered[index] = b;
    reordered[index + dir] = a;
    setCategories(reordered);
    await Promise.all(reordered.map((c, i) => supabase.from('categories').update({ sort_order: i + 1 }).eq('id', c.id)));
    await load();
  }

  async function toggleAvailable(item: MenuItem, available: boolean) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: available } : i)));
    if (await run(supabase.from('menu_items').update({ is_available: available }).eq('id', item.id))) {
      toast.success(available ? `${item.name} is back on` : `${item.name} marked sold out`, { duration: 1500 });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">Flip the switch to mark a dish sold out. Diners’ phones update within a minute.</p>

      {categories.map((cat, index) => {
        const catItems = items.filter((i) => i.category_id === cat.id);
        return (
          <section key={cat.id} className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-foreground/5">
            <header className="flex flex-wrap items-center gap-1 border-b px-4 py-3">
              <h3 className="mr-auto text-base font-bold">
                {cat.name} <span className="ml-1 text-sm font-normal text-muted-foreground">{catItems.length}</span>
              </h3>
              <select
                className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
                value={cat.report_group}
                title="Counts toward this group in the daily report"
                onChange={(e) => run(supabase.from('categories').update({ report_group: e.target.value }).eq('id', cat.id))}
              >
                <option value="starter">Appetizers</option>
                <option value="main">Mains</option>
                <option value="drink">Drinks</option>
                <option value="dessert">Desserts</option>
                <option value="other">Other</option>
              </select>
              <Button variant="ghost" size="icon-sm" title="Move up" onClick={() => moveCategory(index, -1)} disabled={index === 0}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon-sm" title="Move down" onClick={() => moveCategory(index, 1)} disabled={index === categories.length - 1}>
                <ArrowDown />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => renameCategory(cat)}>
                <Pencil /> Rename
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-destructive" title="Delete category" onClick={() => deleteCategory(cat)}>
                <Trash2 />
              </Button>
            </header>
            <ul className="divide-y">
              {catItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <FoodImage src={item.image_url} emoji={item.emoji} alt="" className={cn('size-12 shrink-0 rounded-xl', !item.is_available && 'opacity-40 grayscale')} emojiClass="text-2xl" />
                  <button className={cn('min-w-0 flex-1 text-left', !item.is_available && 'opacity-50')} onClick={() => setDraft({ ...item })}>
                    <p className="flex items-center gap-1.5 truncate font-semibold">
                      {item.name}
                      {item.is_featured && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                    </p>
                    <p className="text-sm text-muted-foreground tabular-nums">{usd(Number(item.price_usd))}</p>
                  </button>
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold">
                    <span className={item.is_available ? 'text-emerald-700' : 'text-destructive'}>{item.is_available ? 'Available' : 'Sold out'}</span>
                    <Switch checked={item.is_available} onCheckedChange={(v) => toggleAvailable(item, v)} />
                  </label>
                </li>
              ))}
            </ul>
            <div className="px-4 py-3">
              <Button variant="outline" size="sm" onClick={() => setDraft(blankDraft(cat.id))}>
                <Plus /> Add dish
              </Button>
            </div>
          </section>
        );
      })}

      <form onSubmit={addCategory} className="flex gap-2 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-foreground/5">
        <Input placeholder="New category, e.g. Breakfast" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="h-10" />
        <Button type="submit" className="h-10" disabled={!newCategory.trim()}>
          <Plus /> Add category
        </Button>
      </form>

      <ItemDialog
        draft={draft}
        categories={categories}
        restaurant={restaurant}
        nextSort={Math.max(0, ...items.map((i) => i.sort_order)) + 1}
        onClose={() => setDraft(null)}
        onSaved={() => {
          setDraft(null);
          load();
        }}
      />
    </div>
  );
}

function ItemDialog({
  draft,
  categories,
  restaurant,
  nextSort,
  onClose,
  onSaved,
}: {
  draft: Draft | null;
  categories: Category[];
  restaurant: Restaurant;
  nextSort: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<Draft | null>(draft);
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) return;
    setD(draft);
    setPrice(draft.id ? String(draft.price_usd) : '');
    setCost(draft.cost_usd != null ? String(draft.cost_usd) : '');
    setTags(draft.tags.join(', '));
    setError(null);
  }, [draft]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => (prev ? { ...prev, [key]: value } : prev));

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      set('image_url', await uploadImage(restaurant.id, file));
    } catch (e) {
      setError(`Photo upload failed: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!d) return;
    const priceNum = Number(price);
    if (!d.name.trim()) return setError('Give the dish a name.');
    if (!price.trim() || !Number.isFinite(priceNum) || priceNum < 0) return setError('Enter a valid price in USD, e.g. 4.50');
    const costNum = cost.trim() ? Number(cost) : null;
    if (costNum !== null && (!Number.isFinite(costNum) || costNum < 0)) return setError('Cost must be a number in USD, or left empty.');

    setBusy(true);
    const row = {
      category_id: d.category_id,
      name: d.name.trim(),
      description: d.description?.trim() || null,
      price_usd: Math.round(priceNum * 100) / 100,
      cost_usd: costNum === null ? null : Math.round(costNum * 100) / 100,
      image_url: d.image_url,
      emoji: d.emoji?.trim() || null,
      is_available: d.is_available,
      is_featured: d.is_featured,
      spicy_level: d.spicy_level,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    const { error: dbError } = d.id
      ? await supabase.from('menu_items').update(row).eq('id', d.id)
      : await supabase.from('menu_items').insert({ ...row, restaurant_id: restaurant.id, sort_order: nextSort });
    setBusy(false);
    if (dbError) return setError(dbError.message);
    toast.success(d.id ? 'Dish saved' : 'Dish added to the menu');
    onSaved();
  }

  async function remove() {
    if (!d?.id || !window.confirm(`Delete “${d.name}” from the menu?`)) return;
    const { error: dbError } = await supabase.from('menu_items').delete().eq('id', d.id);
    if (dbError) return setError(dbError.message);
    toast.success('Dish deleted');
    onSaved();
  }

  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        {d && (
          <form onSubmit={save} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{d.id ? 'Edit dish' : 'New dish'}</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-4">
              <FoodImage src={d.image_url} emoji={d.emoji} alt="" className="size-24 shrink-0 rounded-2xl" emojiClass="text-4xl" />
              <div className="space-y-2">
                <label className={cn(buttonLike, 'cursor-pointer')}>
                  <ImagePlus className="size-4" /> {d.image_url ? 'Change photo' : 'Upload photo'}
                  <input type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
                </label>
                {d.image_url && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => set('image_url', null)}>
                    Remove photo
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">No photo yet? The emoji is shown instead.</p>
              </div>
            </div>

            <Field label="Name">
              <Input required value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Fish Amok" />
            </Field>
            <Field label="Description">
              <Textarea rows={2} value={d.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Steamed fish curry in banana leaf" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (USD)">
                <Input inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="4.50" />
              </Field>
              <Field label="Cost to make (USD, private)">
                <Input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="optional, for profit report" />
              </Field>
              <Field label="Emoji">
                <Input value={d.emoji ?? ''} maxLength={4} onChange={(e) => set('emoji', e.target.value)} placeholder="🍜" />
              </Field>
              <Field label="Category">
                <select className={nativeSelect} value={d.category_id} onChange={(e) => set('category_id', e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Spicy">
                <select className={nativeSelect} value={d.spicy_level} onChange={(e) => set('spicy_level', Number(e.target.value))}>
                  <option value={0}>Not spicy</option>
                  <option value={1}>🌶️ Mild</option>
                  <option value={2}>🌶️🌶️ Medium</option>
                  <option value={3}>🌶️🌶️🌶️ Hot</option>
                </select>
              </Field>
            </div>
            <Field label="Tags (comma separated)">
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Vegetarian, New, Signature" />
            </Field>
            <div className="space-y-3 rounded-xl bg-secondary/60 p-3">
              <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
                Chef’s pick (shown at the top of the menu)
                <Switch checked={d.is_featured} onCheckedChange={(v) => set('is_featured', v)} />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
                Available today
                <Switch checked={d.is_available} onCheckedChange={(v) => set('is_available', v)} />
              </label>
            </div>
            {error && <p className="rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>}

            <DialogFooter className="gap-2 sm:justify-between">
              {d.id ? (
                <Button type="button" variant="destructive" onClick={remove}>
                  <Trash2 /> Delete
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" size="lg" disabled={busy} className="font-bold">
                {busy ? 'Saving…' : 'Save dish'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

const buttonLike = 'inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm font-medium hover:bg-muted';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
