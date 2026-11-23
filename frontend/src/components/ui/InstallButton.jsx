import { useInstallPrompt } from '../../hooks/useInstallPrompt.js';
import { useToast } from '../../context/ToastContext.jsx';
import Icon from './Icon.jsx';

// Offers the native install prompt only when the browser says it is available.
export default function InstallButton({ compact = false }) {
  const { canInstall, promptInstall } = useInstallPrompt();
  const { notify } = useToast();

  if (!canInstall) return null;

  async function handleClick() {
    const accepted = await promptInstall();
    notify(accepted ? 'Installing SPC Book Store…' : 'Installation dismissed.', {
      tone: accepted ? 'success' : 'info',
    });
  }

  return (
    <button
      type="button"
      className={compact ? 'icon-btn' : 'btn btn--secondary'}
      onClick={handleClick}
      aria-label="Install SPC Book Store app"
      title="Install app"
    >
      <Icon name="plus" size={compact ? 20 : 18} />
      {!compact && <span>Install app</span>}
    </button>
  );
}
