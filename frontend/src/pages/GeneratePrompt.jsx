import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import { api } from '../api/client';
import { colors, headingStyle, card, badge, buttonPrimary, buttonSecondary, inputStyle, label } from '../theme';

const WORD_COUNT_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
const MODES = [
  { key: 'ai-app', label: 'Generate with AI', sub: 'Runs in app, returns final content' },
  { key: 'ai-copy', label: 'AI (copy-paste)', sub: 'Copy a template, paste the reply back' },
  { key: 'personal', label: 'Personal prompt', sub: 'Write your own, no generation' },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function GeneratePrompt() {
  const [mode, setMode] = useState('ai-app');
  const [minWords, setMinWords] = useState(3);
  const [maxWords, setMaxWords] = useState(7);
  const [topic, setTopic] = useState('');

  const [dueWords, setDueWords] = useState([]);
  const [notDueWords, setNotDueWords] = useState([]);
  const [showNotDue, setShowNotDue] = useState(false);
  const [dueChecked, setDueChecked] = useState({});
  const [notDueChecked, setNotDueChecked] = useState({});

  const [aiSettings, setAiSettings] = useState(null);
  const [provider, setProvider] = useState('');

  const [result, setResult] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [saveDate, setSaveDate] = useState(todayIso());
  const [personalContent, setPersonalContent] = useState('');

  const [guidanceNote, setGuidanceNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [words, settings] = await Promise.all([api.get('/words?dueOnly=true'), api.get('/ai-settings')]);
        setDueWords(words);
        setAiSettings(settings);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  async function includeNotDue() {
    try {
      const words = await api.get('/words?dueOnly=false');
      setNotDueWords(words);
      setShowNotDue(true);
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleDue(id, checked) {
    setDueChecked((prev) => ({ ...prev, [id]: checked }));
  }
  function toggleNotDue(id, checked) {
    setNotDueChecked((prev) => ({ ...prev, [id]: checked }));
  }

  function switchMode(key) {
    setMode(key);
    setResult(null);
    setError('');
  }

  async function generate() {
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const excludedWordIds = dueWords.filter((w) => dueChecked[w._id] === false).map((w) => w._id);
      const includedWordIds = notDueWords.filter((w) => notDueChecked[w._id]).map((w) => w._id);
      const body = {
        mode: mode === 'ai-app' ? 'ai' : 'template',
        minWords,
        maxWords,
        excludedWordIds,
        includedWordIds,
        topicRequest: topic,
      };
      if (mode === 'ai-app' && provider) body.provider = provider;

      const data = await api.post('/prompts/generate', body);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      let body;
      if (mode === 'ai-app') {
        body = {
          date: saveDate,
          content: result.content,
          generatedBy: 'ai',
          targetWordIds: result.targetWordIds,
          guidanceUsed: result.guidanceUsed,
        };
      } else if (mode === 'ai-copy') {
        body = {
          date: saveDate,
          content: pastedText,
          generatedBy: 'pasted',
          targetWordIds: result.targetWordIds,
          guidanceUsed: result.guidanceUsed,
        };
      } else {
        body = { date: saveDate, content: personalContent, generatedBy: 'pasted' };
      }
      await api.post('/prompts', body);
      setResult(null);
      setPastedText('');
      setPersonalContent('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addGuidance() {
    if (!guidanceNote.trim()) return;
    try {
      await api.post('/prompts/guidance', { note: guidanceNote.trim() });
      setGuidanceNote('');
    } catch (err) {
      setError(err.message);
    }
  }

  function copyResult() {
    navigator.clipboard?.writeText(result.content);
  }

  const needsGenerateOptions = mode !== 'personal';
  const resultBadge = result?.generatedBy === 'ai'
    ? { label: 'ai', bg: colors.errorBg, fg: colors.accent }
    : { label: result?.generatedBy || '', bg: colors.goldBgAlt, fg: colors.goldText };

  return (
    <PageShell maxWidth="800px">
      <div style={{ ...headingStyle, fontSize: 28, marginBottom: 24 }}>Generate today's prompt</div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => switchMode(m.key)}
            style={{
              flex: 1,
              background: mode === m.key ? colors.accent : colors.card,
              color: mode === m.key ? colors.accentText : colors.textBody,
              border: `1px solid ${mode === m.key ? colors.accent : colors.border}`,
              padding: '14px 16px',
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div>{m.label}</div>
            <div style={{ fontWeight: 400, fontSize: 11.5, marginTop: 3, opacity: 0.85 }}>{m.sub}</div>
          </button>
        ))}
      </div>

      {error && <div style={{ ...card, borderColor: colors.errorBorder, color: colors.errorText, marginBottom: 20 }}>{error}</div>}

      {needsGenerateOptions && (
        <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.textBody }}>Min words</span>
              <select value={minWords} onChange={(e) => setMinWords(Number(e.target.value))} style={{ padding: '7px 10px', borderRadius: 10, border: `1px solid ${colors.inputBorder}`, fontSize: 13.5, background: '#fff' }}>
                {WORD_COUNT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.textBody }}>Max words</span>
              <select value={maxWords} onChange={(e) => setMaxWords(Number(e.target.value))} style={{ padding: '7px 10px', borderRadius: 10, border: `1px solid ${colors.inputBorder}`, fontSize: 13.5, background: '#fff' }}>
                {WORD_COUNT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>

            {mode === 'ai-app' && aiSettings && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.textBody }}>Use</span>
                <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ padding: '7px 10px', borderRadius: 10, border: `1px solid ${colors.inputBorder}`, fontSize: 13.5, background: '#fff' }}>
                  <option value="">Default ({aiSettings.activeProvider})</option>
                  <option value="anthropic" disabled={!aiSettings.providers.anthropic.hasApiKey}>
                    Anthropic ({aiSettings.providers.anthropic.model}){!aiSettings.providers.anthropic.hasApiKey ? ' — no key' : ''}
                  </option>
                  <option value="gemini" disabled={!aiSettings.providers.gemini.hasApiKey}>
                    Gemini ({aiSettings.providers.gemini.model}){!aiSettings.providers.gemini.hasApiKey ? ' — no key' : ''}
                  </option>
                </select>
              </label>
            )}
          </div>

          <label>
            <div style={label}>One-time topic (optional)</div>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. a rainy commute" style={inputStyle} />
          </label>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.textBody }}>Due words — checked words go into today's prompt</div>
              {!showNotDue && <button onClick={includeNotDue} style={buttonSecondary}>+ Include words not due</button>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dueWords.map((w) => (
                <label key={w._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '10px 14px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={dueChecked[w._id] !== false} onChange={(e) => toggleDue(w._id, e.target.checked)} style={{ marginTop: 3 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14.5 }}>{w.word}</span>
                      <span style={{ color: colors.textFaint, fontSize: 12 }}>{w.reading}</span>
                    </div>
                    <div style={{ color: colors.textBody, fontSize: 12.5, marginTop: 2 }}>{w.definition?.text}</div>
                  </div>
                </label>
              ))}
              {dueWords.length === 0 && <div style={{ color: colors.textMuted, fontSize: 13 }}>No words due right now.</div>}

              {showNotDue && (
                <>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: colors.textMuted, margin: '4px 0 -2px' }}>Not due — check to include anyway</div>
                  {notDueWords.map((w) => (
                    <label key={w._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: colors.cardAlt, border: `1px dashed ${colors.inputBorder}`, borderRadius: 12, padding: '10px 14px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!notDueChecked[w._id]} onChange={(e) => toggleNotDue(w._id, e.target.checked)} style={{ marginTop: 3 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14.5 }}>{w.word}</span>
                          <span style={{ color: colors.textFaint, fontSize: 12 }}>{w.reading}</span>
                        </div>
                        <div style={{ color: colors.textBody, fontSize: 12.5, marginTop: 2 }}>{w.definition?.text}</div>
                      </div>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={generate} disabled={generating} style={{ ...buttonPrimary, alignSelf: 'flex-start' }}>
              {generating ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </section>
      )}

      {result && mode !== 'personal' && (
        <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ ...headingStyle, fontSize: 16 }}>Result</div>
            <span style={badge(resultBadge.bg, resultBadge.fg)}>{resultBadge.label}</span>
          </div>
          <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16, fontSize: 14.5, lineHeight: 1.6, color: colors.textDark }}>
            {result.content}
          </div>

          {mode === 'ai-copy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={copyResult} style={{ ...buttonSecondary, alignSelf: 'flex-start' }}>Copy for external chat</button>
              <label>
                <div style={label}>Paste back the reply</div>
                <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)} style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} />
              </label>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: colors.textBody }}>Date</label>
            <input value={saveDate} onChange={(e) => setSaveDate(e.target.value)} style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${colors.inputBorder}`, fontSize: 13.5 }} />
            <button
              onClick={save}
              disabled={saving || (mode === 'ai-copy' && !pastedText.trim())}
              style={{ ...buttonPrimary, marginLeft: 'auto' }}
            >
              {saving ? 'Saving…' : 'Save prompt'}
            </button>
          </div>
        </section>
      )}

      {mode === 'personal' && (
        <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          <label>
            <div style={label}>Date</div>
            <input value={saveDate} onChange={(e) => setSaveDate(e.target.value)} style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${colors.inputBorder}`, fontSize: 13.5 }} />
          </label>
          <label>
            <div style={label}>Your prompt</div>
            <textarea value={personalContent} onChange={(e) => setPersonalContent(e.target.value)} style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} />
          </label>
          <button onClick={save} disabled={saving || !personalContent.trim()} style={{ ...buttonPrimary, alignSelf: 'flex-start' }}>
            {saving ? 'Saving…' : 'Save prompt'}
          </button>
        </section>
      )}

      <section style={{ background: '#fdf5e6', border: `1px dashed ${colors.gold}`, borderRadius: 16, padding: '18px 22px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          value={guidanceNote}
          onChange={(e) => setGuidanceNote(e.target.value)}
          placeholder="Add a standing guidance note, e.g. keep it under 150 words"
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${colors.gold}`, background: '#fff', fontSize: 13.5 }}
        />
        <button onClick={addGuidance} style={{ flex: 'none', background: 'none', border: `1px solid ${colors.gold}`, color: colors.goldText, padding: '10px 18px', borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Add note
        </button>
      </section>
    </PageShell>
  );
}
