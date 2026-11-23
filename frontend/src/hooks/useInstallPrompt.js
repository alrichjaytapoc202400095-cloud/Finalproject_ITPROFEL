import { useCallback, useEffect, useState } from 'react';

function detectStandalone() {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return Boolean(media || window.navigator.standalone);
}

// Captures the install prompt so the app can offer "Install app" at the right moment.
export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(detectStandalone);

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!promptEvent) return false;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => ({ outcome: 'dismissed' }));
    setPromptEvent(null);
    return choice.outcome === 'accepted';
  }, [promptEvent]);

  return { canInstall: Boolean(promptEvent) && !installed, installed, promptInstall };
}
