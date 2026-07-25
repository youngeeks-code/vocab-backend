import { useEffect, useState } from 'react';
import { api, setStoredPassword, ApiError } from '../api/client';
import { colors, fonts, headingStyle, buttonPrimary, inputStyle, label } from '../theme';

export default function PasswordGate({ children }) {
  const [status, setStatus] = useState('checking'); // checking | ok | needed
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  async function probe() {
    try {
      await api.get('/ai-settings');
      setStatus('ok');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setStatus('needed');
      } else {
        // backend unreachable or a non-auth error — let the app render,
        // individual pages will surface the real problem.
        setStatus('ok');
      }
    }
  }

  useEffect(() => {
    probe();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setStoredPassword(input);
    setError('');
    try {
      await api.get('/ai-settings');
      setStatus('ok');
    } catch (err) {
      setStoredPassword('');
      setError('Wrong password.');
    }
  }

  if (status === 'checking') return null;

  if (status === 'needed') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.bg,
          fontFamily: fonts.body,
        }}
      >
        <form
          onSubmit={onSubmit}
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            padding: '32px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            width: 320,
          }}
        >
          <div style={{ ...headingStyle, fontSize: 20, color: colors.textDark }}>🍡 Dango</div>
          <label>
            <div style={label}>App password</div>
            <input
              type="password"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={inputStyle}
            />
          </label>
          {error && <div style={{ color: colors.errorText, fontSize: 13 }}>{error}</div>}
          <button type="submit" style={buttonPrimary}>Unlock</button>
        </form>
      </div>
    );
  }

  return children;
}
