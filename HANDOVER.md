# KhMenu handover

KhMenu ("App កូនខ្មែរ") is a QR-code menu and table-ordering app for restaurants in Cambodia. Diners scan the QR code on their table, order from their phone and pay at the counter. Staff get every order live, with push notifications, in an installable staff app.

Status on 2026-09-21: everything below is built and tested locally. **The site is not online yet** (the Render deploy is waiting on a go-ahead).

---

## 1. Moving to another computer

The code lives on GitHub: **https://github.com/billyRth/Kh-eMenu** (branch `main`). The database and server functions are on Supabase, so nothing else has to be copied.

**On this laptop, first:** push the latest commits.

```bash
git -C "C:/Users/thira/Desktop/emenu" push
```

**On the new computer:**

1. Install [Git](https://git-scm.com/download/win) and [Node.js 22+](https://nodejs.org).
2. Clone the repo:
   ```bash
   git clone https://github.com/billyRth/Kh-eMenu.git "%USERPROFILE%\Desktop\emenu"
   ```
3. Create `emenu\.env`. It is git-ignored, so it doesn't come with the clone. Both values are public by design (the key is Supabase's browser key):
   ```
   VITE_SUPABASE_URL=https://jlqvzbyrywvqlcrlmphb.supabase.co
   VITE_SUPABASE_KEY=sb_publishable_kZAbOOalC0gpXxh7YoBKyQ_DQ4oSj8O
   ```
4. Install and run:
   ```bash
   npm ci
   npm run dev
   ```
   Then open http://localhost:5173.

**To continue with Claude Code on the new computer:**
- Open the `emenu` folder and tell Claude to "read HANDOVER.md". Claude's memory is stored per computer, so this file is how it catches up.
- Sign in to the same Claude account. The Supabase and Render connectors are account-level, so they follow you.
- Reinstall the plugins used here, if you still want them:
  ```bash
  claude plugin marketplace add Leonxlnx/taste-skill
  claude plugin install taste-skill@taste-skill
  claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
  claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill
  claude plugin marketplace add DietrichGebert/ponytail
  claude plugin install ponytail@ponytail
  claude plugin marketplace add latent-spaces/brag
  claude plugin install brag@brag
  claude plugin marketplace add pbakaus/impeccable
  ```
  - `impeccable` is enabled per-project in `.claude/settings.json`, so it activates by itself once its marketplace is added.
  - For videos, install FFmpeg with `winget install --id Gyan.FFmpeg -e`, then run `npx hyperframes skills`.

---

## 2. Accounts and services

| What | Where | Notes |
|---|---|---|
| Code | GitHub `billyRth/Kh-eMenu` | Pushes are done from your own terminal. Claude was blocked from adding the remote. |
| Database, auth, storage, server function | Supabase project **emenu**, ref `jlqvzbyrywvqlcrlmphb`, org "thi org", Singapore | Free tier. Free projects **pause after about a week with no traffic**; upgrade to Pro ($25/mo) before real restaurants depend on it. |
| Hosting (planned) | Render, workspace "My Workspace" `tea-dah6p2h5efls73893spg` | Plan: a **static site** named `kh-emenu`. Build `npm ci && npm run build`, publish `dist`, set env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `NODE_VERSION=22`. |
| Push notifications | Private VAPID key stored in the database table `private.settings` (never in git) | The public half is in `src/lib/push.ts`. The contact is set to `https://kh-emenu.onrender.com`; change it if the site URL changes. |

Demo restaurant: slug `demo` ("Sabay Kitchen"), 8 tables, staff login `demo@emenu.app`. The password is not written here; it's in your chat with Claude.

---

## 3. How it's built

**Frontend:** Vite + React 19 + TypeScript, Tailwind v4, shadcn/ui (Base UI flavour), lucide icons, sonner toasts.
- Routing uses the `#` hash, so the site works on any static host with no rewrite rules.
- The diner pages load first; the staff pages load separately (lazy-loaded).

| Route | Page | File |
|---|---|---|
| `#/` | Sales/landing page (pricing, theme showcase, demo links) | `src/pages/LandingPage.tsx` |
| `#/r/<slug>` | Public view-only menu, for Google Maps / Facebook. Add `?theme=night` etc. to preview a style | `src/pages/MenuPage.tsx` |
| `#/t/<table-token>` | Table QR: the menu with ordering, cart, bill and split | `src/pages/TablePage.tsx` → `MenuPage.tsx` |
| `#/admin` | Staff app: Orders, Today report, Menu, Tables & QR, Settings | `src/pages/admin/*` |

**Database (Supabase Postgres).** The schema is in `supabase/migrations/001`–`007`. Those files were applied through Claude's Supabase connector, not the Supabase CLI.

| Table | Purpose |
|---|---|
| `restaurants` | Name, contact details, riel rate, brand colour, `theme`, `languages`, `reports_enabled` (paid add-on), `ordering_enabled` |
| `restaurant_staff` | Which login belongs to which restaurant |
| `categories` | Menu sections; `report_group` (drink/starter/main/dessert); `i18n` |
| `menu_items` | Dishes: price, private `cost_usd`, `options` (priced choices), `i18n`, sold-out flag |
| `dining_tables` | One per table, with a secret QR `token` and `cleared_at` |
| `orders`, `order_items` | Orders; each line keeps a snapshot of name, price and chosen options |
| `service_requests` | "Call waiter" and "Ask for bill" |
| `push_subscriptions` | Staff devices that get notifications |

**Security model**
- Diners are anonymous. They can read menus, but they write **only** through database functions keyed by the table token: `place_order`, `get_table_tab`, `call_staff`.
- Prices and options are always recalculated in the database, so a diner can't fake a price.
- Staff access is enforced with row-level security via `is_staff()`.
- `scripts/smoke-test.mjs` checks all of this end to end.

**Notifications:** a new order or request fires a database trigger → `pg_net` calls the edge function `supabase/functions/notify-staff` → it sends a web push to every staff device → `public/sw.js` shows the notification. On iPhone this only works once the staff app is added to the home screen.

**Daily report:** the database function `daily_report(restaurant, date)` groups by the Phnom Penh business day. Before 5am, the app still shows the previous day.

---

## 4. Features (all built)

- **Diners:**
  - photo or emoji menu, search, categories
  - USD + KHR prices
  - chef's picks and automatic "Popular" badges
  - options such as sugar, ice, size, spice and add-ons, with prices
  - notes per dish
  - English / Khmer / Chinese switcher
  - group ordering from several phones, one shared bill, bill split by person or equally
  - call waiter and ask for bill
  - live order status
- **Staff:**
  - live order board with sound and push notifications
  - table grid (Free / Eating / Calling / Wants bill); tapping a busy table marks it paid and **clears it** so the next guests start fresh
  - menu editor with option presets and translation fields
  - printable QR codes per table plus the public menu link
  - settings: 6 menu styles (Warm Khmer, Modern Café, Night Bar, Street Food, Garden, Fine Dining), languages, riel rate, ordering on/off
  - the **Today** end-of-day report (add-on)

---

## 5. Everyday tasks

**Onboard a new restaurant:**
1. Edit the values at the top of `supabase/onboard_restaurant.sql` and run it in the Supabase SQL editor. It creates the restaurant, the owner login and N tables.
2. Sign in as the owner at `#/admin` to build the menu.
3. Set Settings → style and languages.
4. Print QR codes from Tables & QR.

**Turn on the paid daily report:** `update restaurants set reports_enabled = true where slug = '<slug>';`

**Test the database rules:**
```bash
node --env-file=.env scripts/smoke-test.mjs demo@emenu.app <demo password>
```

**Check types and build:** `npx tsc -b` and `npm run build`

**Marketing assets:**
- **Instagram banners:** `assets/banners/launch/*.html`. Re-render with headless Chrome at 1080×1080 and 1080×1920 (add `?story` to the URL for the vertical version).
- **Launch video:** `brag-output/brag.mp4`, source in `brag-output/composition/`. Re-render there with `npx hyperframes render --quality high --output ../brag.mp4` (FFmpeg must be on your PATH).
- **App icons:** `node scripts/make-icons.mjs`

---

## 6. Open items and decisions

1. **Go live:** create the Render static site (settings in section 2), then test ordering and push notifications on a real phone.
2. **Telegram alerts** (recommended next): one KhMenu bot that each restaurant adds to its staff group; it posts orders, bill requests and the nightly report. You need to create the bot with @BotFather; the token is then set privately in `private.settings`.
3. **KHQR pay-at-table:**
   - Step 1: show a KHQR code with the amount filled in, generated from the restaurant's Bakong account ID; staff tap Paid.
   - Step 2: confirm payments automatically via the Bakong API or ABA PayWay.
4. **Native-speaker review** of the Khmer and Chinese text in `src/lib/i18n.ts` and the demo menu.
5. **Pricing:** you proposed $200 setup + $10.99/mo; the suggestion was a lower setup fee and $15–20/mo, plus $8–10/mo for the daily report.
6. **More feature ideas, from competitor research:** extra service buttons (water, ice, napkins), a "same again" reorder button, allergy/vegetarian filters, a Google review prompt, hotpot/BBQ buffet mode, kitchen printer tickets.
7. **Demo data:** sample paid orders were seeded for 2026-09-18/19 so the report has something to show. They are not in the migrations.

## 7. Gotchas

- `.env` is git-ignored: recreate it on every machine (section 1).
- Browser storage keys still use the old `emenu:` prefix (cart, admin tab). This is harmless.
- `dist/` and `node_modules/` are not in git. `npm ci` and `npm run build` recreate them.
- The Supabase free tier pauses when idle. Wake it from the Supabase dashboard if the app suddenly can't load menus.
