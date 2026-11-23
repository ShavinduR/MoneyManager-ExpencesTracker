import { useState } from 'react';
import { Lock, WifiOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Segmented } from '@/components/ui/Segmented';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUiStore } from '@/store/uiStore';
import { backupStats } from '@/data/backup';
import { HostPanel } from './HostPanel';
import { JoinPanel } from './JoinPanel';

type Mode = 'send' | 'receive';

/**
 * Device-to-device sync (lazy chunk: PeerJS + QR libraries load only when this opens).
 * Data goes directly between the two browsers over WebRTC, encrypted with AES-GCM by the app.
 */
const SyncModal = () => {
  const closeSync = useUiStore((s) => s.closeSync);
  const online = useOnlineStatus();
  // A device with no data is most likely the one receiving.
  const [mode, setMode] = useState<Mode>(() => (backupStats(useFinanceStore.getState().data).entries === 0 ? 'receive' : 'send'));

  return (
    <Modal open onClose={closeSync} title="Sync devices" description="Device to device, end-to-end encrypted. No account, nothing stored on a server.">
      <div className="mb-5 flex justify-center">
        <Segmented<Mode>
          label="Sync direction"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'send', label: 'Send from this device' },
            { value: 'receive', label: 'Receive here' },
          ]}
        />
      </div>
      {!online ? (
        <div className="space-y-2 py-8 text-center" role="status">
          <WifiOff className="mx-auto size-6 text-muted" aria-hidden />
          <p className="text-sm font-medium">Internet connection required to pair devices</p>
          <p className="text-xs text-muted">Both devices need to be online to find each other. Your data itself never goes to a server.</p>
        </div>
      ) : mode === 'send' ? (
        <HostPanel key="send" />
      ) : (
        <JoinPanel key="receive" onDone={closeSync} />
      )}
      <p className="mt-5 flex gap-2 border-t border-zinc-100 pt-3 text-[11px] leading-relaxed text-muted dark:border-ink-800">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          A pairing server only introduces the two devices. Everything is encrypted on this device before it leaves, codes expire after 5 minutes and work once, and nothing is applied until you review it.
        </span>
      </p>
    </Modal>
  );
};

export default SyncModal;
