import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

const NetworkStatusContext = createContext({ online: true, offlineSince: null, reconnectedAt: null });

export function NetworkStatusProvider({ children }) {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);
  const [offlineSince, setOfflineSince] = useState(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? Date.now() : null
  );
  const [reconnectedAt, setReconnectedAt] = useState(null);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setOfflineSince((value) => value ?? Date.now());
      setReconnectedAt(null);
      return;
    }
    setOfflineSince(null);
    if (wasOffline.current) {
      wasOffline.current = false;
      setReconnectedAt(Date.now());
    }
  }, [online]);

  // "Back online" confirmation disappears on its own.
  useEffect(() => {
    if (!reconnectedAt) return undefined;
    const timer = setTimeout(() => setReconnectedAt(null), 4000);
    return () => clearTimeout(timer);
  }, [reconnectedAt]);

  return (
    <NetworkStatusContext.Provider value={{ online, offlineSince, reconnectedAt }}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export const useNetworkStatus = () => useContext(NetworkStatusContext);
