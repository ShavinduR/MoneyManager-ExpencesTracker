import { useEffect, useState, type FormEvent } from 'react';
import { Camera, KeyRound, Link2, RotateCcw } from 'lucide-react';
import type { FinanceData } from '@/types/finance';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Segmented } from '@/components/ui/Segmented';
import { MAX_SYNC_CIPHERTEXT_CHARS, parseSyncPayload } from '@/data/syncPayload';
import { normalizePairingCode } from '@/lib/sync/crypto';
import { startJoinSession, type JoinFailure, type JoinPairing, type JoinState } from '@/lib/sync/session';
import { createPeerJoinTransport } from './peerTransport';
import { QrScanner, type CameraProblem } from './QrScanner';
import { StatusLine } from './StatusLine';
import { SyncPreview } from './SyncPreview';

type Tab = 'scan' | 'code';

const FAILURES: Record<JoinFailure, string> = {
  'not-found': 'No device is waiting with that code. Check the digits; codes expire after 5 minutes and work once, so you may need a new one.',
  timeout: 'The other device didn’t respond within 15 seconds.',
  'bad-key': 'The code didn’t match, so the other device cancelled it. Get a new code there and try again.',
  declined: 'The other device chose not to send its data.',
  busy: 'That code is already being used by another device. Get a new code.',
  tampered: 'The data was altered on the way and was rejected. Nothing on this device was changed.',
  invalid: 'The data didn’t pass validation and was rejected. Nothing on this device was changed.',
  disconnected: 'The connection dropped. Nothing on this device was changed.',
  network: 'Couldn’t reach the pairing server. Check your connection and try again.',
  unsupported: 'This browser can’t make device-to-device connections. Try an up-to-date Chrome, Edge, Firefox or Safari.',
};
const RETRYABLE: ReadonlySet<JoinFailure> = new Set(['timeout', 'disconnected', 'network']);

const CAMERA_NOTICE: Record<CameraProblem, string> = {
  denied: 'Camera access is off, so enter the code instead.',
  'no-camera': 'No camera found, so enter the code instead.',
  unsupported: 'This browser can’t scan QR codes here, so enter the code instead.',
};

const formatTyping = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
};

const validate = (text: string): string | null => {
  const result = parseSyncPayload(text);
  return result.ok ? null : result.error;
};

/** "Receive on this device": scan the QR or type the code, then review a preview before applying. */
export const JoinPanel = ({ onDone }: { onDone: () => void }) => {
  const [tab, setTab] = useState<Tab>('scan');
  const [notice, setNotice] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pairing, setPairing] = useState<JoinPairing | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<JoinState | null>(null);
  const [preview, setPreview] = useState<{ data: FinanceData; sentAt: string | null } | null>(null);

  useEffect(() => {
    if (!pairing) return;
    const session = startJoinSession({
      transport: createPeerJoinTransport(),
      pairing,
      onState: (next) => {
        if (next.phase === 'received') {
          const parsed = parseSyncPayload(next.text);
          if (parsed.ok) setPreview({ data: parsed.data, sentAt: parsed.exportedAt });
          else setState({ phase: 'error', reason: 'invalid', detail: parsed.error });
          return;
        }
        setState(next);
      },
      validate,
      maxCiphertextChars: MAX_SYNC_CIPHERTEXT_CHARS,
    });
    return () => session.close();
  }, [pairing, attempt]);

  const reset = (): void => {
    setPairing(null);
    setState(null);
    setPreview(null);
  };

  const submitCode = (event: FormEvent): void => {
    event.preventDefault();
    const normalized = normalizePairingCode(code);
    if (!normalized) return setCodeError('Enter the 6-digit code shown on your other device.');
    setCodeError(null);
    setPairing({ method: 'code', code: normalized });
  };

  if (preview) return <SyncPreview incoming={preview.data} sentAt={preview.sentAt} onCancel={onDone} onApplied={onDone} />;

  if (pairing && state) {
    if (state.phase === 'error') {
      return (
        <div className="space-y-4 py-4 text-center">
          <StatusLine tone="error">{FAILURES[state.reason]}</StatusLine>
          {state.detail && <p className="text-xs break-words text-muted">{state.detail}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={reset}>{pairing.method === 'qr' ? 'Scan again' : 'Enter a different code'}</Button>
            {RETRYABLE.has(state.reason) && (
              <Button variant="primary" icon={<RotateCcw className="size-4" />} onClick={() => setAttempt((n) => n + 1)}>
                Retry
              </Button>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-3 py-6">
        {state.phase === 'receiving' ? (
          <>
            <StatusLine tone="busy">Receiving encrypted data…</StatusLine>
            <ProgressBar value={state.total ? state.received / state.total : 0} />
          </>
        ) : (
          <StatusLine tone="busy">
            {state.phase === 'connecting'
              ? 'Connecting to your other device…'
              : state.phase === 'verifying'
                ? 'Connected. Checking the code…'
                : 'Code verified. Waiting for the other device to tap “Send my data”…'}
          </StatusLine>
        )}
        <div className="text-center">
          <Button size="sm" variant="ghost" onClick={reset}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Segmented<Tab>
          label="How to pair"
          value={tab}
          onChange={(next) => {
            setTab(next);
            setNotice(null);
          }}
          options={[
            { value: 'scan', label: 'Scan QR' },
            { value: 'code', label: 'Enter code' },
          ]}
        />
      </div>
      {tab === 'scan' ? (
        <QrScanner
          onScan={(qr) => setPairing({ method: 'qr', code: qr.code, key: qr.key })}
          onProblem={(problem) => {
            setNotice(CAMERA_NOTICE[problem]);
            setTab('code');
          }}
        />
      ) : (
        <form onSubmit={submitCode} className="space-y-3" noValidate>
          {notice && (
            <p className="flex items-center gap-2 rounded-xl bg-zinc-50 p-3 text-xs text-muted dark:bg-ink-850" role="status">
              <Camera className="size-4 shrink-0" aria-hidden /> {notice}
            </p>
          )}
          <label htmlFor="sync-code" className="block text-center text-xs font-medium text-zinc-600 dark:text-zinc-400">
            6-digit code from your other device
          </label>
          <Input
            id="sync-code"
            data-autofocus
            value={code}
            onChange={(e) => {
              setCode(formatTyping(e.target.value));
              setCodeError(null);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            enterKeyHint="go"
            maxLength={7}
            placeholder="000-000"
            aria-invalid={codeError ? true : undefined}
            aria-describedby={codeError ? 'sync-code-error' : undefined}
            className="mx-auto max-w-48 text-center font-mono text-2xl tracking-[0.15em] tabular"
          />
          {codeError && (
            <p id="sync-code-error" className="text-center text-xs text-red-700 dark:text-red-400">
              {codeError}
            </p>
          )}
          <div className="text-center">
            <Button type="submit" variant="primary" icon={<Link2 className="size-4" />}>
              Connect
            </Button>
          </div>
        </form>
      )}
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <KeyRound className="size-3.5 shrink-0" aria-hidden /> On the other device, open Sync devices and choose Send.
      </p>
    </div>
  );
};
