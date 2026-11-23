// Small, dependency-free icon set (inline SVG). Decorative by default:
// every icon is aria-hidden, and the interactive parent supplies the label.
const PATHS = {
  home: (
    <>
      <path d="M3 10.8 12 3l9 7.8" />
      <path d="M5.4 9.6V21h13.2V9.6" />
      <path d="M9.6 21v-6.2h4.8V21" />
    </>
  ),
  shop: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5l1.9 4.9 4.9 1.9-4.9 1.9L12 17.1l-1.9-4.9-4.9-1.9 4.9-1.9L12 3.5Z" />
      <path d="M18.6 15.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
    </>
  ),
  bag: (
    <>
      <path d="M5.5 8h13l-1.1 12.2a1 1 0 0 1-1 .8H7.6a1 1 0 0 1-1-.8L5.5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.5c.6-3.7 3.6-5.6 7.5-5.6s6.9 1.9 7.5 5.6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 19 6v5.9c0 4.5-2.9 7.5-7 9.1-4.1-1.6-7-4.6-7-9.1V6l7-2.8Z" />
      <path d="m9.2 12 2 2 3.7-4" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8v-17Z" />
      <path d="M9 8h6M9 11.5h6M9 15h4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.7" />
      <path d="m16.2 16.2 4.3 4.3" />
    </>
  ),
  arrowLeft: <path d="M14.5 18.5 8 12l6.5-6.5" />,
  chevronRight: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M9.5 7V4.5h5V7" />
      <path d="M6.5 7 7.6 20a1 1 0 0 0 1 .9h6.8a1 1 0 0 0 1-.9L17.5 7" />
      <path d="M10 10.5v6M14 10.5v6" />
    </>
  ),
  filter: <path d="M4 6.5h16M7 12h10M10 17.5h4" />,
  check: <path d="m5 13 4.2 4.2L19 7" />,
  alert: (
    <>
      <path d="M12 3.8 21 20H3L12 3.8Z" />
      <path d="M12 9.5v4.5M12 17.2v.1" />
    </>
  ),
  wifiOff: (
    <>
      <path d="M3 9.5a15.5 15.5 0 0 1 4-2.5M10.2 6.4a15.6 15.6 0 0 1 10.8 3.1M6.2 13a10.6 10.6 0 0 1 3.3-1.6M14.5 11.4a10.6 10.6 0 0 1 3.3 1.6M9.2 16.4a5.4 5.4 0 0 1 5.6 0" />
      <path d="M12 20h.01M4 4l16 16" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20.5 4.5V10h-5.5" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6.5h11v10H3zM14 9.5h4l2.5 3v4H14z" />
      <circle cx="7" cy="18.5" r="1.8" />
      <circle cx="17.5" cy="18.5" r="1.8" />
    </>
  ),
  store: (
    <>
      <path d="M4 9.5 5 4h14l1 5.5" />
      <path d="M4 9.5a2.4 2.4 0 0 0 4 1.6 2.4 2.4 0 0 0 4 0 2.4 2.4 0 0 0 4 0 2.4 2.4 0 0 0 4-1.6" />
      <path d="M5.5 12.5V21h13v-8.5M10 21v-5h4v5" />
    </>
  ),
  card: (
    <>
      <rect x="2.8" y="5.5" width="18.4" height="13" rx="2.4" />
      <path d="M2.8 9.5h18.4M6.5 14.5h3.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l16 16M9.5 9.6A2.8 2.8 0 0 0 12 14.8c.8 0 1.5-.3 2-.8M6.3 6.5A14 14 0 0 0 2.8 12S6.2 18.2 12 18.2c1.6 0 3-.4 4.2-1M10.2 5.9A10.7 10.7 0 0 1 12 5.8c5.8 0 9.2 6.2 9.2 6.2a17 17 0 0 1-2.5 3.2" />
    </>
  ),
  logout: (
    <>
      <path d="M14.5 12H4M8 8l-4 4 4 4" />
      <path d="M14 4.5h6.5v15H14" />
    </>
  ),
  tag: (
    <>
      <path d="m20 12.2-2 7.3-7.3 2-7.3-7.3 2-7.3 7.3-2 7.3 7.3Z" />
      <path d="M8.2 9.2h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5c-1.8-1.4-4-2-6.5-2v13c2.5 0 4.7.6 6.5 2 1.8-1.4 4-2 6.5-2v-13c-2.5 0-4.7.6-6.5 2Z" />
      <path d="M12 6.5v13" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.2" r="3.1" />
      <path d="M3.5 19.5c.5-3 2.8-4.6 5.5-4.6s5 1.6 5.5 4.6" />
      <path d="M15.5 5.6a3.1 3.1 0 0 1 0 5.9M17 15.2c2.1.4 3.4 1.8 3.8 4.3" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </>
  ),
  arrowRight: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
};

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.8 }) {
  const content = PATHS[name];
  if (!content) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {content}
    </svg>
  );
}
