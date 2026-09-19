// Sends a web push notification to every staff device of a restaurant.
// Called by database triggers (pg_net) on new orders / service requests, and by
// the staff app with {type: "test"} to check a device.
import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

let appServer: webpush.ApplicationServer | null = null;
async function getAppServer() {
  if (appServer) return appServer;
  const { data, error } = await supabase.rpc("get_push_config");
  if (error || !data?.vapid_keys) throw new Error(`push config missing: ${error?.message}`);
  const vapidKeys = await webpush.importVapidKeys(JSON.parse(data.vapid_keys), { extractable: false });
  appServer = await webpush.ApplicationServer.new({ contactInformation: data.contact_email, vapidKeys });
  return appServer;
}

type Message = { restaurantId: string; title: string; body: string; tag: string };

async function claimOrder(id: string): Promise<Message | null> {
  // The notified_at guard makes repeated calls for the same order harmless.
  const { data } = await supabase
    .from("orders")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id)
    .is("notified_at", null)
    .select("restaurant_id, order_number, total_usd, guest_name, dining_tables(label), order_items(name, qty)")
    .maybeSingle();
  if (!data) return null;
  const table = (data.dining_tables as { label: string } | null)?.label ?? "A table";
  const items = (data.order_items as { name: string; qty: number }[]).map((i) => `${i.qty}× ${i.name}`).join(", ");
  return {
    restaurantId: data.restaurant_id,
    title: `New order #${data.order_number} · ${table}`,
    body: `${items} · $${Number(data.total_usd).toFixed(2)}${data.guest_name ? ` · ${data.guest_name}` : ""}`,
    tag: `order-${id}`,
  };
}

async function claimRequest(id: string): Promise<Message | null> {
  const { data } = await supabase
    .from("service_requests")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id)
    .is("notified_at", null)
    .select("restaurant_id, kind, dining_tables(label)")
    .maybeSingle();
  if (!data) return null;
  const table = (data.dining_tables as { label: string } | null)?.label ?? "A table";
  return {
    restaurantId: data.restaurant_id,
    title: data.kind === "bill" ? `${table} wants the bill` : `${table} is calling a waiter`,
    body: "Tap to open the staff app",
    tag: `request-${id}`,
  };
}

async function testMessage(req: Request, restaurantId: string): Promise<Message | null> {
  // Only a signed-in staff member of this restaurant may send a test.
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  const { data: user } = await supabase.auth.getUser(token);
  if (!user.user) return null;
  const { data: staff } = await supabase
    .from("restaurant_staff")
    .select("user_id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.user.id)
    .maybeSingle();
  if (!staff) return null;
  return { restaurantId, title: "Notifications are on ✓", body: "New orders will show up here.", tag: `test-${Date.now()}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { type, id, restaurant_id } = await req.json();
    const message =
      type === "order" ? await claimOrder(id) : type === "request" ? await claimRequest(id) : type === "test" ? await testMessage(req, restaurant_id) : null;
    if (!message) return Response.json({ sent: 0 }, { headers: cors });

    const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("restaurant_id", message.restaurantId);
    const server = await getAppServer();
    const payload = JSON.stringify({ title: message.title, body: message.body, tag: message.tag, url: "/#/admin" });

    let sent = 0;
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await server.subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }).pushTextMessage(payload, {});
          sent++;
        } catch (err) {
          // Expired or uninstalled devices answer 404/410; forget them.
          const text = String(err);
          if (/\b(404|410)\b/.test(text) || /gone|not found/i.test(text)) await supabase.from("push_subscriptions").delete().eq("id", s.id);
          console.error("push failed", s.endpoint.slice(0, 60), text);
        }
      }),
    );
    return Response.json({ sent }, { headers: cors });
  } catch (err) {
    console.error(err);
    return Response.json({ error: String(err) }, { status: 500, headers: cors });
  }
});
