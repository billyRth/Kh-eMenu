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
import { useT } from '@/lib/i18n';
import type { Category, I18nText, MenuItem, Restaurant } from '@/lib/types';
import { OptionsEditor, cleanOptions } from './OptionsEditor';

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
  options: [],
  i18n: {},
});

export const nativeSelect =
  'h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export function MenuEditor({ restaurant }: { restaurant: Restaurant }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const { t } = useT();

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

  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const extraLangs = (restaurant.languages ?? []).filter((l): l is 'km' | 'zh' => l !== 'en');

  function renameCategory(cat: Category) {
    setEditingCat(cat);
  }

  async function deleteCategory(cat: Category) {
    if (items.some((i) => i.category_id === cat.id)) {
      toast.error(t('s_moveDishesFirst', { name: cat.name }));
      return;
    }
    if (window.confirm(t('s_confirmDeleteCat', { name: cat.name }))) await run(supabase.from('categories').delete().eq('id', cat.id));
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
      toast.success(t(available ? 's_backOn' : 's_markedSoldOut', { name: item.name }), { duration: 1500 });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">{t('s_menuIntro')}</p>

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
                title={t('s_reportGroupHint')}
                onChange={(e) => run(supabase.from('categories').update({ report_group: e.target.value }).eq('id', cat.id))}
              >
                <option value="starter">{t('s_grpStarter')}</option>
                <option value="main">{t('s_grpMain')}</option>
                <option value="drink">{t('s_grpDrink')}</option>
                <option value="dessert">{t('s_grpDessert')}</option>
                <option value="other">{t('s_grpOther')}</option>
              </select>
              <Button variant="ghost" size="icon-sm" title={t('s_moveUp')} onClick={() => moveCategory(index, -1)} disabled={index === 0}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon-sm" title={t('s_moveDown')} onClick={() => moveCategory(index, 1)} disabled={index === categories.length - 1}>
                <ArrowDown />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => renameCategory(cat)}>
                <Pencil /> {t('s_rename')}
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-destructive" title={t('s_deleteCategory')} onClick={() => deleteCategory(cat)}>
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
                    <span className={item.is_available ? 'text-emerald-700' : 'text-destructive'}>{item.is_available ? t('s_available') : t('s_soldOutShort')}</span>
                    <Switch checked={item.is_available} onCheckedChange={(v) => toggleAvailable(item, v)} />
                  </label>
                </li>
              ))}
            </ul>
            <div className="px-4 py-3">
              <Button variant="outline" size="sm" onClick={() => setDraft(blankDraft(cat.id))}>
                <Plus /> {t('s_addDish')}
              </Button>
            </div>
          </section>
        );
      })}

      <form onSubmit={addCategory} className="flex gap-2 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-foreground/5">
        <Input placeholder={t('s_newCatPlaceholder')} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="h-10" />
        <Button type="submit" className="h-10" disabled={!newCategory.trim()}>
          <Plus /> {t('s_addCategory')}
        </Button>
      </form>

      <CategoryDialog
        category={editingCat}
        languages={extraLangs}
        onClose={() => setEditingCat(null)}
        onSave={async (name, i18n) => {
          if (editingCat && (await run(supabase.from('categories').update({ name, i18n }).eq('id', editingCat.id)))) setEditingCat(null);
        }}
      />

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
  const { t } = useT();

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
      setError(t('s_photoFailed', { msg: (e as Error).message }));
    }
    setBusy(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!d) return;
    const priceNum = Number(price);
    if (!d.name.trim()) return setError(t('s_needName'));
    if (!price.trim() || !Number.isFinite(priceNum) || priceNum < 0) return setError(t('s_badPrice'));
    const costNum = cost.trim() ? Number(cost) : null;
    if (costNum !== null && (!Number.isFinite(costNum) || costNum < 0)) return setError(t('s_badCost'));

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
      options: cleanOptions(d.options),
      i18n: d.i18n,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    const { error: dbError } = d.id
      ? await supabase.from('menu_items').update(row).eq('id', d.id)
      : await supabase.from('menu_items').insert({ ...row, restaurant_id: restaurant.id, sort_order: nextSort });
    setBusy(false);
    if (dbError) return setError(dbError.message);
    toast.success(t(d.id ? 's_dishSaved' : 's_dishAdded'));
    onSaved();
  }

  async function remove() {
    if (!d?.id || !window.confirm(t('s_confirmDeleteDish', { name: d.name }))) return;
    const { error: dbError } = await supabase.from('menu_items').delete().eq('id', d.id);
    if (dbError) return setError(dbError.message);
    toast.success(t('s_dishDeleted'));
    onSaved();
  }

  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        {d && (
          <form onSubmit={save} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{d.id ? t('s_editDish') : t('s_newDish')}</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-4">
              <FoodImage src={d.image_url} emoji={d.emoji} alt="" className="size-24 shrink-0 rounded-2xl" emojiClass="text-4xl" />
              <div className="space-y-2">
                <label className={cn(buttonLike, 'cursor-pointer')}>
                  <ImagePlus className="size-4" /> {d.image_url ? t('s_changePhoto') : t('s_uploadPhoto')}
                  <input type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
                </label>
                {d.image_url && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => set('image_url', null)}>
                    {t('s_removePhoto')}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">{t('s_noPhotoHint')}</p>
              </div>
            </div>

            <Field label={t('s_name')}>
              <Input required value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Fish Amok" />
            </Field>
            <Field label={t('s_description')}>
              <Textarea rows={2} value={d.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Steamed fish curry in banana leaf" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('s_priceUsd')}>
                <Input inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="4.50" />
              </Field>
              <Field label={t('s_costUsd')}>
                <Input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder={t('s_costPlaceholder')} />
              </Field>
              <Field label={t('s_emoji')}>
                <Input value={d.emoji ?? ''} maxLength={4} onChange={(e) => set('emoji', e.target.value)} placeholder="🍜" />
              </Field>
              <Field label={t('s_category')}>
                <select className={nativeSelect} value={d.category_id} onChange={(e) => set('category_id', e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('s_spicy')}>
                <select className={nativeSelect} value={d.spicy_level} onChange={(e) => set('spicy_level', Number(e.target.value))}>
                  <option value={0}>{t('s_notSpicy')}</option>
                  <option value={1}>🌶️ {t('s_mild')}</option>
                  <option value={2}>🌶️🌶️ {t('s_medium')}</option>
                  <option value={3}>🌶️🌶️🌶️ {t('s_hot')}</option>
                </select>
              </Field>
            </div>
            {(restaurant.languages ?? []).filter((l) => l !== 'en').map((l) => {
              const code = l as 'km' | 'zh';
              const tr = d.i18n?.[code] ?? {};
              const setTr = (patch: { name?: string; description?: string }) => set('i18n', { ...d.i18n, [code]: { ...tr, ...patch } } as I18nText);
              return (
                <div key={code} className="space-y-2 rounded-xl bg-secondary/60 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{code === 'km' ? 'ខ្មែរ · Khmer' : '中文 · Chinese'}</p>
                  <Input value={tr.name ?? ''} onChange={(e) => setTr({ name: e.target.value })} placeholder={code === 'km' ? 'ឈ្មោះម្ហូប' : '菜名'} />
                  <Input value={tr.description ?? ''} onChange={(e) => setTr({ description: e.target.value })} placeholder={code === 'km' ? 'ការពិពណ៌នា (មិនចាំបាច់)' : '描述（可选）'} />
                </div>
              );
            })}
            <OptionsEditor value={d.options} onChange={(v) => set('options', v)} languages={(restaurant.languages ?? []).filter((l): l is 'km' | 'zh' => l !== 'en')} />
            <Field label={t('s_tags')}>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Vegetarian, New, Signature" />
            </Field>
            <div className="space-y-3 rounded-xl bg-secondary/60 p-3">
              <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
                {t('s_chefsPickToggle')}
                <Switch checked={d.is_featured} onCheckedChange={(v) => set('is_featured', v)} />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
                {t('s_availableToday')}
                <Switch checked={d.is_available} onCheckedChange={(v) => set('is_available', v)} />
              </label>
            </div>
            {error && <p className="rounded-lg bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>}

            <DialogFooter className="gap-2 sm:justify-between">
              {d.id ? (
                <Button type="button" variant="destructive" onClick={remove}>
                  <Trash2 /> {t('s_delete')}
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" size="lg" disabled={busy} className="font-bold">
                {busy ? t('s_saving') : t('s_saveDish')}
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

function CategoryDialog({
  category,
  languages,
  onClose,
  onSave,
}: {
  category: Category | null;
  languages: ('km' | 'zh')[];
  onClose: () => void;
  onSave: (name: string, i18n: I18nText) => void;
}) {
  const [name, setName] = useState('');
  const [i18n, setI18n] = useState<I18nText>({});
  const { t } = useT();
  useEffect(() => {
    if (!category) return;
    setName(category.name);
    setI18n(category.i18n ?? {});
  }, [category]);

  return (
    <Dialog open={!!category} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onSave(name.trim(), i18n);
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t('s_category')}</DialogTitle>
          </DialogHeader>
          <Field label={t('s_name')}>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          {languages.map((l) => (
            <Field key={l} label={l === 'km' ? 'ខ្មែរ · Khmer' : '中文 · Chinese'}>
              <Input value={i18n[l]?.name ?? ''} onChange={(e) => setI18n({ ...i18n, [l]: { ...i18n[l], name: e.target.value } })} />
            </Field>
          ))}
          <DialogFooter>
            <Button type="submit" className="font-bold">
              {t('s_save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
