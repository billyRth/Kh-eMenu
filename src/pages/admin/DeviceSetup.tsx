import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { BellOff, BellRing, Download, Share, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { currentSubscription, disablePush, enablePush, isInstalled, isIos, pushSupported, sendTestPush } from '@/lib/push';
import { installPrompt, onInstallPromptChange } from '@/lib/install';
import type { Restaurant } from '@/lib/types';

/** "Install the app" + "Turn on notifications" card shown above the order board. */
export function DeviceSetup({ restaurant }: { restaurant: Restaurant }) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [canInstall, setCanInstall] = useState(!!installPrompt());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    currentSubscription().then((s) => setSubscribed(!!s));
    return onInstallPromptChange(() => setCanInstall(!!installPrompt()));
  }, []);

  async function turnOn() {
    setBusy(true);
    try {
      await enablePush(restaurant.id);
      setSubscribed(true);
      const sent = await sendTestPush(restaurant.id);
      toast.success(sent > 0 ? 'Notifications on. A test alert was sent.' : 'Notifications on for this device.');
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  }

  async function turnOff() {
    await disablePush();
    setSubscribed(false);
    toast('Notifications off for this device');
  }

  async function install() {
    const prompt = installPrompt();
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setCanInstall(false);
  }

  if (subscribed === null) return null;

  // iPhone only allows notifications from the installed app, not from Safari tabs.
  if (isIos() && !isInstalled()) {
    return (
      <Card icon={<Smartphone className="size-5" />} title="Install the staff app on this iPhone">
        <p>
          Tap <Share className="inline size-4 align-text-bottom" /> <b>Share</b> in Safari, then <b>Add to Home Screen</b>. Open <b>eMenu Staff</b> from your home screen, sign in, and turn on
          notifications.
        </p>
      </Card>
    );
  }

  if (!pushSupported()) {
    return (
      <Card icon={<BellOff className="size-5" />} title="This browser can’t show notifications">
        <p>Use Chrome on Android or a computer, or the installed app on iPhone. Orders still appear here live with a sound.</p>
      </Card>
    );
  }

  if (subscribed) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
        <BellRing className="size-4" />
        <span className="mr-auto font-semibold">Notifications are on for this device</span>
        <Button size="sm" variant="outline" className="bg-card" onClick={() => sendTestPush(restaurant.id).then(() => toast.success('Test alert sent'))}>
          Send test
        </Button>
        <Button size="sm" variant="ghost" onClick={turnOff}>
          Turn off
        </Button>
      </div>
    );
  }

  return (
    <Card icon={<BellRing className="size-5" />} title="Get an alert for every order, even when the app is closed">
      <p>Turn this on for each phone or tablet that should ring: the counter tablet, the kitchen, waiters’ phones.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={turnOn} disabled={busy} className="font-bold">
          <BellRing /> {busy ? 'Turning on…' : 'Turn on notifications'}
        </Button>
        {canInstall && !isInstalled() && (
          <Button variant="outline" onClick={install}>
            <Download /> Install app
          </Button>
        )}
      </div>
    </Card>
  );
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3.5 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-primary/20">
      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
      <div className="text-sm text-muted-foreground">
        <p className="mb-1 font-bold text-foreground">{title}</p>
        {children}
      </div>
    </div>
  );
}
