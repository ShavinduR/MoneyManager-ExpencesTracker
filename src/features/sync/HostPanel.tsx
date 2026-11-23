import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { RefreshCw, Send, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { backupStats } from '@/data/backup';
import { buildSyncPayload } from '@/data/syncPayload';
import { formatPairingCode } from '@/lib/sync/crypto';
import { startHostSession, type HostFailure, type HostSession, type HostState } from '@/lib/sync/session';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { createPeerHostTransport } from './peerTransport';
import { formatCountdown, useCountdown } from './useCountdown';
import { StatusLine } from './StatusLine';

const FAILURES: Record<HostFailure, string> = {
  network: 'Couldn’t reach the pairing server. Check your connection and get a new code.',
  'code-taken': 'That code was already in use. Getting a new one…',
  'bad-key': 'A device tried to connect with the wrong key, so this code was cancelled for safety. Get a new code to try again.',
  disconnected: 'The connection dropped before the transfer finished. Nothing was changed on the other device.',
  rejected: 'The other device couldn’t verify the data, so it wasn’t applied. Get a new code and try again.',
  unsupported: 'This browser can’t make device-to-device connections. Try an up-to-date Chrome, Edge, Firefox or Safari.',
};

const QrImage = ({ text }: { text: string }) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, width: 440, color: { dark: '#18181b', light: '#ffffff' } })
      .then((url) => live && setSrc(url))
      .catch(() => live && setSrc(null));
    return () => {
      live = false;
    };
  }, [text]);
  return (
    // Always dark-on-white, even in dark mode, so every camera can read it.
    <div className="mx-auto flex size-48 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-2 dark:border-ink-700">
      {src ? <img src={src} alt="Sync QR code. Scan it with your other device, or type the code below." className="size-full" /> : null}
    </div>
  );
};

/** "Send from this device": shows a QR + 6-digit code and sends only after the user approves. */
export const HostPanel = () => {
  const [state, setState] = useState<HostState>({ phase: 'preparing' });
  const [attempt, setAttempt] = useState(0);
  const sessionRef = useRef<HostSession | null>(null);
  const autoRetries = useRef(0);
  const data = useFinanceStore((s) => s.data);
  const markProtected = useOnboardingStore((s) => s.update);
  const expiresAt = state.phase === 'waiting' || state.phase === 'confirm' ? state.expiresAt : null;
  const secondsLeft = useCountdown(expiresAt);

  useEffect(() => {
    const session = startHostSession({
      transport: createPeerHostTransport(),
      // Read at approval time so the newest data is sent.
      getPayload: () => buildSyncPayload(useFinanceStore.getState().data),
      onState: setState,
    });
    sessionRef.current = session;
    return () => session.close();
  }, [attempt]);

  useEffect(() => {
    if (state.phase === 'done') markProtected({ protectVisited: true });
    if (state.phase === 'error' && state.reason === 'code-taken' && autoRetries.current < 3) {
      autoRetries.current += 1;
      setAttempt((n) => n + 1);
    }
  }, [state, markProtected]);

  const regenerate = (): void => setAttempt((n) => n + 1);
  const stats = backupStats(data);

  switch (state.phase) {
    case 'preparing':
      return <StatusLine tone="busy" className="py-10">Creating a secure one-time code…</StatusLine>;
    case 'waiting':
      return (
        <div className="space-y-4 text-center">
          <QrImage text={state.qrText} />
          <div>
            <p className="text-xs text-muted">Or enter this code on the other device</p>
            <p className="mt-1 font-mono text-3xl font-semibold tracking-[0.15em] tabular" aria-label={`Pairing code ${state.code.split('').join(' ')}`}>
              {formatPairingCode(state.code)}
            </p>
            <p className="mt-1 text-xs text-muted tabular" aria-live="off">
              Expires in {formatCountdown(secondsLeft)} · works once
            </p>
          </div>
          <StatusLine tone="busy">Waiting for your other device…</StatusLine>
          <Button size="sm" variant="ghost" icon={<RefreshCw className="size-3.5" />} onClick={regenerate}>
            New code
          </Button>
        </div>
      );
    case 'confirm':
      return (
        <div className="space-y-4">
          <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
              <ShieldAlert className="size-4 shrink-0" aria-hidden /> Device connected: send your data?
            </p>
            <p className="mt-1 text-sm text-amber-900 dark:text-amber-100/90">
              A device {state.method === 'qr' ? 'scanned your QR code' : 'entered your code'}. Only send if it’s your own device and you started this just now.
            </p>
          </div>
          <p className="text-xs text-muted">
            Sends {stats.months} months, {stats.entries} entries, {stats.debts} debts and {stats.accounts} bank accounts, encrypted end to end. Your Gemini key and device settings are never sent.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button className="max-sm:flex-1" icon={<X className="size-4" />} onClick={() => sessionRef.current?.decline()}>
              Don’t send
            </Button>
            <Button className="max-sm:flex-1" variant="primary" icon={<Send className="size-4" />} onClick={() => sessionRef.current?.approve()}>
              Send my data
            </Button>
          </div>
          <p className="text-center text-xs text-muted tabular">Expires in {formatCountdown(secondsLeft)}</p>
        </div>
      );
    case 'sending':
      return (
        <div className="space-y-3 py-6">
          <StatusLine tone="busy">Sending encrypted data…</StatusLine>
          <ProgressBar value={state.total ? state.sent / state.total : 0} />
        </div>
      );
    case 'done':
      return (
        <div className="space-y-2 py-6 text-center">
          <StatusLine tone="ok">Sent. Your other device now shows a preview to review and apply.</StatusLine>
          <p className="text-xs text-muted">The connection is closed and the code no longer works.</p>
        </div>
      );
    case 'declined':
    case 'expired':
    case 'error':
      return (
        <div className="space-y-4 py-4 text-center">
          <StatusLine tone={state.phase === 'declined' ? 'idle' : 'error'}>
            {state.phase === 'declined' ? 'Nothing was sent.' : state.phase === 'expired' ? 'This code expired after 5 minutes.' : FAILURES[state.reason]}
          </StatusLine>
          <Button variant="primary" icon={<RefreshCw className="size-4" />} onClick={regenerate}>
            Get a new code
          </Button>
        </div>
      );
  }
};
