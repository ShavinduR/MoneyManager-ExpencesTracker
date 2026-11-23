import { Peer, type DataConnection, type PeerOptions } from 'peerjs';
import { TransportError, type Channel, type HostTransport, type JoinTransport, type TransportErrorKind } from '@/lib/sync/session';
import { randomBytes, toBase64Url } from '@/lib/sync/crypto';

/**
 * PeerJS adapter. The signalling server only brokers the WebRTC handshake: it sees two random room
 * ids, never the pairing code, key or data (everything is AES-GCM encrypted before it is sent).
 *
 * Defaults to the free PeerJS cloud server. Self-host with `npx peerjs --port 9000` and set the
 * VITE_PEERJS_* variables; then update `connect-src` in vercel.json to match.
 */
const env = import.meta.env;
const parsePort = (value: string | undefined): number => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : 443;
};

export const peerOptions = (): PeerOptions => ({
  host: env.VITE_PEERJS_HOST || '0.peerjs.com',
  port: parsePort(env.VITE_PEERJS_PORT),
  path: env.VITE_PEERJS_PATH || '/',
  secure: env.VITE_PEERJS_SECURE !== 'false',
  key: env.VITE_PEERJS_KEY || 'peerjs',
  debug: 0,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // Relay fallback for networks where direct connections fail (e.g. mobile carrier-grade NAT).
      // Relayed traffic is still end-to-end encrypted by the app.
      { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
    ],
  },
});

const kindOf = (type: string): TransportErrorKind => {
  switch (type) {
    case 'peer-unavailable':
      return 'peer-unavailable';
    case 'unavailable-id':
      return 'id-taken';
    case 'browser-incompatible':
      return 'unsupported';
    default:
      return 'network';
  }
};

const toChannel = (conn: DataConnection): Channel => ({
  send: (message) => void conn.send(message),
  onMessage: (listener) => void conn.on('data', listener),
  onClose: (listener) => {
    conn.on('close', listener);
    conn.on('error', listener);
  },
  // flush: deliver anything still buffered (e.g. the final ack) before closing.
  close: () => conn.close({ flush: true }),
});

const whenOpen = (conn: DataConnection): Promise<void> =>
  new Promise((resolve, reject) => {
    if (conn.open) return resolve();
    conn.once('open', () => resolve());
    conn.once('error', () => reject(new TransportError('network')));
  });

export const createPeerHostTransport = (): HostTransport => {
  let peer: Peer | null = null;
  return {
    listen: (roomId, onChannel, onError) =>
      new Promise((resolve, reject) => {
        const p = new Peer(roomId, peerOptions());
        peer = p;
        let opened = false;
        p.on('open', () => {
          opened = true;
          resolve();
        });
        p.on('connection', (conn) => {
          void whenOpen(conn).then(
            () => onChannel(toChannel(conn)),
            () => conn.close(),
          );
        });
        p.on('error', (error) => {
          const failure = new TransportError(kindOf(error.type), error.message);
          if (opened) onError(failure);
          else reject(failure);
        });
      }),
    stopListening: () => {
      // Leave the signalling server: nobody else can reach this room; the open DataChannel stays.
      if (peer && !peer.disconnected) peer.disconnect();
    },
    destroy: () => {
      peer?.destroy();
      peer = null;
    },
  };
};

export const createPeerJoinTransport = (): JoinTransport => {
  let peer: Peer | null = null;
  return {
    connect: (roomId) =>
      new Promise((resolve, reject) => {
        // Our own id is random so no request is needed to ask the server for one.
        const p = new Peer(`mfp-join-${toBase64Url(randomBytes(12)).replace(/[_-]/g, 'x')}`, peerOptions());
        peer = p;
        p.on('error', (error) => reject(new TransportError(kindOf(error.type), error.message)));
        p.on('open', () => {
          const conn = p.connect(roomId, { reliable: true, serialization: 'json' });
          whenOpen(conn).then(() => {
            p.disconnect(); // the DataChannel is up; signalling is no longer needed
            resolve(toChannel(conn));
          }, reject);
        });
      }),
    destroy: () => {
      peer?.destroy();
      peer = null;
    },
  };
};
