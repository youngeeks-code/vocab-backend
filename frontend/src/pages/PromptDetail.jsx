import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { api } from '../api/client';
import { colors, headingStyle, card, badge, buttonPrimary, buttonDanger, inputStyle, label } from '../theme';

function badgeStyle(type) {
  if (type === 'ai') return [colors.errorBg, colors.accent];
  if (type === 'manual-template') return [colors.goldBgAlt, colors.goldText];
  return [colors.sageBg, colors.sageText];
}

export default function PromptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(null);
  const [responses, setResponses] = useState([]);
  const [responseMode, setResponseMode] = useState('text');
  const [responseText, setResponseText] = useState('');
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [wordsUsed, setWordsUsed] = useState({});

  async function load() {
    try {
      const [p, r] = await Promise.all([api.get(`/prompts/${id}`), api.get(`/prompts/${id}/response`)]);
      setPrompt(p);
      setResponses(r);
      // Default every target word to "used" — the user unchecks the ones they skipped.
      setWordsUsed(Object.fromEntries((p.targetWordIds || []).map((w) => [w._id, true])));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  function toggleWordUsed(wordId) {
    setWordsUsed((prev) => ({ ...prev, [wordId]: !prev[wordId] }));
  }

  async function deleteEntry() {
    if (!confirm('Delete this journal entry? This removes its responses too, and un-counts any words it marked as used.')) return;
    try {
      await api.del(`/prompts/${id}`);
      navigate('/history');
    } catch (err) {
      setError(err.message);
    }
  }

  async function addResponse() {
    setSubmitting(true);
    setError('');
    try {
      const usedIds = Object.keys(wordsUsed).filter((wordId) => wordsUsed[wordId]);

      if (responseMode === 'text') {
        if (!responseText.trim()) return;
        await api.post(`/prompts/${id}/response`, { type: 'text', content: responseText, wordsUsed: usedIds });
        setResponseText('');
      } else {
        const files = fileInputRef.current?.files;
        if (!files?.length) return;
        const formData = new FormData();
        Array.from(files).forEach((file) => formData.append('images', file));
        formData.append('wordsUsed', JSON.stringify(usedIds));
        await api.postForm(`/prompts/${id}/response`, formData);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      const r = await api.get(`/prompts/${id}/response`);
      setResponses(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !prompt) {
    return (
      <PageShell maxWidth="820px">
        <div style={{ ...card, borderColor: colors.errorBorder, color: colors.errorText }}>{error}</div>
      </PageShell>
    );
  }

  if (!prompt) return <PageShell maxWidth="820px">Loading…</PageShell>;

  const [badgeBg, badgeFg] = badgeStyle(prompt.generatedBy);
  // A target word counts as "used" once it shows up in wordsUsed on ANY saved
  // response for this prompt — not just the checklist state of the in-progress form.
  const usedWordIds = new Set(
    responses.flatMap((r) => (r.wordsUsed || []).map((w) => String(w._id || w)))
  );

  return (
    <PageShell maxWidth="820px">
      <Link to="/history" style={{ fontSize: 13.5, fontWeight: 600, color: colors.textMuted }}>← Back to Journal</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 20px' }}>
        <div style={{ ...headingStyle, fontSize: 24 }}>{prompt.date}</div>
        <span style={badge(badgeBg, badgeFg)}>{prompt.generatedBy}</span>
        <button onClick={deleteEntry} style={{ ...buttonDanger, marginLeft: 'auto' }}>Delete entry</button>
      </div>

      {error && <div style={{ ...card, borderColor: colors.errorBorder, color: colors.errorText, marginBottom: 20 }}>{error}</div>}

      <section style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: colors.textDark }}>{prompt.content}</div>
      </section>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <section style={{ ...card, flex: 1, padding: '18px 20px' }}>
          <div style={{ ...headingStyle, fontSize: 14.5, marginBottom: 10 }}>Target words</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(prompt.targetWordIds || []).map((w) => {
              // Before any response is saved there's nothing to compare against yet,
              // so leave every word neutral rather than flashing them all "not used".
              const used = responses.length === 0 || usedWordIds.has(String(w._id || w));
              return (
                <span
                  key={w._id || w}
                  style={badge(used ? colors.sageBg : colors.errorBg, used ? colors.sageText : colors.errorText)}
                >
                  {w.word || w}
                </span>
              );
            })}
            {(!prompt.targetWordIds || prompt.targetWordIds.length === 0) && <span style={{ color: colors.textMuted, fontSize: 13 }}>—</span>}
          </div>
          {responses.length > 0 && (prompt.targetWordIds || []).length > 0 && (
            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 12, color: colors.textMuted }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.sageDot, display: 'inline-block' }} />
                used
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.accent, display: 'inline-block' }} />
                not used
              </span>
            </div>
          )}
        </section>
        <section style={{ ...card, flex: 1, padding: '18px 20px' }}>
          <div style={{ ...headingStyle, fontSize: 14.5, marginBottom: 10 }}>Guidance used</div>
          <div style={{ fontSize: 13, color: colors.textBody, lineHeight: 1.5 }}>
            {(prompt.guidanceUsed || []).join('; ') || '—'}
          </div>
        </section>
      </div>

      <section style={{ marginBottom: 20 }}>
        <div style={{ ...headingStyle, fontSize: 18, marginBottom: 14 }}>Responses</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {responses.map((r) =>
            r.type === 'image' ? (
              <div key={r._id} style={{ ...card, padding: 0, overflow: 'hidden', gridColumn: 'span 2' }}>
                <img src={r.content} alt="response" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '12px 16px 16px' }}>
                  <div style={{ fontSize: 11.5, color: colors.textFaint, fontWeight: 700 }}>{new Date(r.createdAt).toLocaleString()}</div>
                  {r.wordsUsed?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {r.wordsUsed.map((w) => (
                        <span key={w._id} style={badge(colors.sageBg, colors.sageText)}>{w.word}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div key={r._id} style={{ ...card, padding: '18px 20px', gridColumn: 'span 1' }}>
                <div style={{ fontSize: 11.5, color: colors.textFaint, fontWeight: 700, marginBottom: 8 }}>{new Date(r.createdAt).toLocaleString()}</div>
                <div style={{ fontSize: 14, color: colors.textDark, lineHeight: 1.6 }}>{r.content}</div>
                {r.wordsUsed?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {r.wordsUsed.map((w) => (
                      <span key={w._id} style={badge(colors.sageBg, colors.sageText)}>{w.word}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
          {responses.length === 0 && <div style={{ color: colors.textMuted, fontSize: 14 }}>No responses yet.</div>}
        </div>
      </section>

      <section style={{ ...card, padding: '18px 20px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setResponseMode('text')}
            style={{ background: responseMode === 'text' ? colors.accent : colors.card, color: responseMode === 'text' ? colors.accentText : colors.textBody, border: `1px solid ${responseMode === 'text' ? colors.accent : colors.border}`, padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Text
          </button>
          <button
            onClick={() => setResponseMode('image')}
            style={{ background: responseMode === 'image' ? colors.accent : colors.card, color: responseMode === 'image' ? colors.accentText : colors.textBody, border: `1px solid ${responseMode === 'image' ? colors.accent : colors.border}`, padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Image
          </button>
        </div>
        {responseMode === 'text' ? (
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Write your response…"
            style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
          />
        ) : (
          <input type="file" accept="image/*" multiple ref={fileInputRef} />
        )}

        {(prompt.targetWordIds || []).length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ ...label, marginBottom: 6 }}>Words used</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {prompt.targetWordIds.map((w) => {
                const wordId = w._id || w;
                const checked = Boolean(wordsUsed[wordId]);
                return (
                  <label
                    key={wordId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 999,
                      border: `1px solid ${checked ? colors.accent : colors.border}`,
                      background: checked ? colors.sageBg : colors.card,
                      color: checked ? colors.sageText : colors.textMuted,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleWordUsed(wordId)} />
                    {w.word || w}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={addResponse} disabled={submitting} style={{ ...buttonPrimary, marginTop: 12 }}>
          {submitting ? 'Adding…' : 'Add response'}
        </button>
      </section>
    </PageShell>
  );
}
