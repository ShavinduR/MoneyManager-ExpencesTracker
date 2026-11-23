/**
 * Cross-tab change notifications (audit finding H2). When one tab saves, every other tab reloads
 * from storage before its next write, so a stale tab can't overwrite newer data.
 * BroadcastChannel where available; a localStorage "ping" event otherwise.
 */
const CHANNEL = 'mfp-sync';
const PING_KEY = 'mfp-sync-ping';

type SyncMessage = { type: 'changed'; from: string };

const isSyncMessage = (value: unknown): value is SyncMessage =>
  typeof value === 'object' && value !== null && 'type' in value && value.type === 'changed' && 'from' in value && typeof value.from === 'string';

export type SyncHandle = { notify: () => void };

export const startCrossTabSync = (onRemoteChange: () => void): SyncHandle => {
  const tabId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random());
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

  if (channel) {
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (isSyncMessage(event.data) && event.data.from !== tabId) onRemoteChange();
    };
  } else if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === PING_KEY) onRemoteChange();
    });
  }

  return {
    notify: () => {
      const message: SyncMessage = { type: 'changed', from: tabId };
      if (channel) channel.postMessage(message);
      else {
        try {
          localStorage.setItem(PING_KEY, `${tabId}:${Date.now()}`);
        } catch {
          /* no cross-tab channel available */
        }
      }
    },
  };
};
