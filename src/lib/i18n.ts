import { useCallback, useEffect, useState } from 'react';

/**
 * Diner-facing languages. Menu text (dish/category/option names) comes from each row's
 * `i18n` column; the fixed interface strings below are ours.
 * Khmer and Chinese strings should get a native-speaker review before a big launch.
 */
export type Lang = 'en' | 'km' | 'zh';

export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'km', label: 'ខ្មែរ', short: 'ខ្មែរ' },
  { id: 'zh', label: '中文', short: '中文' },
];

const STRINGS = {
  searchDishes: { en: 'Search dishes', km: 'ស្វែងរកម្ហូប', zh: '搜索菜品' },
  chefsPicks: { en: 'Chef’s picks', km: 'ម្ហូបណែនាំ', zh: '主厨推荐' },
  popular: { en: 'Popular', km: 'ពេញនិយម', zh: '热门' },
  chefsPick: { en: 'Chef’s pick', km: 'ណែនាំ', zh: '推荐' },
  soldOut: { en: 'Sold out today', km: 'អស់ហើយថ្ងៃនេះ', zh: '今日售罄' },
  noMatch: { en: 'No dishes match', km: 'រកមិនឃើញម្ហូប', zh: '没有找到菜品' },
  orderFromPhone: { en: 'Order from your phone · pay at the counter', km: 'កុម្ម៉ង់ពីទូរស័ព្ទ · បង់ប្រាក់នៅបញ្ជរ', zh: '用手机点餐 · 前台结账' },
  orderWithStaff: { en: 'Please order with our staff', km: 'សូមកុម្ម៉ង់ជាមួយបុគ្គលិក', zh: '请向服务员点餐' },
  bill: { en: 'Bill', km: 'វិក្កយបត្រ', zh: '账单' },
  addDishes: { en: 'Add dishes to order', km: 'ជ្រើសម្ហូបដើម្បីកុម្ម៉ង់', zh: '请选择菜品' },
  viewOrder: { en: 'View order', km: 'មើលការកុម្ម៉ង់', zh: '查看订单' },
  added: { en: 'added', km: 'បានបន្ថែម', zh: '已添加' },
  specialRequests: { en: 'Special requests', km: 'សំណើពិសេស', zh: '特殊要求' },
  specialPlaceholder: { en: 'e.g. no chilli, no peanuts', km: 'ឧ. កុំដាក់ម្ទេស កុំដាក់សណ្តែកដី', zh: '例如：不要辣、不要花生' },
  scanToOrder: { en: 'To order, scan the QR code on your table or ask our staff.', km: 'ដើម្បីកុម្ម៉ង់ សូមស្កេន QR នៅលើតុ ឬសួរបុគ្គលិក។', zh: '如需点餐，请扫描桌上的二维码或询问服务员。' },
  add: { en: 'Add', km: 'បន្ថែម', zh: '加入' },
  required: { en: 'Required', km: 'ត្រូវជ្រើស', zh: '必选' },
  optional: { en: 'Optional', km: 'មិនចាំបាច់', zh: '可选' },
  chooseAny: { en: 'Choose any', km: 'ជ្រើសបានច្រើន', zh: '可多选' },
  pickRequired: { en: 'Please choose', km: 'សូមជ្រើស', zh: '请选择' },
  yourOrder: { en: 'Your order', km: 'ការកុម្ម៉ង់របស់អ្នក', zh: '您的订单' },
  kitchenStarts: { en: 'the kitchen starts as soon as you send it', km: 'ផ្ទះបាយចាប់ផ្តើមភ្លាមៗពេលអ្នកផ្ញើ', zh: '发送后厨房立即开始准备' },
  total: { en: 'Total', km: 'សរុប', zh: '合计' },
  send: { en: 'Send order to kitchen', km: 'ផ្ញើទៅផ្ទះបាយ', zh: '发送到厨房' },
  sending: { en: 'Sending…', km: 'កំពុងផ្ញើ…', zh: '发送中…' },
  payAtCounter: { en: 'You pay at the counter when you’re done.', km: 'បង់ប្រាក់នៅបញ្ជរពេលញ៉ាំរួច។', zh: '用餐后请到前台结账。' },
  emptyOrder: { en: 'Your order is empty.', km: 'មិនទាន់មានម្ហូបទេ។', zh: '订单为空。' },
  yourName: { en: 'Your name', km: 'ឈ្មោះរបស់អ្នក', zh: '您的名字' },
  nameHint: { en: '(optional, for splitting the bill)', km: '(មិនចាំបាច់ សម្រាប់ចែកវិក្កយបត្រ)', zh: '（可选，用于分账）' },
  kitchenNote: { en: 'Note for the kitchen', km: 'កំណត់សម្គាល់សម្រាប់ផ្ទះបាយ', zh: '给厨房的备注' },
  optionalParen: { en: '(optional)', km: '(មិនចាំបាច់)', zh: '（可选）' },
  notePlaceholder: { en: 'e.g. bring drinks first', km: 'ឧ. យកភេសជ្ជៈមកមុន', zh: '例如：先上饮料' },
  orderSent: { en: 'Order #{n} sent to the kitchen!', km: 'ការកុម្ម៉ង់ #{n} បានផ្ញើទៅផ្ទះបាយ!', zh: '订单 #{n} 已发送到厨房！' },
  removeSoldOut: { en: 'Sold out, please remove', km: 'អស់ហើយ សូមដកចេញ', zh: '已售罄，请删除' },
  removeGone: { en: 'No longer on the menu, please remove', km: 'លែងមានក្នុងម៉ឺនុយ សូមដកចេញ', zh: '菜单已下架，请删除' },
  tableBill: { en: '{table} · bill', km: '{table} · វិក្កយបត្រ', zh: '{table} · 账单' },
  everyoneOrders: {
    en: 'Everyone at this table can order from their own phone. It all adds up here.',
    km: 'អ្នកទាំងអស់នៅតុនេះអាចកុម្ម៉ង់ពីទូរស័ព្ទរៀងៗខ្លួន ហើយបូកសរុបនៅទីនេះ។',
    zh: '同桌每个人都可以用自己的手机点餐，费用都汇总在这里。',
  },
  tableTotal: { en: 'Table total', km: 'សរុបតុ', zh: '本桌合计' },
  callWaiter: { en: 'Call waiter', km: 'ហៅអ្នករត់តុ', zh: '呼叫服务员' },
  askBill: { en: 'Ask for bill', km: 'សុំគិតលុយ', zh: '请求结账' },
  billRequested: { en: 'Bill requested. Staff will bring it shortly.', km: 'បានសុំគិតលុយ។ បុគ្គលិកនឹងយកមកឆាប់ៗ។', zh: '已请求结账，服务员马上就来。' },
  waiterComing: { en: 'A staff member is on the way.', km: 'បុគ្គលិកកំពុងមក។', zh: '服务员马上就到。' },
  loading: { en: 'Loading…', km: 'កំពុងផ្ទុក…', zh: '加载中…' },
  noOrders: { en: 'No orders yet.', km: 'មិនទាន់មានការកុម្ម៉ង់ទេ។', zh: '还没有订单。' },
  orders: { en: 'Orders', km: 'ការកុម្ម៉ង់', zh: '订单' },
  byPerson: { en: 'By person', km: 'តាមមនុស្ស', zh: '按人分' },
  equally: { en: 'Split equally', km: 'ចែកស្មើ', zh: '平均分' },
  nameTip: {
    en: 'Tip: type your name when you send an order and the bill splits itself by person.',
    km: 'គន្លឹះ៖ វាយឈ្មោះរបស់អ្នកពេលផ្ញើការកុម្ម៉ង់ ដើម្បីចែកវិក្កយបត្រតាមមនុស្ស។',
    zh: '提示：下单时填写名字，账单会自动按人拆分。',
  },
  howMany: { en: 'How many people?', km: 'ចំនួនប៉ុន្មាននាក់?', zh: '几个人？' },
  eachPays: { en: 'Each person pays', km: 'ម្នាក់ៗបង់', zh: '每人支付' },
  someMore: { en: '{n} pay {amt} so it adds up exactly', km: '{n} នាក់បង់ {amt} ដើម្បីឲ្យត្រូវចំនួន', zh: '其中 {n} 人支付 {amt}，以便金额正好' },
  order: { en: 'Order', km: 'ការកុម្ម៉ង់', zh: '订单' },
  guest: { en: 'Guest', km: 'ភ្ញៀវ', zh: '客人' },
  rielRate: { en: 'Riel prices at {rate}៛ = $1', km: 'តម្លៃរៀល {rate}៛ = $1', zh: '瑞尔价格按 {rate}៛ = $1 计算' },
  poweredBy: { en: 'Powered by', km: 'ដំណើរការដោយ', zh: '技术支持' },
  status_new: { en: 'Sent to kitchen', km: 'បានផ្ញើទៅផ្ទះបាយ', zh: '已发送到厨房' },
  status_preparing: { en: 'Preparing', km: 'កំពុងរៀបចំ', zh: '准备中' },
  status_served: { en: 'Served', km: 'បានបម្រើ', zh: '已上菜' },
  status_cancelled: { en: 'Cancelled', km: 'បានលុបចោល', zh: '已取消' },
} satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

export function translate(lang: Lang, key: StringKey, vars?: Record<string, string | number>) {
  let s: string = STRINGS[key][lang] ?? STRINGS[key].en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

type Translatable = { name: string; description?: string | null; i18n?: Record<string, { name?: string; description?: string } | undefined> | null };

/** Dish / category text in the diner's language, falling back to the base (English) text. */
export function loc(entity: Translatable, lang: Lang, field: 'name' | 'description' = 'name'): string {
  const base = field === 'name' ? entity.name : entity.description ?? '';
  if (lang === 'en') return base;
  return entity.i18n?.[lang]?.[field]?.trim() || base;
}

/** Option group / choice labels store translations as {km: "...", zh: "..."}. */
export function locLabel(entity: { name: string; i18n?: Partial<Record<Lang, string>> }, lang: Lang) {
  return (lang !== 'en' && entity.i18n?.[lang]?.trim()) || entity.name;
}

const STORAGE_KEY = 'khmenu:lang';

function initialLang(available: Lang[]): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && available.includes(saved)) return saved;
  } catch {
    // Storage blocked: fall through to the browser language.
  }
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith('km') && available.includes('km')) return 'km';
  if (nav.startsWith('zh') && available.includes('zh')) return 'zh';
  return 'en';
}

export function useLang(available: Lang[]) {
  const [lang, setLangState] = useState<Lang>(() => initialLang(available));
  const key = available.join(',');

  useEffect(() => {
    if (!available.includes(lang)) setLangState(initialLang(available));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Remembering the language is only a convenience.
    }
  }, []);

  const t = useCallback((k: StringKey, vars?: Record<string, string | number>) => translate(lang, k, vars), [lang]);
  return { lang, setLang, t };
}
