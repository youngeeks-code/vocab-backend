import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { api } from '../api/client';
import { colors, headingStyle, card, badge, buttonPrimary, buttonSecondary, inputStyle, label } from '../theme';

export default function AddWord() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null); // the picked Definition, or null for manual entry
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [manualWord, setManualWord] = useState('');
  const [manualReading, setManualReading] = useState('');
  const [manualDefinition, setManualDefinition] = useState('');

  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState(false);

  async function search(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    try {
      const data = await api.get(`/dictionary/search?word=${encodeURIComponent(query.trim())}`);
      setCandidates(data.candidates);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  function pickCandidate(c) {
    setSelected(c);
    setStep(2);
  }

  function enterManually() {
    setSelected(null);
    setStep(2);
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const body = selected
        ? {
            word: selected.word,
            reading: selected.reading,
            definition: selected,
            candidateDefinitions: candidates,
            tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
            notes,
            priority,
          }
        : {
            word: manualWord,
            reading: manualReading,
            definition: manualDefinition ? { text: manualDefinition, source: 'manual' } : undefined,
            tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
            notes,
            priority,
          };
      const created = await api.post('/words', body);
      navigate(`/words/${created._id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <PageShell maxWidth="820px">
      <div style={{ ...headingStyle, fontSize: 28, marginBottom: 8 }}>Add word</div>
      <div style={{ color: colors.textMuted, fontSize: 13.5, marginBottom: 24 }}>
        {step === 1 ? 'Step 1 — search the dictionary' : 'Step 2 — confirm details'}
      </div>

      {error && <div style={{ ...card, borderColor: colors.errorBorder, color: colors.errorText, marginBottom: 20 }}>{error}</div>}

      {step === 1 && (
        <div>
          <form onSubmit={search} style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a word, e.g. 食べる"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="submit" disabled={searching} style={buttonPrimary}>{searching ? 'Searching…' : 'Search'}</button>
            <button type="button" onClick={enterManually} style={buttonSecondary}>Enter manually</button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 460, overflowY: 'auto' }}>
            {candidates.map((c, i) => (
              <div key={i} style={{ ...card, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ ...headingStyle, fontSize: 16 }}>{c.word}</span>
                    <span style={{ color: colors.textFaint, fontSize: 12.5 }}>{c.reading}</span>
                    {c.isCommon && <span style={badge(colors.sageBg, colors.sageText)}>common</span>}
                    {c.jlpt?.length > 0 && <span style={badge(colors.goldBgAlt, colors.goldText)}>{c.jlpt.join(', ')}</span>}
                  </div>
                  <div style={{ color: colors.textBody, fontSize: 13.5, marginTop: 4 }}>{c.text}</div>
                  <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{c.partOfSpeech}</div>
                  {c.altSpellings?.length > 0 && (
                    <div style={{ color: colors.textFaint, fontSize: 11.5, marginTop: 2 }}>
                      alt: {c.altSpellings.map((a) => a.word).join(', ')}
                    </div>
                  )}
                </div>
                <button onClick={() => pickCandidate(c)} style={buttonSecondary}>Select</button>
              </div>
            ))}
            {candidates.length === 0 && !searching && <div style={{ color: colors.textMuted, fontSize: 14 }}>No results yet — search above.</div>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {selected ? (
            <section style={card}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ ...headingStyle, fontSize: 22 }}>{selected.word}</span>
                <span style={{ color: colors.textFaint, fontSize: 14 }}>{selected.reading}</span>
                {selected.isCommon && <span style={badge(colors.sageBg, colors.sageText)}>common</span>}
                {selected.jlpt?.length > 0 && <span style={badge(colors.goldBgAlt, colors.goldText)}>{selected.jlpt.join(', ')}</span>}
              </div>
              <div style={{ color: colors.textBody, fontSize: 15, marginTop: 10 }}>{selected.text}</div>
              <div style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>{selected.partOfSpeech}</div>
              {selected.altSpellings?.length > 0 && (
                <div style={{ color: colors.textFaint, fontSize: 12.5, marginTop: 4 }}>
                  alt: {selected.altSpellings.map((a) => a.word).join(', ')}
                </div>
              )}
              <button onClick={() => setStep(1)} style={{ marginTop: 10, background: 'none', border: 'none', color: colors.accent, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                Change definition
              </button>
            </section>
          ) : (
            <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label>
                <div style={label}>Word</div>
                <input value={manualWord} onChange={(e) => setManualWord(e.target.value)} style={inputStyle} />
              </label>
              <label>
                <div style={label}>Reading</div>
                <input value={manualReading} onChange={(e) => setManualReading(e.target.value)} style={inputStyle} />
              </label>
              <label>
                <div style={label}>Definition</div>
                <textarea value={manualDefinition} onChange={(e) => setManualDefinition(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
              </label>
            </section>
          )}

          <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label>
              <div style={label}>Tags (comma-separated)</div>
              <input value={tags} onChange={(e) => setTags(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <div style={label}>Notes</div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: colors.accent }}>Priority</span>
            </label>
          </section>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setStep(1)} style={buttonSecondary}>Back</button>
            <button onClick={save} disabled={saving || (!selected && !manualWord.trim())} style={buttonPrimary}>
              {saving ? 'Saving…' : 'Save word'}
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
