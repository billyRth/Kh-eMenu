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
  theme: string;
  reports_enabled: boolean;
  languages: ('en' | 'km' | 'zh')[];
  logo_url: string | null;
  cover_url: string | null;
};

export type Category = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  report_group: 'starter' | 'main' | 'drink' | 'dessert' | 'other';
  i18n: I18nText;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_usd: number;
  cost_usd: number | null;
  image_url: string | null;
  emoji: string | null;
  is_available: boolean;
  is_featured: boolean;
  spicy_level: number;
  tags: string[];
  sort_order: number;
  options: OptionGroup[];
  i18n: I18nText;
};

export type I18nText = Partial<Record<'km' | 'zh', { name?: string; description?: string }>>;

export type OptionChoice = { id: string; name: string; price: number; i18n?: Partial<Record<'km' | 'zh', string>> };
export type OptionGroup = { id: string; name: string; required: boolean; multi: boolean; choices: OptionChoice[]; i18n?: Partial<Record<'km' | 'zh', string>> };
/** What an order line remembers about the options picked. */
export type PickedOption = { group: string; choice: string; price: number };

export type DiningTable = {
  id: string;
  restaurant_id: string;
  label: string;
  token: string;
  is_active: boolean;
  sort_order: number;
  cleared_at: string | null;
  seated_at: string | null;
  party_size: number | null;
  joined_to: string | null;
};

export type OrderStatus = 'new' | 'preparing' | 'served' | 'cancelled';

export type OrderItem = {
  id: string;
  name: string;
  unit_price_usd: number;
  qty: number;
  note: string | null;
  options: PickedOption[];
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
  guest_name: string | null;
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
  guest_name: string | null;
  created_at: string;
  items: { name: string; qty: number; unit_price_usd: number; note: string | null; options: PickedOption[] }[];
};

export type CartLine = { item_id: string; qty: number; note: string; options: string[] };
