/** Ambient typings the bundled DOM lib does not include yet. */

type DetectedBarcode = { rawValue: string };

type BarcodeDetectorInstance = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> };

type BarcodeDetectorConstructor = {
  new (options?: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats: () => Promise<string[]>;
};

interface Window {
  /** Shape Detection API (Chrome/Edge on Android and desktop, Safari 17+). Absent elsewhere: fall back to jsQR. */
  BarcodeDetector?: BarcodeDetectorConstructor;
}

interface ImportMetaEnv {
  readonly VITE_PEERJS_HOST?: string;
  readonly VITE_PEERJS_PORT?: string;
  readonly VITE_PEERJS_PATH?: string;
  readonly VITE_PEERJS_SECURE?: string;
  readonly VITE_PEERJS_KEY?: string;
}
