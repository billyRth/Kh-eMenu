// End-to-end check of the database security rules and RPCs.
// Usage: node --env-file=.env scripts/smoke-test.mjs <staff-email> <staff-password>
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_KEY;
const [email, password] = process.argv.slice(2);
const anon = createClient(url, key, { auth: { persistSession: false } });
let failures = 0;
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`);
  if (!ok) failures++;
};

const { data: rest } = await anon.from('restaurants').select('*').eq('slug', 'demo').single();
check('anon reads restaurant', !!rest);
const { data: items } = await anon.from('menu_items').select('*').eq('restaurant_id', rest.id);
check('anon reads menu items', items?.length > 0, `${items?.length} items`);

const { data: anonTables } = await anon.from('dining_tables').select('*');
check('anon cannot list table tokens', (anonTables ?? []).length === 0);
const { data: anonOrders } = await anon.from('orders').select('*');
check('anon cannot read orders', (anonOrders ?? []).length === 0);
const { error: anonWrite } = await anon.from('menu_items').update({ price_usd: 0 }).eq('restaurant_id', rest.id).select();
const { data: after } = await anon.from('menu_items').select('price_usd').eq('id', items[0].id).single();
check('anon cannot change prices', Number(after.price_usd) === Number(items[0].price_usd), anonWrite?.message ?? '');

const staff = createClient(url, key, { auth: { persistSession: false } });
const { error: loginErr } = await staff.auth.signInWithPassword({ email, password });
check('staff login', !loginErr, loginErr?.message ?? '');
const { data: tables } = await staff.from('dining_tables').select('*').eq('restaurant_id', rest.id).order('sort_order');
check('staff lists tables', tables?.length > 0);
const token = tables[0].token;

const { data: tbl } = await anon.rpc('get_table', { p_token: token });
check('get_table resolves token', tbl?.restaurant_slug === 'demo', JSON.stringify(tbl));
const { data: badTbl } = await anon.rpc('get_table', { p_token: 'nope' });
check('get_table rejects bad token', badTbl === null);

const { data: order, error: orderErr } = await anon.rpc('place_order', {
  p_token: token,
  p_items: [{ item_id: items[0].id, qty: 2, note: 'no ice' }, { item_id: items[1].id, qty: 1 }],
  p_note: 'smoke test',
});
const expected = Number(items[0].price_usd) * 2 + Number(items[1].price_usd);
check('place_order prices server-side', !orderErr && Number(order.total_usd) === expected, orderErr?.message ?? JSON.stringify(order));

const { error: badQty } = await anon.rpc('place_order', { p_token: token, p_items: [{ item_id: items[0].id, qty: 0 }] });
check('place_order rejects qty 0', !!badQty);

const { data: tab } = await anon.rpc('get_table_tab', { p_token: token });
check('table tab shows the order', tab?.some((o) => o.id === order.order_id));

await anon.rpc('call_staff', { p_token: token, p_kind: 'bill' });
await anon.rpc('call_staff', { p_token: token, p_kind: 'bill' });
const { data: reqs } = await staff.from('service_requests').select('*').eq('table_id', tables[0].id).is('resolved_at', null).eq('kind', 'bill');
check('call_staff dedupes open requests', reqs?.length === 1);

const { data: staffOrders } = await staff.from('orders').select('*, order_items(*), dining_tables(label)').eq('id', order.order_id);
check('staff reads order with items', staffOrders?.[0]?.order_items?.length === 2);
const { error: upErr } = await staff.from('orders').update({ status: 'preparing' }).eq('id', order.order_id);
check('staff updates status', !upErr, upErr?.message ?? '');

// Clean up: close the tab and resolve the request so the demo stays tidy.
await staff.from('orders').update({ status: 'served', paid_at: new Date().toISOString() }).eq('id', order.order_id);
await staff.from('service_requests').update({ resolved_at: new Date().toISOString() }).eq('table_id', tables[0].id).is('resolved_at', null);
const { data: tabAfter } = await anon.rpc('get_table_tab', { p_token: token });
check('paid orders leave the tab', !tabAfter?.some((o) => o.id === order.order_id));

console.log(failures ? `\n${failures} FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
