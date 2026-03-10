import type { CheckReservationStatus } from '@/mock/reservation-checks';

const config: Record<CheckReservationStatus, {
  label: string; color: string; bg: string; border: string; dot: string;
}> = {
  GREEN:   { label: 'OK',      color: 'var(--status-green)',   bg: 'var(--status-green-bg)',   border: 'var(--status-green-border)',   dot: 'var(--status-green)' },
  YELLOW:  { label: 'Warning', color: 'var(--status-yellow)',  bg: 'var(--status-yellow-bg)',  border: 'var(--status-yellow-border)',  dot: 'var(--status-yellow)' },
  RED:     { label: 'Issue',   color: 'var(--status-red)',     bg: 'var(--status-red-bg)',     border: 'var(--status-red-border)',     dot: 'var(--status-red)' },
  PENDING: { label: 'Pending', color: 'var(--status-pending)', bg: 'var(--status-pending-bg)', border: 'var(--status-pending-border)', dot: 'var(--status-pending)' },
  NONE:    { label: '—',       color: 'var(--fg-subtle)',      bg: 'var(--status-none-bg)',    border: 'var(--status-none-border)',    dot: 'var(--fg-subtle)' },
};

interface StatusBadgeProps {
  status: CheckReservationStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const c = config[status];
  const sm = size === 'sm';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: sm ? 4 : 5,
      padding: sm ? '2px 7px' : '3px 9px',
      borderRadius: 100,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      fontSize: sm ? 11 : 12,
      fontWeight: 500,
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
    }}>
      <span
        className={status === 'RED' ? 'status-dot-red' : undefined}
        style={{
          width: sm ? 5 : 6,
          height: sm ? 5 : 6,
          borderRadius: '50%',
          background: c.dot,
          flexShrink: 0,
        }}
      />
      {c.label}
    </span>
  );
}
