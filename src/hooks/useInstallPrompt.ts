import { useEffect, useState } from 'react';

/** Chromium's install prompt event (not in lib.dom). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const isInstallEvent = (event: Event): event is BeforeInstallPromptEvent => 'prompt' in event && 'userChoice' in event;

export const useInstallPrompt = () => {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches);

  useEffect(() => {
    const onPrompt = (e: Event): void => {
      if (!isInstallEvent(e)) return;
      e.preventDefault();
      setEvent(e);
    };
    const onInstalled = (): void => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async (): Promise<void> => {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setEvent(null);
  };

  return { canInstall: event !== null, installed, install };
};
