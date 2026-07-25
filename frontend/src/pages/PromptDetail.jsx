import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { api } from '../api/client';
import { colors, headingStyle, card, badge, buttonPrimary, inputStyle, label } from '../theme';

function badgeStyle(type) {
  if (type === 'ai') return [colors.errorBg, colors.accent];
  if (type === 'manual-template') return [colors.goldBgAlt, colors.goldText];
  return [colors.sageBg, colors.sageText];
}

export default function PromptDetail() {
  const { id } = useParams();
  const [prompt, setPrompt] = useState(null);
  const [responses, setResponses] = useState([]);
  const [responseMode, setResponseMode] = useState('text');
  const [responseText, setResponseText] = useState('');
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const [p, r] = await Promise.all([api.get(`/prompts/${id}`), api.get(`/prompts/${id}/response`)]);
      setPrompt(p);
      setResponses(r);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function addResponse() {
    setSubmitting(true);
    setError('');
    try {
      if (responseMode === 'text') {
        if (!responseText.trim()) return;
        await api.post(`/prompts/${id}/response`, { type: 'text', content: responseText });
        setResponseText('');
      } else {
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
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

  return (
    <PageShell maxWidth="820px">
      <Link to="/history" style={{ fontSize: 13.5, fontWeight: 600, color: colors.textMuted }}>← Back to History</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 20px' }}>
        <div style={{ ...headingStyle, fontSize: 24 }}>{prompt.date}</div>
        <span style={badge(badgeBg, badgeFg)}>{prompt.generatedBy}</span>
      </div>

      {error && <div style={{ ...card, borderColor: colors.errorBorder, color: colors.errorText, marginBottom: 20 }}>{error}</div>}

      <section style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: colors.textDark }}>{prompt.content}</div>
      </section>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <section style={{ ...card, flex: 1, padding: '18px 20px' }}>
          <div style={{ ...headingStyle, fontSize: 14.5, marginBottom: 10 }}>Target words</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(prompt.targetWordIds || []).map((w) => (
              <span key={w._id || w} style={badge(colors.sageBg, colors.sageText)}>{w.word || w}</span>
            ))}
            {(!prompt.targetWordIds || prompt.targetWordIds.length === 0) && <span style={{ color: colors.textMuted, fontSize: 13 }}>—</span>}
          </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {responses.map((r) => (
            <div key={r._id} style={{ ...card, padding: '16px 18px' }}>
              <div style={{ fontSize: 11.5, color: colors.textFaint, fontWeight: 700, marginBottom: 6 }}>
                {new Date(r.createdAt).toLocaleString()} · {r.type}
              </div>
              {r.type === 'text' ? (
                <div style={{ fontSize: 14, color: colors.textDark, lineHeight: 1.55 }}>{r.content}</div>
              ) : (
                <img src={r.content} alt="response" style={{ maxWidth: 260, borderRadius: 10 }} />
              )}
            </div>
          ))}
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
          <input type="file" accept="image/*" ref={fileInputRef} />
        )}
        <button onClick={addResponse} disabled={submitting} style={{ ...buttonPrimary, marginTop: 12 }}>
          {submitting ? 'Adding…' : 'Add response'}
        </button>
      </section>
    </PageShell>
  );
}
