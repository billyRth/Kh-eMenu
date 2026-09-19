import type { TabOrder } from './types';

export type PersonShare = {
  name: string;
  total: number;
  items: { name: string; qty: number; amount: number }[];
};

const UNNAMED = 'Guest';

/** Each person pays for what they ordered (orders are tagged with the name typed on that phone). */
export function splitByPerson(orders: TabOrder[]): PersonShare[] {
  const people = new Map<string, PersonShare>();
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const name = order.guest_name?.trim() || UNNAMED;
    const share = people.get(name) ?? { name, total: 0, items: [] };
    for (const item of order.items) {
      const amount = Number(item.unit_price_usd) * item.qty;
      share.total += amount;
      const existing = share.items.find((i) => i.name === item.name);
      if (existing) {
        existing.qty += item.qty;
        existing.amount += amount;
      } else {
        share.items.push({ name: item.name, qty: item.qty, amount });
      }
    }
    people.set(name, share);
  }
  return [...people.values()].sort((a, b) => b.total - a.total);
}

/**
 * Split a total evenly in whole cents. When it doesn't divide exactly, the first
 * `extraCount` people pay one cent more so the shares always add up to the bill.
 */
export function splitEqually(total: number, people: number): { base: number; extraCount: number } {
  const cents = Math.round(total * 100);
  const n = Math.max(1, Math.floor(people));
  const base = Math.floor(cents / n);
  return { base: base / 100, extraCount: cents - base * n };
}

export function readGuestName(): string {
  try {
    return localStorage.getItem('emenu:guest-name') ?? '';
  } catch {
    return '';
  }
}

export function saveGuestName(name: string) {
  try {
    localStorage.setItem('emenu:guest-name', name.trim());
  } catch {
    // Not remembering the name is fine.
  }
}
