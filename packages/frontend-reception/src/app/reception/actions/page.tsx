'use client';

import { useState, useEffect, useCallback } from 'react';

const ENDPOINT    = process.env.NEXT_PUBLIC_RECEPTION_API ?? 'http://localhost:4002/graphql';
const REST_BASE   = (process.env.NEXT_PUBLIC_RECEPTION_REST ?? 'http://localhost:4002') + '/api/actions';
const UPLOADS_URL = process.env.NEXT_PUBLIC_RECEPTION_REST ?? 'http://localhost:4002';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActionType {
  id: string;
  name: string;
  color: string;
}

interface HotelAction {
  id: string;
  title: string;
  description: string | null;
  type: ActionType;
  typeId: string;
  startDate: string;
  endDate: string;
  pictureUrl: string | null;
  pdfUrl: string | null;
}

// ── GraphQL queries ───────────────────────────────────────────────────────────

const GQL_ACTION_TYPES = `query { actionTypes { id name color } }`;

const GQL_ACTIONS = `
  query Actions($filter: ActionsFilter) {
    actions(filter: $filter, limit: 200) {
      items { id title description typeId startDate endDate pictureUrl pdfUrl
              type { id name color } }
    }
  }
`;

const GQL_CREATE_TYPE = `
  mutation CreateActionType($input: CreateActionTypeInput!) {
    createActionType(input: $input) { id name color }
  }
`;

const GQL_UPDATE_TYPE = `
  mutation UpdateActionType($id: ID!, $input: UpdateActionTypeInput!) {
    updateActionType(id: $id, input: $input) { id name color }
  }
`;

const GQL_DELETE_TYPE = `
  mutation DeleteActionType($id: ID!) { deleteActionType(id: $id) }
`;

const GQL_CREATE_ACTION = `
  mutation CreateAction($input: CreateActionInput!) {
    createAction(input: $input) { id title description typeId startDate endDate pictureUrl pdfUrl type { id name color } }
  }
`;

const GQL_UPDATE_ACTION = `
  mutation UpdateAction($id: ID!, $input: UpdateActionInput!) {
    updateAction(id: $id, input: $input) { id title description typeId startDate endDate pictureUrl pdfUrl type { id name color } }
  }
`;

const GQL_DELETE_ACTION = `
  mutation DeleteAction($id: ID!) { deleteAction(id: $id) }
`;

// ── GQL helper ────────────────────────────────────────────────────────────────

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  return json.data as T;
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Default colors for action types ──────────────────────────────────────────

const PRESET_COLORS = [
  '#2563EB','#7C3AED','#059669','#D97706','#EA580C','#E11D48',
  '#0891B2','#4F46E5','#BE185D','#15803D',
];

// ── Sub-components ────────────────────────────────────────────────────────────

function ColorSwatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 24, height: 24, borderRadius: 6, background: color, border: 'none',
      cursor: 'pointer', outline: selected ? `3px solid ${color}` : '3px solid transparent',
      outlineOffset: 2, transition: 'outline 0.1s',
    }} />
  );
}

// ── Modal: Action Type ────────────────────────────────────────────────────────

function ActionTypeModal({
  initial, onSave, onClose,
}: {
  initial?: ActionType;
  onSave:   (at: ActionType) => void;
  onClose:  () => void;
}) {
  const [name,  setName]  = useState(initial?.name  ?? '');
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);
  const [busy,  setBusy]  = useState(false);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (initial) {
        const d = await gql<{ updateActionType: ActionType }>(GQL_UPDATE_TYPE, { id: initial.id, input: { name, color } });
        onSave(d.updateActionType!);
      } else {
        const d = await gql<{ createActionType: ActionType }>(GQL_CREATE_TYPE, { input: { name, color } });
        onSave(d.createActionType);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: 24, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 18 }}>{initial ? 'Edit' : 'New'} Action Type</div>

        <label style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Name</label>
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Gastronomic Event"
          style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', fontSize: 13, marginBottom: 14, color: 'var(--fg)' }}
        />

        <label style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 600, display: 'block', marginBottom: 8 }}>Color</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {PRESET_COLORS.map(c => (
            <ColorSwatch key={c} color={c} selected={color === c} onClick={() => setColor(c)} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Custom:</span>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            style={{ width: 32, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }} />
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>{color}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', fontSize: 12, cursor: 'pointer', color: 'var(--fg)' }}>Cancel</button>
          <button onClick={save} disabled={busy || !name.trim()} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy || !name.trim() ? 0.6 : 1 }}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Action ─────────────────────────────────────────────────────────────

function ActionModal({
  initial, actionTypes, defaultDate, onSave, onClose,
}: {
  initial?:     HotelAction;
  actionTypes:  ActionType[];
  defaultDate?: string;
  onSave:       (a: HotelAction) => void;
  onClose:      () => void;
}) {
  const [title,       setTitle]       = useState(initial?.title       ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [typeId,      setTypeId]      = useState(initial?.typeId      ?? actionTypes[0]?.id ?? '');
  const [startDate,   setStartDate]   = useState(initial?.startDate   ?? defaultDate ?? '');
  const [endDate,     setEndDate]     = useState(initial?.endDate     ?? defaultDate ?? '');
  const [busy,        setBusy]        = useState(false);
  const [uploadingPic,  setUploadingPic]  = useState(false);
  const [uploadingPdf,  setUploadingPdf]  = useState(false);
  const [actionId,    setActionId]    = useState<string | null>(initial?.id ?? null);
  const [pictureUrl,  setPictureUrl]  = useState(initial?.pictureUrl  ?? null);
  const [pdfUrl,      setPdfUrl]      = useState(initial?.pdfUrl      ?? null);

  async function save() {
    if (!title.trim() || !typeId || !startDate || !endDate) return;
    setBusy(true);
    try {
      let saved: HotelAction;
      if (initial) {
        const d = await gql<{ updateAction: HotelAction }>(GQL_UPDATE_ACTION, {
          id: initial.id, input: { title, description: description || null, typeId, startDate, endDate },
        });
        saved = d.updateAction!;
      } else {
        const d = await gql<{ createAction: HotelAction }>(GQL_CREATE_ACTION, {
          input: { title, description: description || null, typeId, startDate, endDate },
        });
        saved = d.createAction;
      }
      setActionId(saved.id);
      onSave({ ...saved, pictureUrl, pdfUrl });
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile(field: 'picture' | 'pdf', file: File) {
    const id = actionId;
    if (!id) { alert('Save the action first before uploading files.'); return; }
    const setter = field === 'picture' ? setUploadingPic : setUploadingPdf;
    setter(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${REST_BASE}/${id}/${field}`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (field === 'picture') setPictureUrl(json.pictureUrl);
      else setPdfUrl(json.pdfUrl);
    } catch (e) {
      alert(`Upload failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setter(false);
    }
  }

  const picFull  = pictureUrl ? `${UPLOADS_URL}${pictureUrl}` : null;
  const canUpload = !!actionId;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: 24, width: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 18 }}>{initial ? 'Edit' : 'New'} Action</div>

        {/* Title */}
        <label style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Action title"
          style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', fontSize: 13, marginBottom: 12, color: 'var(--fg)' }} />

        {/* Description */}
        <label style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Optional description…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', fontSize: 13, marginBottom: 12, resize: 'vertical', color: 'var(--fg)', fontFamily: 'inherit' }} />

        {/* Type */}
        <label style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Type *</label>
        {actionTypes.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--status-red)', marginBottom: 12 }}>Create an action type first.</p>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {actionTypes.map(at => (
              <button key={at.id} onClick={() => setTypeId(at.id)} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: typeId === at.id ? at.color : at.color + '18',
                color: typeId === at.id ? '#fff' : at.color,
                border: `1.5px solid ${at.color}40`, cursor: 'pointer',
              }}>
                {at.name}
              </button>
            ))}
          </div>
        )}

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Start Date *</label>
            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }}
              style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', fontSize: 13, color: 'var(--fg)' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 600, display: 'block', marginBottom: 4 }}>End Date *</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', fontSize: 13, color: 'var(--fg)' }} />
          </div>
        </div>

        {/* Save first hint */}
        {!canUpload && (
          <p style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic', marginBottom: 12 }}>
            Save the action first to enable file uploads.
          </p>
        )}

        {/* Picture upload */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Picture</label>
          {picFull && (
            <img src={picFull} alt="preview" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 6, border: '1px solid var(--border)' }} />
          )}
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border-strong)',
            background: 'var(--bg-elevated)', cursor: canUpload ? 'pointer' : 'not-allowed', fontSize: 12,
            opacity: canUpload ? 1 : 0.45,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {uploadingPic ? 'Uploading…' : picFull ? 'Replace picture' : 'Upload picture'}
            <input type="file" accept="image/*" disabled={!canUpload || uploadingPic}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile('picture', f); }}
              style={{ display: 'none' }} />
          </label>
        </div>

        {/* PDF upload */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 600, display: 'block', marginBottom: 6 }}>PDF</label>
          {pdfUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span style={{ fontSize: 11, color: '#E11D48', fontFamily: 'var(--font-mono)' }}>PDF attached</span>
            </div>
          )}
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border-strong)',
            background: 'var(--bg-elevated)', cursor: canUpload ? 'pointer' : 'not-allowed', fontSize: 12,
            opacity: canUpload ? 1 : 0.45,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {uploadingPdf ? 'Uploading…' : pdfUrl ? 'Replace PDF' : 'Upload PDF'}
            <input type="file" accept="application/pdf" disabled={!canUpload || uploadingPdf}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile('pdf', f); }}
              style={{ display: 'none' }} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', fontSize: 12, cursor: 'pointer', color: 'var(--fg)' }}>Cancel</button>
          <button onClick={save} disabled={busy || !title.trim() || !typeId || !startDate || !endDate} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy || !title.trim() || !typeId || !startDate || !endDate ? 0.6 : 1 }}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Calendar cell ─────────────────────────────────────────────────────────────

function CalendarCell({
  date, actions, onAdd, onSelect,
}: {
  date:     string;
  actions:  HotelAction[];
  onAdd:    (date: string) => void;
  onSelect: (a: HotelAction) => void;
}) {
  const day    = Number(date.split('-')[2]);
  const isWeek = [0, 6].includes(new Date(date).getDay());

  return (
    <div
      onDoubleClick={() => onAdd(date)}
      style={{
        minHeight: 88, padding: '5px 6px', borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)', position: 'relative',
        background: isWeek ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        cursor: 'default',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', marginBottom: 4 }}>{day}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {actions.slice(0, 3).map(a => (
          <button key={a.id} onClick={() => onSelect(a)} style={{
            padding: '2px 5px', borderRadius: 3, border: 'none', cursor: 'pointer',
            background: a.type.color + '22', color: a.type.color,
            fontSize: 10, fontWeight: 600, textAlign: 'left', overflow: 'hidden',
            whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '100%',
            borderLeft: `2.5px solid ${a.type.color}`,
          }}>
            {a.title}
          </button>
        ))}
        {actions.length > 3 && (
          <span style={{ fontSize: 9, color: 'var(--fg-subtle)', fontWeight: 500 }}>
            +{actions.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ActionsPage() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [actions,     setActions]     = useState<HotelAction[]>([]);
  const [loading,     setLoading]     = useState(true);

  const [showTypeModal,   setShowTypeModal]   = useState(false);
  const [editingType,     setEditingType]     = useState<ActionType | undefined>();
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingAction,   setEditingAction]   = useState<HotelAction | undefined>();
  const [defaultDate,     setDefaultDate]     = useState<string | undefined>();
  const [selectedAction,  setSelectedAction]  = useState<HotelAction | null>(null);

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [typesData, actionsData] = await Promise.all([
        gql<{ actionTypes: ActionType[] }>(GQL_ACTION_TYPES),
        gql<{ actions: { items: HotelAction[] } }>(GQL_ACTIONS, { filter: { month: monthStr } }),
      ]);
      setActionTypes(typesData.actionTypes);
      setActions(actionsData.actions.items);
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function prevMonth() { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); }

  // Build calendar grid
  const numDays  = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const cells: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: numDays }, (_, i) => isoDate(year, month, i + 1)),
  ];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  function actionsOnDate(date: string) {
    return actions.filter(a => a.startDate <= date && a.endDate >= date);
  }

  async function deleteAction(id: string) {
    await gql(GQL_DELETE_ACTION, { id });
    setActions(prev => prev.filter(a => a.id !== id));
    setSelectedAction(null);
  }

  async function deleteType(id: string) {
    await gql(GQL_DELETE_TYPE, { id });
    setActionTypes(prev => prev.filter(at => at.id !== id));
  }

  function openNewAction(date?: string) {
    setEditingAction(undefined);
    setDefaultDate(date);
    setShowActionModal(true);
  }

  function onActionSaved(a: HotelAction) {
    setActions(prev => {
      const idx = prev.findIndex(x => x.id === a.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = a; return n; }
      return [...prev, a];
    });
    setShowActionModal(false);
    setSelectedAction(a);
  }

  function onTypeSaved(at: ActionType) {
    setActionTypes(prev => {
      const idx = prev.findIndex(x => x.id === at.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = at; return n; }
      return [...prev, at];
    });
    setShowTypeModal(false);
    setEditingType(undefined);
  }

  // refresh selectedAction when actions list updates
  useEffect(() => {
    if (selectedAction) {
      const fresh = actions.find(a => a.id === selectedAction.id);
      if (fresh) setSelectedAction(fresh);
    }
  }, [actions]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Left panel ── */}
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border-strong)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid var(--border-strong)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', marginBottom: 2 }}>
            Action Planning
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Hotel event calendar</div>
        </div>

        {/* Action Types */}
        <div style={{ padding: '12px 12px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-subtle)' }}>Action Types</span>
            <button onClick={() => { setEditingType(undefined); setShowTypeModal(true); }} style={{
              width: 20, height: 20, borderRadius: 4, border: '1px solid var(--border-strong)',
              background: 'var(--bg-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          {actionTypes.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic', marginBottom: 10 }}>No types yet.</p>
          )}
          {actionTypes.map(at => (
            <div key={at.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 6px', borderRadius: 6, marginBottom: 2 }}>
              <div style={{ width: 9, height: 9, borderRadius: 2, background: at.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, flex: 1, color: 'var(--fg)' }}>{at.name}</span>
              <button onClick={() => { setEditingType(at); setShowTypeModal(true); }} style={{ width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, padding: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button onClick={() => { if (confirm(`Delete type "${at.name}"?`)) deleteType(at.id); }} style={{ width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--status-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, padding: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            </div>
          ))}
          <div style={{ height: 10 }} />
        </div>

        {/* Action list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-subtle)' }}>{MONTH_NAMES[month]} {year}</span>
            <button onClick={() => openNewAction()} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border-strong)',
              background: 'var(--bg-elevated)', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: 'var(--fg)',
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add
            </button>
          </div>

          {loading && <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Loading…</div>}

          {!loading && actions.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>No actions this month.</p>
          )}

          {actions.map(a => (
            <button key={a.id} onClick={() => setSelectedAction(selectedAction?.id === a.id ? null : a)} style={{
              width: '100%', display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '7px 8px', borderRadius: 7, border: `1px solid ${selectedAction?.id === a.id ? a.type.color + '60' : 'var(--border)'}`,
              background: selectedAction?.id === a.id ? a.type.color + '10' : 'transparent',
              cursor: 'pointer', marginBottom: 4, textAlign: 'left',
            }}>
              <div style={{ width: 3, height: '100%', minHeight: 36, borderRadius: 2, background: a.type.color, flexShrink: 0, alignSelf: 'stretch' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 1 }}>
                  {a.startDate === a.endDate ? a.startDate : `${a.startDate} → ${a.endDate}`}
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: a.type.color, marginTop: 2 }}>{a.type.name.toUpperCase()}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Calendar header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-surface)', flexShrink: 0 }}>
          <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em', minWidth: 160 }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--fg)' }}>
            Today
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={() => openNewAction()} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 7, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Action
          </button>
        </div>

        {/* Day labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-strong)', flexShrink: 0, background: 'var(--bg-surface)' }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ padding: '6px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--fg-subtle)', textAlign: 'center' }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}>
            {cells.map((date, i) =>
              date ? (
                <CalendarCell
                  key={date}
                  date={date}
                  actions={actionsOnDate(date)}
                  onAdd={openNewAction}
                  onSelect={a => setSelectedAction(selectedAction?.id === a.id ? null : a)}
                />
              ) : (
                <div key={`empty-${i}`} style={{ minHeight: 88, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }} />
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selectedAction && (
        <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid var(--border-strong)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Action Detail</div>
            <button onClick={() => setSelectedAction(null)} style={{ width: 24, height: 24, border: '1px solid var(--border-strong)', borderRadius: 5, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {/* Type badge */}
            <div style={{ marginBottom: 12 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                background: selectedAction.type.color + '18', color: selectedAction.type.color,
                border: `1px solid ${selectedAction.type.color}30`,
              }}>
                {selectedAction.type.name}
              </span>
            </div>

            {/* Title */}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 6, color: 'var(--fg)' }}>{selectedAction.title}</div>

            {/* Dates */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--fg-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                {selectedAction.startDate === selectedAction.endDate
                  ? selectedAction.startDate
                  : `${selectedAction.startDate} → ${selectedAction.endDate}`}
              </span>
            </div>

            {/* Description */}
            {selectedAction.description && (
              <div style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg-elevated)', borderRadius: 7, padding: '8px 10px', border: '1px solid var(--border)' }}>
                {selectedAction.description}
              </div>
            )}

            {/* Picture */}
            {selectedAction.pictureUrl && (
              <img
                src={`${UPLOADS_URL}${selectedAction.pictureUrl}`}
                alt="action"
                style={{ width: '100%', borderRadius: 8, marginBottom: 12, objectFit: 'cover', maxHeight: 160, border: '1px solid var(--border)' }}
              />
            )}

            {/* PDF download */}
            {selectedAction.pdfUrl && (
              <a
                href={`${REST_BASE}/${selectedAction.id}/pdf`}
                target="_blank" rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px',
                  borderRadius: 7, border: '1px solid #E11D4840',
                  background: '#E11D4810', color: '#E11D48',
                  fontSize: 12, fontWeight: 600, textDecoration: 'none', marginBottom: 14,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                Download PDF
              </a>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
              <button onClick={() => { setEditingAction(selectedAction); setShowActionModal(true); }} style={{
                flex: 1, padding: '7px 0', borderRadius: 7, border: '1px solid var(--border-strong)',
                background: 'var(--bg-elevated)', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--fg)',
              }}>
                Edit
              </button>
              <button onClick={() => { if (confirm(`Delete "${selectedAction.title}"?`)) deleteAction(selectedAction.id); }} style={{
                flex: 1, padding: '7px 0', borderRadius: 7, border: '1px solid var(--status-red-border)',
                background: 'var(--status-red-bg)', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--status-red)',
              }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showTypeModal && (
        <ActionTypeModal
          initial={editingType}
          onSave={onTypeSaved}
          onClose={() => { setShowTypeModal(false); setEditingType(undefined); }}
        />
      )}

      {showActionModal && (
        <ActionModal
          initial={editingAction}
          actionTypes={actionTypes}
          defaultDate={defaultDate}
          onSave={onActionSaved}
          onClose={() => { setShowActionModal(false); setEditingAction(undefined); }}
        />
      )}

    </div>
  );
}
