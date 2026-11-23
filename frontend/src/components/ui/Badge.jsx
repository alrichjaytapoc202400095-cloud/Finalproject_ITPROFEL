import { ORDER_STATUS } from '../../utils/constants.js';

// Small status pill used for stock, order state and AI source labels.
export default function Badge({ tone = 'muted', children, className = '' }) {
  return <span className={`badge badge--${tone} ${className}`.trim()}>{children}</span>;
}

export function OrderStatusBadge({ status }) {
  const meta = ORDER_STATUS[status] || { label: status || 'Unknown', tone: 'muted' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
