import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { api } from '../api/client';
import { colors, headingStyle, card, badge, buttonPrimary, buttonSecondary, buttonDanger } from '../theme';

function relativeDate(iso) {
  if (!iso) return 'never';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function srsOverrideLabel(w) {
  const parts = [];
  if (w.srsIntervalDays != null) parts.push(`every ${w.srsIntervalDays}d`);
  if (w.srsUseCountTarget != null) parts.push(`target ${w.srsUseCountTarget}`);
  return parts.join(' · ') || 'Custom SRS';
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'due', label: 'Due' },
  { key: 'not-due', label: 'Not due' },
];

export default function Words() {
  const [filter, setFilter] = useState('all');
  const [words, setWords] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async (f) => {
    try {
      const qs = f === 'due' ? '?dueOnly=true' : f === 'not-due' ? '?dueOnly=false' : '';
      const data = await api.get(`/words${qs}`);
      setWords(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  async function markUsed(id) {
    try {
      await api.patch(`/words/${id}/use`);
      load(filter);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this word?')) return;
    try {
      await api.del(`/words/${id}`);
      setWords((prev) => prev.filter((w) => w._id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <PageShell maxWidth="1080px">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ ...headingStyle, fontSize: 28 }}>Words</div>
        <Link to="/words/add" style={buttonPrimary}>+ Add word</Link>
      </div>

      {error && <div style={{ ...card, borderColor: colors.errorBorder, color: colors.errorText, marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              background: filter === f.key ? colors.accent : colors.card,
              color: filter === f.key ? colors.accentText : colors.textBody,
              border: `1px solid ${filter === f.key ? colors.accent : colors.border}`,
              padding: '9px 18px',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {words.map((w) => (
          <div key={w._id} style={{ ...card, borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ ...headingStyle, fontSize: 18 }}>{w.word}</span>
                <span style={{ color: colors.textFaint, fontSize: 13 }}>{w.reading}</span>
                {w.priority && <span style={badge(colors.errorBg, colors.accent)}>Priority</span>}
                {(w.srsIntervalDays != null || w.srsUseCountTarget != null) && (
                  <span style={badge(colors.goldBgAlt, colors.goldText)}>{srsOverrideLabel(w)}</span>
                )}
              </div>
              <div style={{ color: colors.textBody, fontSize: 13.5, marginTop: 4 }}>{w.definition?.text}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {(w.tags || []).map((tag) => (
                  <span key={tag} style={badge(colors.sageBg, colors.sageText)}>{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ flex: 'none', textAlign: 'right', fontSize: 12.5, color: colors.textMuted, width: 110 }}>
              <div>{w.useCount} uses</div>
              <div>{relativeDate(w.lastUsed)}</div>
            </div>
            <div style={{ flex: 'none', display: 'flex', gap: 8 }}>
              <button onClick={() => markUsed(w._id)} style={buttonSecondary}>Mark used</button>
              <Link to={`/words/${w._id}`} style={buttonSecondary}>Edit</Link>
              <button onClick={() => remove(w._id)} style={buttonDanger}>Delete</button>
            </div>
          </div>
        ))}
        {words.length === 0 && <div style={{ color: colors.textMuted, fontSize: 14 }}>No words here.</div>}
      </div>
    </PageShell>
  );
}
