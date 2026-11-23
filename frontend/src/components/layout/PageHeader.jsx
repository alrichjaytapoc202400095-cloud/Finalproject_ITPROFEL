import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';

// Route-level page heading with a thumb-sized back control.
export default function PageHeader({ title, subtitle, backTo, backLabel = 'Go back', action, eyebrow }) {
  const navigate = useNavigate();

  function goBack() {
    if (backTo) navigate(backTo);
    else if (window.history.length > 1) navigate(-1);
    else navigate('/');
  }

  return (
    <header className="page-header">
      <div className="page-header__row">
        <button type="button" className="icon-btn" aria-label={backLabel} onClick={goBack}>
          <Icon name="arrowLeft" />
        </button>
        <div className="page-header__titles">
          {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
        </div>
        {action || <span className="page-header__spacer" aria-hidden="true" />}
      </div>
      {subtitle && <p className="page-header__subtitle muted">{subtitle}</p>}
    </header>
  );
}
