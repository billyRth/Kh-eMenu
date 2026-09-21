import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { BellOff, BellRing, Download, Share, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { currentSubscription, disablePush, enablePush, isInstalled, isIos, pushSupported, sendTestPush } from '@/lib/push';
import { installPrompt, onInstallPromptChange } from '@/lib/install';
import { useT } from '@/lib/i18n';
import type { Restaurant } from '@/lib/types';

/** "Install the app" + "Turn on notifications" card shown above the order board. */
export function DeviceSetup({ restaurant }: { restaurant: Restaurant }) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [canInstall, setCanInstall] = useState(!!installPrompt());
  const [busy, setBusy] = useState(false);
  const { t } = useT();

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
      toast.success(t(sent > 0 ? 's_pushOnTest' : 's_pushOn'));
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  }

  async function turnOff() {
    await disablePush();
    setSubscribed(false);
    toast(t('s_pushOff'));
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
      <Card icon={<Smartphone className="size-5" />} title={t('s_iosTitle')}>
        <p>
          {/* Split on {share}/{add}/{app} so each language can put the bold labels where its word order needs them. */}
          {t('s_iosSteps').split(/(\{\w+\})/).map((part, i) =>
            part === '{share}' ? (
              <span key={i}>
                <Share className="inline size-4 align-text-bottom" /> <b>{t('s_iosShare')}</b>
              </span>
            ) : part === '{add}' ? (
              <b key={i}>{t('s_iosAdd')}</b>
            ) : part === '{app}' ? (
              <b key={i}>KhMenu Staff</b>
            ) : (
              part
            ),
          )}
        </p>
      </Card>
    );
  }

  if (!pushSupported()) {
    return (
      <Card icon={<BellOff className="size-5" />} title={t('s_noPushTitle')}>
        <p>{t('s_noPushBody')}</p>
      </Card>
    );
  }

  if (subscribed) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
        <BellRing className="size-4" />
        <span className="mr-auto font-semibold">{t('s_pushIsOn')}</span>
        <Button size="sm" variant="outline" className="bg-card" onClick={() => sendTestPush(restaurant.id).then(() => toast.success(t('s_testSent')))}>
          {t('s_sendTest')}
        </Button>
        <Button size="sm" variant="ghost" onClick={turnOff}>
          {t('s_turnOff')}
        </Button>
      </div>
    );
  }

  return (
    <Card icon={<BellRing className="size-5" />} title={t('s_pushCardTitle')}>
      <p>{t('s_pushCardBody')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={turnOn} disabled={busy} className="font-bold">
          <BellRing /> {busy ? t('s_turningOn') : t('s_turnOnPush')}
        </Button>
        {canInstall && !isInstalled() && (
          <Button variant="outline" onClick={install}>
            <Download /> {t('s_installApp')}
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
