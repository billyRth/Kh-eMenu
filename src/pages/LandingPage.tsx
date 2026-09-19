import { useEffect } from 'react';
import { ArrowRight, BellRing, Ban, Check, Coins, Flame, Link2, QrCode, ReceiptText, Smartphone, Tablet, Users, UtensilsCrossed } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Sales settings: edit these when pricing or contact details change.
const PRICING = { setupUsd: 200, monthlyUsd: 10.99 };
const CONTACT_URL = ''; // e.g. 'https://t.me/yourname'; the contact button stays hidden while this is empty
const DEMO_TABLE_TOKEN = 'f6751323731a43';

const FEATURES = [
  { icon: Smartphone, title: 'No app to download', text: 'Diners scan the QR code on the table and the menu opens in their phone’s browser.' },
  { icon: BellRing, title: 'Orders straight to the kitchen', text: 'Orders pop up on your staff screen with a sound alert. No more lost paper tickets.' },
  { icon: Users, title: 'Group ordering & bill split', text: 'Everyone orders from their own phone. The bill splits by person or equally, down to the cent.' },
  { icon: Coins, title: 'Dollars and riel', text: 'Every price shows in USD and KHR at your own exchange rate.' },
  { icon: ReceiptText, title: 'Call waiter & ask for the bill', text: 'One tap from the table, and staff see exactly which table needs them.' },
  { icon: Ban, title: 'Sold out in one tap', text: 'Ran out of amok? Switch it off and every phone updates. No reprinting menus.' },
  { icon: Flame, title: 'Popular dishes, automatically', text: 'Your best sellers get a “Popular” badge based on real orders.' },
  { icon: Link2, title: 'One link for Google & Facebook', text: 'Share your menu on Google Maps, Facebook, Instagram and Telegram.' },
];

export function LandingPage() {
  useEffect(() => {
    document.title = 'KhMenu · QR menus & table ordering for Cambodian restaurants';
  }, []);

  return (
    <div className="min-h-dvh">
      <div className="bg-[radial-gradient(ellipse_at_top,theme(colors.orange.100),transparent_60%)]">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <span className="flex items-center gap-2 text-lg font-extrabold">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <UtensilsCrossed className="size-5" />
            </span>
            <span>
              <span className="text-primary">Kh</span>Menu
            </span>
          </span>
          <a href="#/admin" className={buttonVariants({ variant: 'outline' })}>
            Staff sign in
          </a>
        </nav>

        <header className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm font-semibold text-primary">
              <QrCode className="size-4" /> App kon Khmer · កម្មវិធីកូនខ្មែរ
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">Your menu on every phone. Orders straight to your kitchen.</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Made in Phnom Penh for Cambodian restaurants and cafés. A QR code on each table. Diners browse your menu with photos, order from their seat, split the bill and ask for the check. Your staff see everything on one live screen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`#/t/${DEMO_TABLE_TOKEN}`} className={cn(buttonVariants({ size: 'lg' }), 'h-12 px-5 text-base font-bold')}>
                Try ordering as a diner <ArrowRight />
              </a>
              <a href="#/r/demo" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-12 bg-card px-5 text-base')}>
                See a demo menu
              </a>
            </div>
          </div>

          {/* Phone mock-up */}
          <div className="relative mx-auto w-full max-w-xs">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-primary/15 blur-2xl" />
            <div className="overflow-hidden rounded-[2.5rem] border-8 border-foreground bg-background shadow-2xl">
              <div className="h-24 bg-primary" />
              <div className="-mt-10 space-y-3 px-4 pb-6">
                <div className="rounded-2xl border bg-card p-3 shadow">
                  <p className="font-extrabold">Sabay Kitchen</p>
                  <p className="text-xs text-muted-foreground">Table 4 · order from your phone</p>
                </div>
                {[
                  ['🐟', 'Fish Amok', '$6.50'],
                  ['🥩', 'Beef Lok Lak', '$6.00'],
                  ['🍜', 'Kuy Teav', '$3.50'],
                ].map(([emoji, name, price]) => (
                  <div key={name} className="flex items-center gap-3 rounded-2xl border bg-card p-2.5">
                    <span className="grid size-11 place-items-center rounded-xl bg-secondary text-2xl">{emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{name}</p>
                      <p className="text-xs font-semibold">{price}</p>
                    </div>
                    <span className="grid size-7 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">+</span>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">
                  <span>View order · 3</span>
                  <span>$16.00</span>
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight">Everything a busy restaurant needs</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl bg-card p-5 ring-1 ring-foreground/5">
              <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">How it works</h2>
          <ol className="mt-6 space-y-4">
            {[
              ['We set up your menu', 'with your dishes, prices and photos.'],
              ['We print a QR code for each table', 'plus a link for Google and Facebook.'],
              ['Diners scan and order.', 'Staff get the order instantly on a tablet, phone or laptop.'],
              ['Customers pay at the counter', 'as usual. Nothing changes at checkout.'],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-sm font-bold text-background">{i + 1}</span>
                <p className="pt-1">
                  <b>{title}</b> <span className="text-muted-foreground">{text}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-3xl bg-card p-6 ring-1 ring-foreground/5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Tablet className="size-5" />
            </div>
            <h3 className="text-lg font-bold">What do staff use?</h3>
          </div>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Any device with a browser. Most restaurants keep a cheap Android tablet at the counter or in the kitchen. New orders appear with a chime and the screen stays awake. Waiters can open the
            same screen on their own phones.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mx-auto max-w-md rounded-[2rem] bg-card p-8 shadow-xl ring-2 ring-primary">
          <p className="text-sm font-bold text-primary">Simple pricing</p>
          <p className="mt-2 text-5xl font-extrabold tracking-tight">
            ${PRICING.monthlyUsd}
            <span className="text-lg font-semibold text-muted-foreground">/month</span>
          </p>
          <p className="mt-1 text-muted-foreground">+ ${PRICING.setupUsd} one-time setup</p>
          <ul className="mt-6 space-y-2.5">
            {['Menu setup and QR codes for every table', 'Unlimited dishes, orders and menu changes', 'Live order screen for your staff', 'Support by phone & Telegram'].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Check className="mt-0.5 size-5 shrink-0 text-emerald-600" /> {t}
              </li>
            ))}
          </ul>
          {CONTACT_URL && (
            <a href={CONTACT_URL} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: 'lg' }), 'mt-7 h-12 w-full text-base font-bold')}>
              Get started
            </a>
          )}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} KhMenu · App kon Khmer · ធ្វើដោយខ្មែរ សម្រាប់ខ្មែរ</footer>
    </div>
  );
}
