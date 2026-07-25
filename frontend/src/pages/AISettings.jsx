import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import { api } from '../api/client';
import { colors, headingStyle, card, buttonPrimary, inputStyle, label } from '../theme';

export default function AISettings() {
  const [settings, setSettings] = useState(null);
  const [activeProvider, setActiveProvider] = useState('anthropic');
  const [anthropicModel, setAnthropicModel] = useState('');
  const [anthropicKeyInput, setAnthropicKeyInput] = useState('');
  const [geminiModel, setGeminiModel] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  async function load() {
    try {
      const data = await api.get('/ai-settings');
      setSettings(data);
      setActiveProvider(data.activeProvider);
      setAnthropicModel(data.providers.anthropic.model);
      setGeminiModel(data.providers.gemini.model);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    setError('');
    setSavedMessage('');
    try {
      const body = {
        activeProvider,
        anthropic: { model: anthropicModel, ...(anthropicKeyInput ? { apiKey: anthropicKeyInput } : {}) },
        gemini: { model: geminiModel, ...(geminiKeyInput ? { apiKey: geminiKeyInput } : {}) },
      };
      const data = await api.put('/ai-settings', body);
      setSettings(data);
      setAnthropicKeyInput('');
      setGeminiKeyInput('');
      setSavedMessage('Saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function clearKey(provider) {
    setError('');
    try {
      const data = await api.put('/ai-settings', { [provider]: { apiKey: '' } });
      setSettings(data);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!settings) {
    return <PageShell maxWidth="760px">{error ? <div style={{ ...card, borderColor: colors.errorBorder, color: colors.errorText }}>{error}</div> : 'Loading…'}</PageShell>;
  }

  const providerCards = [
    {
      key: 'anthropic',
      name: 'Anthropic',
      model: anthropicModel,
      setModel: setAnthropicModel,
      keyInput: anthropicKeyInput,
      setKeyInput: setAnthropicKeyInput,
      hasNote: false,
      note: '',
      preview: settings.providers.anthropic.apiKeyPreview,
      hasKey: settings.providers.anthropic.hasApiKey,
      source: settings.providers.anthropic.apiKeySource,
    },
    {
      key: 'gemini',
      name: 'Gemini',
      model: geminiModel,
      setModel: setGeminiModel,
      keyInput: geminiKeyInput,
      setKeyInput: setGeminiKeyInput,
      hasNote: true,
      note: settings.providers.gemini.note,
      preview: settings.providers.gemini.apiKeyPreview,
      hasKey: settings.providers.gemini.hasApiKey,
      source: settings.providers.gemini.apiKeySource,
    },
  ];

  return (
    <PageShell maxWidth="760px">
      <div style={{ ...headingStyle, fontSize: 28, marginBottom: 20 }}>AI settings</div>

      {error && <div style={{ ...card, borderColor: colors.errorBorder, color: colors.errorText, marginBottom: 20 }}>{error}</div>}
      {savedMessage && <div style={{ ...card, borderColor: colors.sageBorder, color: colors.sageText, marginBottom: 20 }}>{savedMessage}</div>}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {providerCards.map((p) => (
          <div key={p.key} style={{ flex: 1, minWidth: 280, background: colors.card, border: `2px solid ${activeProvider === p.key ? colors.accent : colors.border}`, borderRadius: 18, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="radio" name="provider" checked={activeProvider === p.key} onChange={() => setActiveProvider(p.key)} />
                <span style={{ ...headingStyle, fontSize: 16.5 }}>{p.name}</span>
              </label>
              {activeProvider === p.key && <span style={{ background: colors.sageBg, color: colors.sageText, fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>active</span>}
            </div>

            {p.hasNote && (
              <div style={{ background: '#fdf5e6', border: `1px dashed ${colors.gold}`, borderRadius: 10, padding: '10px 12px', fontSize: 12, color: colors.goldText }}>{p.note}</div>
            )}

            <label>
              <div style={label}>Model</div>
              <input value={p.model} onChange={(e) => p.setModel(e.target.value)} style={{ ...inputStyle, padding: '9px 12px', fontSize: 13.5 }} />
            </label>
            <label>
              <div style={label}>API key</div>
              <input
                type="password"
                value={p.keyInput}
                onChange={(e) => p.setKeyInput(e.target.value)}
                placeholder={p.preview || 'Not set'}
                style={{ ...inputStyle, padding: '9px 12px', fontSize: 13.5 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ fontSize: 11.5, color: colors.textFaint }}>
                  {p.hasKey ? `Key set via ${p.source}.` : 'No key configured.'}
                </span>
                {p.hasKey && p.source === 'settings' && (
                  <button onClick={() => clearKey(p.key)} style={{ background: 'none', border: 'none', color: colors.accent, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    Clear key
                  </button>
                )}
              </div>
            </label>
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saving} style={{ ...buttonPrimary, marginTop: 22 }}>{saving ? 'Saving…' : 'Save settings'}</button>
    </PageShell>
  );
}
