import { TransportError, type Channel, type HostTransport, type JoinTransport } from './session';
import type { HostMessage, JoinMessage } from './protocol';

/**
 * In-memory stand-in for the signalling server + DataChannel, used by tests. Messages are
 * structured-cloned and delivered asynchronously, like a real network. `intercept` lets a test play
 * a man-in-the-middle that rewrites traffic.
 */
export type Intercept = (message: HostMessage | JoinMessage, from: 'host' | 'join') => unknown;

export const createMemoryNetwork = (intercept: Intercept = (m) => m) => {
  const rooms = new Map<string, (channel: Channel) => void>();

  const pair = (): [Channel, Channel] => {
    type End = { listeners: ((m: unknown) => void)[]; closers: (() => void)[]; closed: boolean };
    const a: End = { listeners: [], closers: [], closed: false };
    const b: End = { listeners: [], closers: [], closed: false };
    const make = (self: End, other: End, from: 'host' | 'join'): Channel => ({
      send: (message) => {
        if (self.closed) return;
        const wire = structuredClone(intercept(message, from));
        queueMicrotask(() => {
          if (!other.closed) other.listeners.forEach((l) => l(wire));
        });
      },
      onMessage: (l) => void self.listeners.push(l),
      onClose: (l) => void self.closers.push(l),
      close: () => {
        if (self.closed) return;
        self.closed = true;
        // PeerJS fires the local close event synchronously.
        self.closers.forEach((l) => l());
        // Like a flushed DataChannel close: messages already sent are delivered first.
        queueMicrotask(() => {
          if (other.closed) return;
          other.closed = true;
          other.closers.forEach((l) => l());
        });
      },
    });
    return [make(a, b, 'host'), make(b, a, 'join')];
  };

  const host = (): HostTransport => {
    let room: string | null = null;
    return {
      listen: async (roomId, onChannel) => {
        if (rooms.has(roomId)) throw new TransportError('id-taken');
        room = roomId;
        rooms.set(roomId, onChannel);
      },
      stopListening: () => {
        if (room) rooms.delete(room);
      },
      destroy: () => {
        if (room) rooms.delete(room);
      },
    };
  };

  const join = (): JoinTransport => ({
    connect: async (roomId) => {
      const accept = rooms.get(roomId);
      if (!accept) throw new TransportError('peer-unavailable');
      const [hostEnd, joinEnd] = pair();
      queueMicrotask(() => accept(hostEnd));
      return joinEnd;
    },
    destroy: () => {},
  });

  return { host, join, rooms };
};
