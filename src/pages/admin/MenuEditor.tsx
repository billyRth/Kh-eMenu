import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Sheet } from '../../components/Sheet';
import { uploadImage } from '../../lib/images';
import { supabase } from '../../lib/supabase';
import { usd } from '../../lib/format';
import type { Category, MenuItem, Restaurant } from '../../lib/types';

type Draft = Omit<MenuItem, 'id' | 'restaurant_id' | 'sort_order'> & { id?: string };

const blankDraft = (categoryId: string): Draft => ({
  category_id: categoryId,
  name: '',
  description: '',
  price_usd: 0,
  image_url: null,
  emoji: '',
  is_available: true,
  is_featured: false,
  spicy_level: 0,
  tags: [],
});

export function MenuEditor({ restaurant }: { restaurant: Restaurant }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    const { error: e } = await action;
    setError(e ? e.message : null);
    await load();
    return !e;
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
      setError(`Move or delete the dishes in “${cat.name}” first.`);
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
    await Promise.all(reordered.map((c, i) => supabase.from('categories').update({ sort_order: i + 1 }).eq('id', c.id)));
    await load();
  }

  async function toggleAvailable(item: MenuItem) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i)));
    await run(supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id));
  }

  return (
    <div className="menu-editor">
      <p className="muted small">Tap the switch to mark a dish sold out — diners see it instantly. Changes save automatically.</p>
      {error && <p className="error">{error}</p>}

      {categories.map((cat, index) => {
        const catItems = items.filter((i) => i.category_id === cat.id);
        return (
          <section key={cat.id} className="editor-cat card">
            <header>
              <h3>{cat.name}</h3>
              <div className="row-actions">
                <button className="icon-btn" title="Move up" onClick={() => moveCategory(index, -1)} disabled={index === 0}>
                  ↑
                </button>
                <button className="icon-btn" title="Move down" onClick={() => moveCategory(index, 1)} disabled={index === categories.length - 1}>
                  ↓
                </button>
                <button className="btn small ghost" onClick={() => renameCategory(cat)}>
                  Rename
                </button>
                <button className="btn small ghost danger" onClick={() => deleteCategory(cat)}>
                  Delete
                </button>
              </div>
            </header>
            <ul className="editor-items">
              {catItems.map((item) => (
                <li key={item.id} className={item.is_available ? '' : 'off'}>
                  <div className="thumb">{item.image_url ? <img src={item.image_url} alt="" /> : item.emoji || '🍽️'}</div>
                  <button className="editor-item-name" onClick={() => setDraft({ ...item })}>
                    <strong>{item.name}</strong>
                    <span className="muted small">
                      {usd(Number(item.price_usd))}
                      {item.is_featured && ' · ⭐'}
                    </span>
                  </button>
                  <label className="switch" title={item.is_available ? 'Available' : 'Sold out'}>
                    <input type="checkbox" checked={item.is_available} onChange={() => toggleAvailable(item)} />
                    <span>{item.is_available ? 'Available' : 'Sold out'}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button className="btn small" onClick={() => setDraft(blankDraft(cat.id))}>
              + Add dish
            </button>
          </section>
        );
      })}

      <form className="card add-cat" onSubmit={addCategory}>
        <input placeholder="New category, e.g. Breakfast" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
        <button className="btn primary" disabled={!newCategory.trim()}>
          Add category
        </button>
      </form>

      {draft && (
        <ItemForm
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
      )}
    </div>
  );
}

function ItemForm({
  draft: initial,
  categories,
  restaurant,
  nextSort,
  onClose,
  onSaved,
}: {
  draft: Draft;
  categories: Category[];
  restaurant: Restaurant;
  nextSort: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [price, setPrice] = useState(initial.id ? String(initial.price_usd) : '');
  const [tags, setTags] = useState(initial.tags.join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));

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
    const priceNum = Number(price);
    if (!d.name.trim()) return setError('Give the dish a name.');
    if (!Number.isFinite(priceNum) || priceNum < 0) return setError('Enter a valid price in USD, e.g. 4.50');

    setBusy(true);
    const row = {
      category_id: d.category_id,
      name: d.name.trim(),
      description: d.description?.trim() || null,
      price_usd: Math.round(priceNum * 100) / 100,
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
    if (dbError) setError(dbError.message);
    else onSaved();
  }

  async function remove() {
    if (!d.id || !window.confirm(`Delete “${d.name}” from the menu?`)) return;
    const { error: dbError } = await supabase.from('menu_items').delete().eq('id', d.id);
    if (dbError) setError(dbError.message);
    else onSaved();
  }

  return (
    <Sheet
      title={d.id ? 'Edit dish' : 'New dish'}
      onClose={onClose}
      footer={
        <div className="two-btns">
          {d.id ? (
            <button type="button" className="btn ghost danger" onClick={remove}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <button className="btn primary" form="item-form" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <form id="item-form" className="form-grid" onSubmit={save}>
        <div className="photo-field">
          <div className="photo-preview">{d.image_url ? <img src={d.image_url} alt="" /> : <span className="emoji">{d.emoji || '🍽️'}</span>}</div>
          <div>
            <label className="btn small">
              {d.image_url ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
            {d.image_url && (
              <button type="button" className="btn small ghost" onClick={() => set('image_url', null)}>
                Remove photo
              </button>
            )}
            <p className="small muted">No photo yet? An emoji is shown instead.</p>
          </div>
        </div>
        <label className="field">
          <span>Name</span>
          <input required value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Fish Amok" />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea rows={2} value={d.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Steamed fish curry in banana leaf" />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Price (USD)</span>
            <input inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="4.50" />
          </label>
          <label className="field">
            <span>Emoji</span>
            <input value={d.emoji ?? ''} maxLength={4} onChange={(e) => set('emoji', e.target.value)} placeholder="🍜" />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Category</span>
            <select value={d.category_id} onChange={(e) => set('category_id', e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Spicy</span>
            <select value={d.spicy_level} onChange={(e) => set('spicy_level', Number(e.target.value))}>
              <option value={0}>Not spicy</option>
              <option value={1}>🌶️ Mild</option>
              <option value={2}>🌶️🌶️ Medium</option>
              <option value={3}>🌶️🌶️🌶️ Hot</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Tags (comma separated)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Vegetarian, New, Signature" />
        </label>
        <label className="check">
          <input type="checkbox" checked={d.is_featured} onChange={(e) => set('is_featured', e.target.checked)} /> ⭐ Chef’s pick (shown at the top)
        </label>
        <label className="check">
          <input type="checkbox" checked={d.is_available} onChange={(e) => set('is_available', e.target.checked)} /> Available today
        </label>
        {error && <p className="error">{error}</p>}
      </form>
    </Sheet>
  );
}
