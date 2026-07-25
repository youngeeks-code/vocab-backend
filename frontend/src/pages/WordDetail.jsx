import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { api } from '../api/client';
import { colors, headingStyle, card, buttonPrimary, buttonSecondary, buttonDanger, inputStyle, label } from '../theme';

export default function WordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [word, setWord] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [reading, setReading] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [srsInterval, setSrsInterval] = useState('');
  const [srsUseTarget, setSrsUseTarget] = useState('');

  async function load() {
    try {
      const w = await api.get(`/words/${id}`);
      setWord(w);
      setReading(w.reading || '');
      setTags((w.tags || []).join(', '));
      setNotes(w.notes || '');
      setSrsInterval(w.srsIntervalDays != null ? String(w.srsIntervalDays) : '');
      setSrsUseTarget(w.srsUseCountTarget != null ? String(w.srsUseCountTarget) : '');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function patchWord(body) {
    try {
      const updated = await api.patch(`/words/${id}`, body);
      setWord(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function togglePriority(e) {
    await patchWord({ priority: e.target.checked });
  }

  async function useDefinition(candidate) {
    await patchWord({ definition: candidate });
  }

  async function saveChanges() {
    setSaving(true);
    try {
      await patchWord({
        reading,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        notes,
        srsIntervalDays: srsInterval === '' ? null : Number(srsInterval),
        srsUseCountTarget: srsUseTarget === '' ? null : Number(srsUseTarget),
      });
    } finally {
      setSaving(false);
    }
  }

  function resetSrs() {
    setSrsInterval('');
    setSrsUseTarget('');
  }

  async function markUsed() {
    try {
      const updated = await api.patch(`/words/${id}/use`);
      setWord(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove() {
    if (!confirm('Delete this word?')) return;
    try {
      await api.del(`/words/${id}`);
      navigate('/words');
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !word) {
    return (
      <PageShell maxWidth="820px">
        <div style={{ ...card, borderColor: colors.errorBorder, color: colors.errorText }}>{error}</div>
      </PageShell>
    );
  }

  if (!word) return <PageShell maxWidth="820px">Loading…</PageShell>;

  return (
    <PageShell maxWidth="820px">
      <Link to="/words" style={{ fontSize: 13.5, fontWeight: 600, color: colors.textMuted }}>← Back to Words</Link>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '14px 0 24px' }}>
        <div style={{ ...headingStyle, fontSize: 30 }}>{word.word}</div>
        <div style={{ color: colors.textFaint, fontSize: 16 }}>{word.reading}</div>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!word.priority} onChange={togglePriority} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: colors.accent }}>Priority</span>
        </label>
      </div>

      {error && <div style={{ ...card, borderColor: colors.errorBorder, color: colors.errorText, marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section style={card}>
            <div style={{ ...headingStyle, fontSize: 16, marginBottom: 12 }}>Current definition</div>
            <div style={{ color: colors.textDark, fontSize: 15, lineHeight: 1.5 }}>{word.definition?.text || '—'}</div>
            <div style={{ color: colors.textMuted, fontSize: 12.5, marginTop: 6 }}>
              {word.definition?.partOfSpeech} · source: {word.definition?.source || 'manual'}
            </div>
          </section>

          <section style={card}>
            <div style={{ ...headingStyle, fontSize: 16, marginBottom: 14 }}>Other senses (change definition)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(word.candidateDefinitions || [])
                .filter((d) => d.text !== word.definition?.text)
                .map((d, i) => (
                  <div key={i} style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 14, color: colors.textDark }}>{d.text}</div>
                      <div style={{ fontSize: 12, color: colors.textFaint, marginTop: 2 }}>{d.partOfSpeech}</div>
                    </div>
                    <button onClick={() => useDefinition(d)} style={buttonSecondary}>Use this</button>
                  </div>
                ))}
              {(word.candidateDefinitions || []).length === 0 && (
                <div style={{ color: colors.textMuted, fontSize: 13 }}>No other candidate senses stored.</div>
              )}
            </div>
          </section>

          <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...headingStyle, fontSize: 16 }}>Edit</div>
            <label>
              <div style={label}>Reading</div>
              <input value={reading} onChange={(e) => setReading(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <div style={label}>Tags (comma-separated)</div>
              <input value={tags} onChange={(e) => setTags(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <div style={label}>Notes</div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
            </label>
            <div style={{ display: 'flex', gap: 14 }}>
              <label style={{ flex: 1 }}>
                <div style={label}>SRS interval (days)</div>
                <input value={srsInterval} onChange={(e) => setSrsInterval(e.target.value)} placeholder="default: 3" style={inputStyle} />
              </label>
              <label style={{ flex: 1 }}>
                <div style={label}>SRS use target</div>
                <input value={srsUseTarget} onChange={(e) => setSrsUseTarget(e.target.value)} placeholder="default: 5" style={inputStyle} />
              </label>
            </div>
            <button onClick={resetSrs} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: colors.goldText, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
              Reset SRS to global default
            </button>
            <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
              <button onClick={saveChanges} disabled={saving} style={buttonPrimary}>{saving ? 'Saving…' : 'Save changes'}</button>
              <button onClick={remove} style={buttonDanger}>Delete word</button>
            </div>
          </section>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...card, padding: '18px 20px' }}>
            <div style={{ ...headingStyle, fontSize: 14.5, marginBottom: 10 }}>Stats</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: colors.textBody }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: colors.textMuted }}>Use count</span><span>{word.useCount}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: colors.textMuted }}>Last used</span><span>{word.lastUsed ? new Date(word.lastUsed).toLocaleString() : 'never'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: colors.textMuted }}>Added</span><span>{new Date(word.addedAt).toLocaleDateString()}</span></div>
            </div>
          </div>
          <button
            onClick={markUsed}
            style={{ background: colors.sageBg, color: colors.sageText, border: `1px solid ${colors.sageBorder}`, padding: '12px 20px', borderRadius: 999, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Mark used today
          </button>
        </aside>
      </div>
    </PageShell>
  );
}
