import { useNetworkStatus } from '../../context/NetworkStatusContext.jsx';
import Icon from '../ui/Icon.jsx';

// Persistent, non-blocking connectivity banner. While offline the catalog and
// saved cart stay browsable; network actions are disabled on each screen.
export default function OfflineBanner() {
  const { online, reconnectedAt } = useNetworkStatus();

  if (!online) {
    return (
      <div className="offline-banner offline-banner--offline" role="status">
        <Icon name="wifiOff" size={17} />
        <span>
          <strong>Offline mode.</strong> Browse cached books and your saved cart. Checkout, payment and AI are paused.
        </span>
      </div>
    );
  }

  if (reconnectedAt) {
    return (
      <div className="offline-banner offline-banner--online" role="status">
        <Icon name="check" size={17} />
        <span>
          <strong>Back online.</strong> Live prices, stock and checkout are available again.
        </span>
      </div>
    );
  }

  return null;
}
