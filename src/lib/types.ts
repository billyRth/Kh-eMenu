export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  hours: string | null;
  khr_rate: number;
  show_khr: boolean;
  ordering_enabled: boolean;
  accent_color: string;
  logo_url: string | null;
  cover_url: string | null;
};

export type Category = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_usd: number;
  image_url: string | null;
  emoji: string | null;
  is_available: boolean;
  is_featured: boolean;
  spicy_level: number;
  tags: string[];
  sort_order: number;
};

export type DiningTable = {
  id: string;
  restaurant_id: string;
  label: string;
  token: string;
  is_active: boolean;
  sort_order: number;
};

export type OrderStatus = 'new' | 'preparing' | 'served' | 'cancelled';

export type OrderItem = {
  id: string;
  name: string;
  unit_price_usd: number;
  qty: number;
  note: string | null;
};

export type Order = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  order_number: number;
  status: OrderStatus;
  note: string | null;
  total_usd: number;
  paid_at: string | null;
  created_at: string;
  order_items: OrderItem[];
  dining_tables: { label: string } | null;
};

export type ServiceRequest = {
  id: string;
  table_id: string | null;
  kind: 'waiter' | 'bill';
  resolved_at: string | null;
  created_at: string;
  dining_tables: { label: string } | null;
};

/** Shape returned by the get_table_tab RPC. */
export type TabOrder = {
  id: string;
  order_number: number;
  status: OrderStatus;
  total_usd: number;
  created_at: string;
  items: { name: string; qty: number; unit_price_usd: number; note: string | null }[];
};

export type CartLine = { item_id: string; qty: number; note: string };
