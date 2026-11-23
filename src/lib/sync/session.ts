import {
  decryptText,
  deriveKeyFromCode,
  encryptText,
  fromBase64Url,
  generatePairingCode,
  generateRawKey,
  importAesKey,
  PBKDF2_ITERATIONS,
  randomBytes,
  roomIdForCode,
  SALT_BYTES,
  toBase64Url,
} from './crypto';
import {
  buildQrText,
  chunkText,
  parseHostMessage,
  parseJoinMessage,
  proofText,
  PROTOCOL_VERSION,
  type HostMessage,
  type JoinMessage,
  type PairingMethod,
} from './protocol';

// ---------- Transport contract (PeerJS in the app, an in-memory pair in tests) ----------

export type Channel = {
  send: (message: HostMessage | JoinMessage) => void;
  onMessage: (listener: (message: unknown) => void) => void;
  onClose: (listener: () => void) => void;
  close: () => void;
};

export type TransportErrorKind = 'peer-unavailable' | 'id-taken' | 'network' | 'unsupported';
export class TransportError extends Error {
  constructor(readonly kind: TransportErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'TransportError';
  }
}

export type HostTransport = {
  /** Register `roomId` with the signalling server; resolves once reachable. */
  listen: (roomId: string, onChannel: (channel: Channel) => void, onError: (error: TransportError) => void) => Promise<void>;
  /** Stop accepting new connections; keeps open channels. */
  stopListening: () => void;
  destroy: () => void;
};

export type JoinTransport = {
  connect: (roomId: string) => Promise<Channel>;
  destroy: () => void;
};

export const SESSION_TTL_MS = 5 * 60_000;
export const CONNECT_TIMEOUT_MS = 15_000;
/** How long the receiver waits for the sender to tap "Send". */
export const APPROVAL_TIMEOUT_MS = 2 * 60_000;

type Timers = { set: (fn: () => void, ms: number) => number; clear: (id: number) => void };
const defaultTimers: Timers = { set: (fn, ms) => window.setTimeout(fn, ms), clear: (id) => window.clearTimeout(id) };

// ---------- Host (sends this device's data) ----------

/** `code-taken`: another session already holds this room (1 in a million); the UI just regenerates. */
export type HostFailure = 'network' | 'code-taken' | 'bad-key' | 'disconnected' | 'rejected' | 'unsupported';
export type HostState =
  | { phase: 'preparing' }
  | { phase: 'waiting'; code: string; qrText: string; expiresAt: number }
  | { phase: 'confirm'; method: PairingMethod; expiresAt: number }
  | { phase: 'sending'; sent: number; total: number }
  | { phase: 'done' }
  | { phase: 'declined' }
  | { phase: 'expired' }
  | { phase: 'error'; reason: HostFailure };

export type HostSession = { approve: () => void; decline: () => void; close: () => void };

type HostOptions = {
  transport: HostTransport;
  /** Plaintext to send (a JSON backup); read when the user approves so it is current. */
  getPayload: () => string;
  onState: (state: HostState) => void;
  iterations?: number;
  timers?: Timers;
  now?: () => number;
};

export const startHostSession = ({
  transport,
  getPayload,
  onState,
  iterations = PBKDF2_ITERATIONS,
  timers = defaultTimers,
  now = Date.now,
}: HostOptions): HostSession => {
  let state: HostState = { phase: 'preparing' };
  let channel: Channel | null = null;
  let activeKey: CryptoKey | null = null;
  let expiryTimer = 0;
  let finished = false;

  const set = (next: HostState): void => {
    if (finished) return;
    state = next;
    onState(next);
  };
  /** Idempotent teardown: closing a channel fires its close event, which must not re-enter. */
  const teardown = (): void => {
    if (finished) return;
    finished = true;
    timers.clear(expiryTimer);
    channel?.close();
    transport.destroy();
  };
  const finish = (next: HostState): void => {
    set(next);
    teardown();
  };

  const code = generatePairingCode();
  const rawKey = generateRawKey();
  const salt = toBase64Url(randomBytes(SALT_BYTES));
  const expiresAt = now() + SESSION_TTL_MS;
  onState(state);

  const onChannel = (incoming: Channel, keys: { code: CryptoKey; qr: CryptoKey }): void => {
    if (channel || finished) {
      // One connection per code.
      incoming.send({ t: 'busy' });
      incoming.close();
      return;
    }
    channel = incoming;
    transport.stopListening();
    incoming.onClose(() => {
      if (state.phase === 'confirm' || state.phase === 'sending') finish({ phase: 'error', reason: 'disconnected' });
    });
    incoming.onMessage((raw) => {
      void handle(parseJoinMessage(raw), keys);
    });
    incoming.send({ t: 'welcome', v: PROTOCOL_VERSION, salt });
  };

  const handle = async (message: JoinMessage | null, keys: { code: CryptoKey; qr: CryptoKey }): Promise<void> => {
    if (finished || !channel) return;
    if (!message) return finish({ phase: 'error', reason: 'bad-key' });
    switch (message.t) {
      case 'hello': {
        if (state.phase !== 'waiting') return;
        const key = message.method === 'qr' ? keys.qr : keys.code;
        const verified = await decryptText(key, message.proof, 'hello').then(
          (text) => text === proofText(salt),
          () => false,
        );
        if (!verified) {
          // Wrong key or tampering: burn this code so it can't be guessed at again.
          channel.send({ t: 'bad-key' });
          return finish({ phase: 'error', reason: 'bad-key' });
        }
        activeKey = key;
        channel.send({ t: 'accepted' });
        set({ phase: 'confirm', method: message.method, expiresAt });
        return;
      }
      case 'ack':
        if (state.phase !== 'sending') return;
        return finish(message.ok ? { phase: 'done' } : { phase: 'error', reason: 'rejected' });
    }
  };

  const approve = (): void => {
    void (async () => {
      if (state.phase !== 'confirm' || !channel || !activeKey) return;
      timers.clear(expiryTimer);
      const { iv, ct } = await encryptText(activeKey, getPayload(), 'payload');
      const chunks = chunkText(ct);
      set({ phase: 'sending', sent: 0, total: chunks.length });
      channel.send({ t: 'meta', iv, chunks: chunks.length, length: ct.length });
      chunks.forEach((data, i) => {
        channel?.send({ t: 'chunk', i, data });
        set({ phase: 'sending', sent: i + 1, total: chunks.length });
      });
    })().catch(() => finish({ phase: 'error', reason: 'disconnected' }));
  };

  void (async () => {
    try {
      const [codeKey, qrKey, roomId] = await Promise.all([deriveKeyFromCode(code, fromBase64Url(salt), iterations), importAesKey(rawKey), roomIdForCode(code)]);
      if (finished) return;
      await transport.listen(
        roomId,
        (incoming) => onChannel(incoming, { code: codeKey, qr: qrKey }),
        (error) => {
          if (state.phase === 'waiting' || state.phase === 'preparing') finish({ phase: 'error', reason: error.kind === 'unsupported' ? 'unsupported' : 'network' });
        },
      );
      if (finished) return;
      set({ phase: 'waiting', code, qrText: buildQrText({ code, key: toBase64Url(rawKey) }), expiresAt });
      expiryTimer = timers.set(() => {
        if (state.phase === 'waiting' || state.phase === 'confirm') finish({ phase: 'expired' });
      }, Math.max(0, expiresAt - now()));
    } catch (error) {
      const kind = error instanceof TransportError ? error.kind : 'network';
      finish({ phase: 'error', reason: kind === 'unsupported' ? 'unsupported' : kind === 'id-taken' ? 'code-taken' : 'network' });
    }
  })();

  return {
    approve,
    decline: () => {
      if (state.phase !== 'confirm') return;
      channel?.send({ t: 'declined' });
      finish({ phase: 'declined' });
    },
    close: teardown,
  };
};

// ---------- Joiner (receives data) ----------

export type JoinPairing = { method: 'code'; code: string } | { method: 'qr'; code: string; key: string };

export type JoinFailure = 'not-found' | 'timeout' | 'bad-key' | 'declined' | 'busy' | 'tampered' | 'invalid' | 'disconnected' | 'network' | 'unsupported';
export type JoinState =
  | { phase: 'connecting' }
  | { phase: 'verifying' }
  | { phase: 'awaiting-approval' }
  | { phase: 'receiving'; received: number; total: number }
  | { phase: 'received'; text: string }
  | { phase: 'error'; reason: JoinFailure; detail?: string };

type JoinOptions = {
  transport: JoinTransport;
  pairing: JoinPairing;
  onState: (state: JoinState) => void;
  /** Validates the decrypted payload; an error string rejects it (and tells the sender). */
  validate: (text: string) => string | null;
  maxCiphertextChars: number;
  iterations?: number;
  timers?: Timers;
};

export const startJoinSession = ({
  transport,
  pairing,
  onState,
  validate,
  maxCiphertextChars,
  iterations = PBKDF2_ITERATIONS,
  timers = defaultTimers,
}: JoinOptions): { close: () => void } => {
  let state: JoinState = { phase: 'connecting' };
  let channel: Channel | null = null;
  let key: CryptoKey | null = null;
  let timer = 0;
  let finished = false;
  let incoming: { iv: string; total: number; length: number; received: number; parts: string[] } | null = null;

  const set = (next: JoinState): void => {
    if (finished) return;
    state = next;
    onState(next);
  };
  const arm = (ms: number): void => {
    timers.clear(timer);
    timer = timers.set(() => fail('timeout'), ms);
  };
  const stop = (): void => {
    if (finished) return;
    finished = true;
    timers.clear(timer);
    channel?.close();
    transport.destroy();
  };
  const fail = (reason: JoinFailure, detail?: string): void => {
    set({ phase: 'error', reason, detail });
    stop();
  };

  const handle = async (message: HostMessage | null): Promise<void> => {
    if (finished || !channel) return;
    if (!message) return fail('tampered');
    switch (message.t) {
      case 'welcome': {
        if (state.phase !== 'connecting') return;
        set({ phase: 'verifying' });
        key =
          pairing.method === 'qr'
            ? await importAesKey(fromBase64Url(pairing.key))
            : await deriveKeyFromCode(pairing.code, fromBase64Url(message.salt), iterations);
        if (finished) return;
        const proof = await encryptText(key, proofText(message.salt), 'hello');
        channel.send({ t: 'hello', v: PROTOCOL_VERSION, method: pairing.method, proof });
        arm(CONNECT_TIMEOUT_MS);
        return;
      }
      case 'accepted':
        if (state.phase !== 'verifying') return;
        set({ phase: 'awaiting-approval' });
        arm(APPROVAL_TIMEOUT_MS);
        return;
      case 'meta':
        if (state.phase !== 'awaiting-approval') return;
        if (message.length > maxCiphertextChars) return fail('invalid', 'The data is larger than the 5 MB limit.');
        incoming = { iv: message.iv, total: message.chunks, length: message.length, received: 0, parts: [] };
        set({ phase: 'receiving', received: 0, total: message.chunks });
        arm(CONNECT_TIMEOUT_MS);
        return;
      case 'chunk': {
        if (state.phase !== 'receiving' || !incoming) return;
        if (message.i !== incoming.parts.length || incoming.parts.length >= incoming.total) return fail('tampered');
        incoming.received += message.data.length;
        if (incoming.received > incoming.length) return fail('tampered');
        incoming.parts.push(message.data);
        arm(CONNECT_TIMEOUT_MS);
        set({ phase: 'receiving', received: incoming.parts.length, total: incoming.total });
        if (incoming.parts.length < incoming.total) return;
        const ct = incoming.parts.join('');
        if (ct.length !== incoming.length || !key) return fail('tampered');
        timers.clear(timer);
        let text: string;
        try {
          text = await decryptText(key, { iv: incoming.iv, ct }, 'payload');
        } catch {
          channel.send({ t: 'ack', ok: false });
          return fail('tampered');
        }
        const problem = validate(text);
        channel.send({ t: 'ack', ok: problem === null });
        if (problem !== null) return fail('invalid', problem);
        set({ phase: 'received', text });
        // Transfer complete: close the connection; the preview is applied (or not) locally.
        stop();
        return;
      }
      case 'declined':
        return fail('declined');
      case 'bad-key':
        return fail('bad-key');
      case 'busy':
        return fail('busy');
    }
  };

  onState(state);
  arm(CONNECT_TIMEOUT_MS);
  void (async () => {
    try {
      const roomId = await roomIdForCode(pairing.code);
      const opened = await transport.connect(roomId);
      if (finished) {
        opened.close();
        return;
      }
      channel = opened;
      opened.onMessage((raw) => {
        void handle(parseHostMessage(raw)).catch(() => fail('tampered'));
      });
      opened.onClose(() => {
        if (!finished && state.phase !== 'received') fail('disconnected');
      });
    } catch (error) {
      if (error instanceof TransportError) {
        fail(error.kind === 'peer-unavailable' ? 'not-found' : error.kind === 'unsupported' ? 'unsupported' : 'network');
      } else fail('network');
    }
  })();

  return { close: stop };
};
