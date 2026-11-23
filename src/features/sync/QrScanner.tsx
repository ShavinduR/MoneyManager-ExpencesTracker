import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Camera, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { parseQrText, type QrPairing } from '@/lib/sync/protocol';

export type CameraProblem = 'denied' | 'no-camera' | 'unsupported';

type Decoder = (video: HTMLVideoElement) => Promise<string | null>;

/** Native BarcodeDetector where available; jsQR (lazy chunk) everywhere else. */
const createDecoder = async (): Promise<Decoder> => {
  const Native = window.BarcodeDetector;
  if (Native) {
    const formats = await Native.getSupportedFormats().catch((): string[] => []);
    if (formats.includes('qr_code')) {
      const detector = new Native({ formats: ['qr_code'] });
      return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
    }
  }
  const { default: jsQR } = await import('jsqr');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    if (!context || !video.videoWidth) return null;
    const scale = Math.min(1, 640 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  };
};

const stopStream = (stream: MediaStream | null): void => stream?.getTracks().forEach((track) => track.stop());

const problemOf = (error: unknown): CameraProblem => {
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) return 'denied';
  if (error instanceof DOMException && (error.name === 'NotFoundError' || error.name === 'OverconstrainedError')) return 'no-camera';
  return 'unsupported';
};

/**
 * Rear-camera QR scanner. The camera is released (every track stopped) the moment a sync code is
 * read, and on unmount (tab switch or modal close), on error, and while the page is hidden.
 */
export const QrScanner = ({ onScan, onProblem }: { onScan: (pairing: QrPairing) => void; onProblem: (problem: CameraProblem) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'paused'>('starting');
  const [foreign, setForeign] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ onScan, onProblem });
  useLayoutEffect(() => {
    callbacks.current = { onScan, onProblem };
  }, [onScan, onProblem]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    const video = videoRef.current;

    const release = (): void => {
      stopped = true;
      window.clearTimeout(timer);
      stopStream(stream);
      stream = null;
      if (video) video.srcObject = null;
    };

    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') {
        release();
        setStatus('paused');
      }
    };

    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return callbacks.current.onProblem('unsupported');
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped || !video) return stopStream(media);
        stream = media;
        video.srcObject = media;
        await video.play();
        const decode = await createDecoder();
        if (stopped) return;
        setStatus('scanning');
        const tick = async (): Promise<void> => {
          if (stopped) return;
          const text = await decode(video).catch(() => null);
          if (stopped) return;
          const pairing = text ? parseQrText(text) : null;
          if (pairing) {
            release(); // stop the camera immediately on a successful scan
            callbacks.current.onScan(pairing);
            return;
          }
          if (text) setForeign(true);
          timer = window.setTimeout(() => void tick(), 180);
        };
        void tick();
      } catch (error) {
        const cancelled = stopped;
        release();
        if (!cancelled) callbacks.current.onProblem(problemOf(error));
      }
    })();

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      release();
    };
  }, [attempt]);

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-64 overflow-hidden rounded-2xl bg-zinc-900">
        <video ref={videoRef} className="size-full object-cover" muted playsInline aria-label="Camera preview for scanning the sync QR code" />
        <div aria-hidden className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/70" />
        {status !== 'scanning' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900/80 text-sm text-white">
            <Camera className="size-5" aria-hidden />
            {status === 'starting' ? 'Starting camera…' : 'Camera paused'}
            {status === 'paused' && (
              <Button size="sm" onClick={() => { setStatus('starting'); setAttempt((n) => n + 1); }}>
                Resume
              </Button>
            )}
          </div>
        )}
      </div>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted" role="status">
        <ScanLine className="size-3.5 shrink-0" aria-hidden />
        {foreign ? 'That QR code isn’t a planner sync code. Point at the code on your other device.' : 'Point the camera at the QR code on your other device.'}
      </p>
    </div>
  );
};
