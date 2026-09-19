import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { CartLine, Category, MenuItem, Restaurant } from './types';

/** Price of one portion with the picked option choices. */
export function unitPrice(item: MenuItem, optionIds: string[] = []) {
  const extra = item.options.flatMap((g) => g.choices).filter((c) => optionIds.includes(c.id)).reduce((sum, c) => sum + Number(c.price), 0);
  return Number(item.price_usd) + extra;
}

const sameOptions = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

export type MenuData = {
  restaurant: Restaurant;
  categories: Category[];
  items: MenuItem[];
  popularIds: Set<string>;
};

export async function fetchMenu(slug: string): Promise<MenuData | null> {
  const { data: restaurant, error } = await supabase.from('restaurants').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!restaurant) return null;

  const [cats, items, popular] = await Promise.all([
    supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order').order('created_at'),
    supabase.from('menu_items').select('*').eq('restaurant_id', restaurant.id).order('sort_order').order('created_at'),
    supabase.rpc('popular_items', { p_restaurant_id: restaurant.id }),
  ]);
  if (cats.error) throw cats.error;
  if (items.error) throw items.error;

  // Only badge items that have genuinely been ordered a few times.
  const popularIds = new Set<string>(
    ((popular.data ?? []) as { menu_item_id: string; qty: number }[])
      .filter((p) => p.qty >= 3)
      .map((p) => p.menu_item_id),
  );

  return { restaurant, categories: cats.data, items: items.data, popularIds };
}

/** Cart persisted per table so a refresh or a closed tab doesn't lose it. */
export function useCart(token: string | undefined) {
  const storageKey = token ? `emenu:cart:${token}` : null;
  const [lines, setLines] = useState<CartLine[]>(() => {
    if (!storageKey) return [];
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as CartLine[];
      return saved.map((l) => ({ ...l, options: l.options ?? [] }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(lines));
    } catch {
      // Storage can be unavailable in private mode; the cart still works in memory.
    }
  }, [lines, storageKey]);

  const add = useCallback((item_id: string, qty: number, note: string, options: string[] = []) => {
    setLines((prev) => {
      const trimmed = note.trim();
      const existing = prev.find((l) => l.item_id === item_id && l.note === trimmed && sameOptions(l.options, options));
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, qty: Math.min(50, l.qty + qty) } : l));
      }
      return [...prev, { item_id, qty, note: trimmed, options }];
    });
  }, []);

  const setQty = useCallback((index: number, qty: number) => {
    setLines((prev) => (qty <= 0 ? prev.filter((_, i) => i !== index) : prev.map((l, i) => (i === index ? { ...l, qty: Math.min(50, qty) } : l))));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  return { lines, add, setQty, clear };
}
