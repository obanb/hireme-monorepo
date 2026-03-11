'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import type { CheckReservationBooking, CheckReservationStatus } from '@/types/reservation-check';

const ENDPOINT = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';

const ACTIONS_QUERY = `
  query DashboardActions($filter: ActionsFilter) {
    actions(filter: $filter, limit: 200) {
      items { id title description startDate endDate type { id name color } pdfUrl }
    }
  }
`;

const CHECKS_QUERY = `
  query {
    checkReservations(page: 1, limit: 500) {
      items {
        originId provider checkin checkout owner status paymentsStatus
      }
    }
  }
`;

const ARRIVALS_QUERY = `
  query DashboardArrivals {
    today:    arrivingGuests(filter: { period: today },    page: 1, limit: 200) { total totalGuests items { tier } }
    tomorrow: arrivingGuests(filter: { period: tomorrow }, page: 1, limit: 1   ) { total totalGuests }
    week:     arrivingGuests(filter: { period: days7 },    page: 1, limit: 1   ) { total totalGuests }
  }
`;

const statusOrder = { RED: 0, YELLOW: 1, PENDING: 2, GREEN: 3, NONE: 4 } as const;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

interface ArrivingGuestBrief { tier: number; }
interface PeriodStat { total: number; totalGuests: number; items?: ArrivingGuestBrief[]; }

interface ActionType { id: string; name: string; color: string; }
interface RunningAction { id: string; title: string; description: string | null; startDate: string; endDate: string; type: ActionType; pdfUrl: string | null; }

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, sub }: {
  label: string; value: number | string; color?: string; sub?: string;
}) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 9,
      border: '1px solid var(--border)', padding: '14px 16px',
      borderTop: `3px solid ${color ?? 'var(--border-strong)'}`,
    }}>
      <div style={{
        fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em',
        lineHeight: 1, color: color ?? 'var(--fg)', fontFamily: 'var(--font-mono)',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── SVG Donut chart ────────────────────────────────────────────────────────────

interface DonutSegment { label: string; value: number; color: string; }

function DonutChart({ segments, size = 120, thickness = 22 }: {
  segments: DonutSegment[]; size?: number; thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="var(--border-strong)" strokeWidth={thickness} />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={12} fill="var(--fg-subtle)">—</text>
      </svg>
    );
  }

  let offset = 0;
  const arcs = segments
    .filter(s => s.value > 0)
    .map(seg => {
      const len = (seg.value / total) * circumference;
      const gap = 2;
      const arc = { ...seg, dasharray: `${Math.max(0, len - gap)} ${circumference - Math.max(0, len - gap)}`, dashoffset: -offset };
      offset += len;
      return arc;
    });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="var(--bg-elevated)" strokeWidth={thickness} />
      {arcs.map((arc, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={arc.color} strokeWidth={thickness}
          strokeDasharray={arc.dasharray}
          strokeDashoffset={arc.dashoffset}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  );
}

// ── Bar chart ──────────────────────────────────────────────────────────────────

interface BarGroup { label: string; bars: { value: number; color: string; legend: string }[]; }

function GroupedBarChart({ groups, height = 100 }: { groups: BarGroup[]; height?: number }) {
  const allVals = groups.flatMap(g => g.bars.map(b => b.value));
  const max = Math.max(...allVals, 1);
  const barW = 18;
  const gap = 4;
  const groupGap = 20;
  const totalW = groups.length * (groups[0].bars.length * (barW + gap) - gap + groupGap) - groupGap;

  return (
    <div style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${totalW} ${height + 24}`}
        style={{ width: '100%', overflow: 'visible' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {groups.map((group, gi) => {
          const groupX = gi * (group.bars.length * (barW + gap) - gap + groupGap);
          return (
            <g key={group.label} transform={`translate(${groupX}, 0)`}>
              {group.bars.map((bar, bi) => {
                const bh = Math.max(2, (bar.value / max) * height);
                const bx = bi * (barW + gap);
                const by = height - bh;
                return (
                  <g key={bi}>
                    <rect x={bx} y={by} width={barW} height={bh}
                      fill={bar.color} rx={3}
                      style={{ transition: 'height 0.4s ease, y 0.4s ease' }}
                    />
                    {bar.value > 0 && (
                      <text x={bx + barW / 2} y={by - 4} textAnchor="middle"
                        fontSize={9} fontWeight={600}
                        fill="var(--fg-muted)" fontFamily="var(--font-mono)">
                        {bar.value}
                      </text>
                    )}
                  </g>
                );
              })}
              <text
                x={(group.bars.length * (barW + gap) - gap) / 2}
                y={height + 14}
                textAnchor="middle"
                fontSize={10} fontWeight={600}
                fill="var(--fg-subtle)"
              >
                {group.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Chart card shell ───────────────────────────────────────────────────────────

function ChartCard({ title, sub, children, href }: {
  title: string; sub?: string; children: React.ReactNode; href?: string;
}) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 10,
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-card)',
      padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>{title}</div>
          {sub && <div style={{ fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 2 }}>{sub}</div>}
        </div>
        {href && (
          <Link href={href} style={{
            fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            View all
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Legend row ─────────────────────────────────────────────────────────────────

function Legend({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            width: 8, height: 8, borderRadius: 2, flexShrink: 0,
            background: item.color,
          }} />
          <span style={{ fontSize: 11, color: 'var(--fg-muted)', flex: 1 }}>{item.label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--fg)' }}>
            {item.value}
          </span>
          <span style={{ fontSize: 10, color: 'var(--fg-subtle)', minWidth: 28, textAlign: 'right' }}>
            {total > 0 ? Math.round((item.value / total) * 100) : 0}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Bar chart legend ───────────────────────────────────────────────────────────

function BarLegend({ bars }: { bars: { legend: string; color: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
      {bars.map(b => (
        <div key={b.legend} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color, flexShrink: 0 }} />
          <span style={{ fontSize: 10.5, color: 'var(--fg-muted)' }}>{b.legend}</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [all,          setAll]          = useState<CheckReservationBooking[]>([]);
  const [todayStat,    setTodayStat]    = useState<PeriodStat>({ total: 0, totalGuests: 0, items: [] });
  const [tomorrowStat, setTomorrowStat] = useState<PeriodStat>({ total: 0, totalGuests: 0 });
  const [weekStat,     setWeekStat]     = useState<PeriodStat>({ total: 0, totalGuests: 0 });
  const [runningActions, setRunningActions] = useState<RunningAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = todayStr.slice(0, 7);

    Promise.all([
      fetch(ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: CHECKS_QUERY }),
      }).then(r => r.json()),
      fetch(ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ARRIVALS_QUERY }),
      }).then(r => r.json()),
      fetch(ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ACTIONS_QUERY, variables: { filter: { month: monthStr } } }),
      }).then(r => r.json()),
    ])
      .then(([checksJson, arrivalsJson, actionsJson]) => {
        setAll(checksJson.data?.checkReservations?.items ?? []);
        setTodayStat(arrivalsJson.data?.today       ?? { total: 0, totalGuests: 0, items: [] });
        setTomorrowStat(arrivalsJson.data?.tomorrow ?? { total: 0, totalGuests: 0 });
        setWeekStat(arrivalsJson.data?.week         ?? { total: 0, totalGuests: 0 });
        const allActions: RunningAction[] = actionsJson.data?.actions?.items ?? [];
        setRunningActions(allActions.filter(a => a.startDate <= todayStr && a.endDate >= todayStr));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────────
  const red     = all.filter(r => r.status === 'RED').length;
  const yellow  = all.filter(r => r.status === 'YELLOW').length;
  const green   = all.filter(r => r.status === 'GREEN').length;
  const pending = all.filter(r => r.status === 'PENDING').length;
  const today   = new Date().toISOString().slice(0, 10);

  const urgent = [...all]
    .filter(r => r.status === 'RED' || r.status === 'YELLOW')
    .sort((a, b) => statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder])
    .slice(0, 5);

  const todayItems     = todayStat.items ?? [];
  const vipArrivals    = todayItems.filter(g => g.tier === 4);
  const checkinToday   = all.filter(r => r.checkin === today).length;

  // Tier counts for today
  const tierCounts = [1, 2, 3, 4].map(t => todayItems.filter(g => g.tier === t).length);
  const tierSegments: DonutSegment[] = [
    { label: 'Newcomer', value: tierCounts[0], color: '#94A3B8' },
    { label: 'Silver',   value: tierCounts[1], color: '#3B82F6' },
    { label: 'Gold',     value: tierCounts[2], color: '#D97706' },
    { label: 'Platinum', value: tierCounts[3], color: '#7C3AED' },
  ];

  // Check health segments
  const checkSegments: DonutSegment[] = [
    { label: 'Red',     value: red,     color: 'var(--status-red)'    },
    { label: 'Yellow',  value: yellow,  color: 'var(--status-yellow)' },
    { label: 'Pending', value: pending, color: 'var(--status-pending)' },
    { label: 'Green',   value: green,   color: 'var(--status-green)'  },
  ];

  // Bar chart groups
  const arrivalsBars = [
    { value: todayStat.total,    color: 'var(--accent)',    legend: 'Reservations' },
    { value: todayStat.totalGuests, color: '#93C5FD',       legend: 'Guests' },
  ];
  const barGroups: BarGroup[] = [
    { label: 'Today',    bars: arrivalsBars },
    { label: 'Tomorrow', bars: [
      { value: tomorrowStat.total,      color: 'var(--accent)',    legend: 'Reservations' },
      { value: tomorrowStat.totalGuests, color: '#93C5FD',          legend: 'Guests' },
    ]},
    { label: '7 Days',   bars: [
      { value: weekStat.total,       color: 'var(--accent)',    legend: 'Reservations' },
      { value: weekStat.totalGuests, color: '#93C5FD',          legend: 'Guests' },
    ]},
  ];

  return (
    <div style={{ padding: 0 }}>

      {/* ── Page header ── */}
      <div style={{
        background: '#FFFFFF', borderBottom: '1px solid var(--border)',
        padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16,
        height: 52, flexShrink: 0,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginLeft: 4 }}>
          {greeting()} — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {!loading && todayStat.total > 0 && (
            <Link href="/reception/arriving-guests" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--accent-light)', color: 'var(--accent)',
              borderRadius: 20, padding: '4px 11px',
              textDecoration: 'none', fontSize: 11.5, fontWeight: 600,
              border: '1px solid var(--accent-border)',
            }}>
              {todayStat.total} arriving today
            </Link>
          )}
          {!loading && runningActions.length > 0 && (
            <Link href="/reception/actions" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: '#7C3AED18', color: '#7C3AED',
              borderRadius: 20, padding: '4px 11px',
              textDecoration: 'none', fontSize: 11.5, fontWeight: 600,
              border: '1px solid #7C3AED30',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7C3AED', display: 'inline-block' }} />
              {runningActions.length} event{runningActions.length !== 1 ? 's' : ''} today
            </Link>
          )}
          {!loading && red > 0 && (
            <Link href="/reception/reservation-checks" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--status-red-bg)', color: 'var(--status-red)',
              borderRadius: 20, padding: '4px 11px',
              textDecoration: 'none', fontSize: 11.5, fontWeight: 600,
              border: '1px solid var(--status-red-border)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--status-red)', display: 'inline-block' }} />
              {red} urgent
            </Link>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 24px 60px', maxWidth: 1200 }}>

        {/* ── Stat rail ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 20 }}>
          <StatCard label="Total Reservations" value={loading ? '—' : all.length} />
          <StatCard label="Issues"          value={loading ? '—' : red}     color="var(--status-red)"    sub="need action" />
          <StatCard label="Warnings"        value={loading ? '—' : yellow}  color="var(--status-yellow)" sub="review needed" />
          <StatCard label="Pending"         value={loading ? '—' : pending} color="var(--status-pending)" />
          <StatCard label="Passed"          value={loading ? '—' : green}   color="var(--status-green)"  sub="checks ok" />
          <StatCard label="Events today"    value={loading ? '—' : runningActions.length} color="#7C3AED" sub="running now" />
        </div>

        {/* ── Charts row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>

          {/* 1. Arrivals bar */}
          <ChartCard
            title="Arrivals overview"
            sub="Reservations & guests by period"
            href="/reception/arriving-guests"
          >
            {loading ? (
              <div className="skeleton" style={{ height: 140, borderRadius: 8 }} />
            ) : (
              <>
                <GroupedBarChart groups={barGroups} height={110} />
                <BarLegend bars={barGroups[0].bars} />
              </>
            )}
          </ChartCard>

          {/* 3. Tier donut */}
          <ChartCard
            title="Guest tier mix"
            sub="Today's arrivals by loyalty tier"
            href="/reception/arriving-guests"
          >
            {loading ? (
              <div className="skeleton" style={{ height: 140, borderRadius: 8 }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <DonutChart segments={tierSegments} size={110} thickness={20} />
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, lineHeight: 1, color: 'var(--fg)' }}>
                      {todayStat.total}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--fg-subtle)', marginTop: 2 }}>total</span>
                  </div>
                </div>
                <Legend items={tierSegments.map(s => ({ label: s.label, value: s.value, color: s.color }))} />
              </div>
            )}
          </ChartCard>

          {/* 4. Check health donut */}
          <ChartCard
            title="Reservation health"
            sub="Check status distribution"
            href="/reception/reservation-checks"
          >
            {loading ? (
              <div className="skeleton" style={{ height: 140, borderRadius: 8 }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <DonutChart segments={checkSegments} size={110} thickness={20} />
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, lineHeight: 1, color: 'var(--fg)' }}>
                      {all.length}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--fg-subtle)', marginTop: 2 }}>checks</span>
                  </div>
                </div>
                <Legend items={[
                  { label: 'Issues',  value: red,     color: 'var(--status-red)'     },
                  { label: 'Warning', value: yellow,  color: 'var(--status-yellow)'  },
                  { label: 'Pending', value: pending, color: 'var(--status-pending)' },
                  { label: 'Passed',  value: green,   color: 'var(--status-green)'   },
                ]} />
              </div>
            )}
          </ChartCard>

        </div>

        {/* ── VIP arrivals ── */}
        {!loading && vipArrivals.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)',
              letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 7,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED', display: 'inline-block' }} />
              Platinum arrivals today · {vipArrivals.length}
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: 9, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {(todayStat.items ?? []).filter(g => g.tier === 4).map((g, i, arr) => (
                <Link key={i} href="/reception/arriving-guests" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', textDecoration: 'none', color: 'var(--fg)',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background .1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      background: 'rgba(124,58,237,0.10)', color: '#7C3AED',
                      borderRadius: 4, padding: '1px 6px',
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                    }}>
                      PLATINUM
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Tier 4 guest</span>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="1.8">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Running events ── */}
        {!loading && runningActions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)',
              letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 7,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED', display: 'inline-block' }} />
              Running events today · {runningActions.length}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {runningActions.map(a => (
                <div key={a.id} style={{
                  background: '#FFFFFF', borderRadius: 9,
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${a.type.color}`,
                  padding: '10px 14px',
                  display: 'flex', flexDirection: 'column', gap: 5,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                      background: a.type.color + '18', color: a.type.color,
                      border: `1px solid ${a.type.color}30`, whiteSpace: 'nowrap',
                    }}>
                      {a.type.name.toUpperCase()}
                    </span>
                    {a.pdfUrl && (
                      <a
                        href={`${(process.env.NEXT_PUBLIC_RECEPTION_REST ?? 'http://localhost:4002')}/api/actions/${a.id}/pdf`}
                        target="_blank" rel="noreferrer"
                        title="Download PDF"
                        style={{ color: '#E11D48', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                          <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                      </a>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.3 }}>{a.title}</div>
                  {a.description && (
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {a.description}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 2 }}>
                    {a.startDate === a.endDate ? a.startDate : `${a.startDate} → ${a.endDate}`}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <Link href="/reception/actions" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                Open action calendar →
              </Link>
            </div>
          </div>
        )}

        {/* ── Needs attention ── */}
        {!loading && urgent.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)',
              letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 7,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-red)', display: 'inline-block' }} />
              Needs attention
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: 9, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {urgent.map((r, i) => (
                <Link key={r.originId} href={`/reception/reservation-checks/${r.originId}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', textDecoration: 'none', color: 'var(--fg)',
                  borderBottom: i < urgent.length - 1 ? '1px solid var(--border)' : 'none',
                  borderLeft: `3px solid ${r.status === 'RED' ? 'var(--status-red)' : 'var(--status-yellow)'}`,
                  transition: 'background .1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <StatusBadge status={r.status as CheckReservationStatus} size="sm" />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{r.owner}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 1 }}>
                        {r.originId} · {r.provider} · {r.checkin} → {r.checkout}
                      </div>
                    </div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <Link href="/reception/reservation-checks" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                View all reservation checks →
              </Link>
            </div>
          </div>
        )}

        {/* ── Today at a glance ── */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)',
          letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 7,
        }}>
          Today at a glance
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {[
            { label: 'Arrivals',       value: loading ? '—' : todayStat.total,       color: 'var(--accent)' },
            { label: 'Guests',         value: loading ? '—' : todayStat.totalGuests,  color: 'var(--fg)' },
            { label: 'Tomorrow',       value: loading ? '—' : tomorrowStat.total,     color: 'var(--fg)' },
            { label: 'Pending review', value: loading ? '—' : pending,               color: 'var(--fg)' },
            { label: 'Check-ins',      value: loading ? '—' : checkinToday,           color: 'var(--fg)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: '#FFFFFF', borderRadius: 9,
              border: '1px solid var(--border)', padding: '13px 16px',
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', color }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
