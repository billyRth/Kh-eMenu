import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QrCode, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingScreen, MessageScreen } from '@/components/common';
import { friendlyError, supabase } from '@/lib/supabase';
import { MenuPage } from './MenuPage';

/** Entry point for a table's QR code: resolve the token, then show the menu with ordering on. */
export function TablePage() {
  const { token = '' } = useParams();
  const [state, setState] = useState<{ label: string; slug: string } | 'missing' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    supabase.rpc('get_table', { p_token: token }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setMessage(friendlyError(error.message));
        setState('error');
      } else if (!data) {
        setState('missing');
      } else {
        const t = data as { label: string; restaurant_slug: string };
        setState({ label: t.label, slug: t.restaurant_slug });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === null) return <LoadingScreen label="Finding your table…" />;
  if (state === 'missing') {
    return (
      <MessageScreen icon={<QrCode />} title="This QR code isn’t active">
        <p className="text-muted-foreground">Please ask a staff member for help with your order.</p>
      </MessageScreen>
    );
  }
  if (state === 'error') {
    return (
      <MessageScreen icon={<WifiOff />} title="Couldn’t find your table">
        <p className="text-muted-foreground">{message}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </MessageScreen>
    );
  }
  return <MenuPage slug={state.slug} table={{ token, label: state.label }} />;
}
