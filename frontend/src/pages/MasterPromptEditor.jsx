import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import { api } from '../api/client';
import { colors, fonts, headingStyle, card, badge, buttonPrimary, buttonSecondary, inputStyle } from '../theme';

const TABS = [
  { key: 'ai', label: 'AI-mode template' },
  { key: 'copy', label: 'Copy-paste template' },
];

const TOKEN_ROWS = [
  { token: '{{WORD_LIST}}', meaning: 'Formatted due-word list (IDs + Priority flag for ai type, plain text for copy)', omitted: 'Word selection breaks — the AI/reader never sees which words to use' },
  { token: '{{MIN_WORDS}}', meaning: 'The minimum word count set on generation', omitted: "That number won't appear anywhere in the text" },
  { token: '{{MAX_WORDS}}', meaning: 'The maximum word count set on generation', omitted: 'Silently absent, nothing errors' },
  { token: '{{TOPIC_GUIDANCE}}', meaning: 'Combined ad-hoc + standing guidance text', omitted: 'Wrap in [[IF:TOPIC_GUIDANCE]]...[[/IF]] or you get a stray label when guidance is empty' },
  { token: 'PROMPT / IDS markers (ai only)', meaning: 'Tells the AI how to structure its reply so the app can parse it', omitted: 'parseAiResponse throws — every AI-mode generation fails until restored' },
];

export default function MasterPromptEditor() {
  const [type, setType] = useState('ai');
  const [content, setContent] = useState('');
  const [history, setHistory] = useState([]);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function load(t) {
    setError('');
    setPreview(null);
    try {
      const [active, versions] = await Promise.all([api.get(`/prompt-templates/${t}/active`), api.get(`/prompt-templates/${t}`)]);
      setContent(active.content);
      setHistory(versions);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load(type);
  }, [type]);

  async function saveNewVersion() {
    setSaving(true);
    setError('');
    try {
      await api.post(`/prompt-templates/${type}`, { content });
      await load(type);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function testPrompt() {
    setTesting(true);
    setError('');
    setPreview(null);
    try {
      const data = await api.post(`/prompt-templates/${type}/preview`, { content });
      setPreview(data.rendered);
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  }

  async function restore(id) {
    try {
      await api.patch(`/prompt-templates/${type}/${id}/activate`);
      await load(type);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <PageShell maxWidth="820px">
      <div style={{ ...headingStyle, fontSize: 28, marginBottom: 20 }}>Master prompt editor</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            style={{
              background: type === t.key ? colors.accent : colors.card,
              color: type === t.key ? colors.accentText : colors.textBody,
              border: `1px solid ${type === t.key ? colors.accent : colors.border}`,
              padding: '10px 18px',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div style={{ ...card, borderColor: colors.errorBorder, color: colors.errorText, marginBottom: 20 }}>{error}</div>}

      <section style={{ ...card, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ ...headingStyle, fontSize: 15.5 }}>Active template</div>
          <span style={badge(colors.sageBg, colors.sageText)}>active</span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ ...inputStyle, minHeight: 220, fontFamily: fonts.mono, fontSize: 13, lineHeight: 1.6, resize: 'vertical', color: colors.textDark }}
        />

        <div style={{ marginTop: 14, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.6fr', background: colors.goldBg, fontSize: 11.5, fontWeight: 700, color: colors.textBody }}>
            <div style={{ padding: '8px 12px' }}>Token</div>
            <div style={{ padding: '8px 12px' }}>Meaning</div>
            <div style={{ padding: '8px 12px' }}>If omitted</div>
          </div>
          {TOKEN_ROWS.map((t) => (
            <div key={t.token} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.6fr', borderTop: `1px solid ${colors.border}`, fontSize: 12 }}>
              <div style={{ padding: '8px 12px', fontFamily: fonts.mono, color: colors.accent }}>{t.token}</div>
              <div style={{ padding: '8px 12px', color: colors.textDark }}>{t.meaning}</div>
              <div style={{ padding: '8px 12px', color: colors.textMuted }}>{t.omitted}</div>
            </div>
          ))}
        </div>

        <div style={{ color: colors.errorText, fontSize: 12, marginTop: 10, fontWeight: 600 }}>
          Editing this template changes what the AI is told to do — test a generation after saving, before relying on it.
        </div>

        {preview && (
          <div style={{ marginTop: 14, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: colors.textDark }}>
            {preview}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
          <button onClick={saveNewVersion} disabled={saving} style={buttonPrimary}>{saving ? 'Saving…' : 'Save as new version'}</button>
          <button onClick={testPrompt} disabled={testing} style={buttonSecondary}>{testing ? 'Testing…' : 'Test this prompt'}</button>
        </div>
      </section>

      <section>
        <div style={{ ...headingStyle, fontSize: 17, marginBottom: 14 }}>Version history</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.map((v) => (
            <div key={v._id} style={{ ...card, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.textMuted }}>{new Date(v.createdAt).toLocaleDateString()}</span>
                  {v.active && <span style={badge(colors.sageBg, colors.sageText)}>active</span>}
                </div>
                <div style={{ fontSize: 13.5, color: colors.textBody, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 480 }}>{v.content}</div>
              </div>
              {!v.active && <button onClick={() => restore(v._id)} style={buttonSecondary}>Restore</button>}
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
