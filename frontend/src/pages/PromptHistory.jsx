import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { api } from '../api/client';
import { colors, headingStyle, card, badge } from '../theme';

function badgeStyle(type) {
  if (type === 'ai') return [colors.errorBg, colors.accent];
  if (type === 'manual-template') return [colors.goldBgAlt, colors.goldText];
  return [colors.sageBg, colors.sageText];
}

export default function PromptHistory() {
  const [prompts, setPrompts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setPrompts(await api.get('/prompts'));
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  return (
    <PageShell maxWidth="900px">
      <div style={{ ...headingStyle, fontSize: 28, marginBottom: 24 }}>Journal</div>

      {error && <div style={{ ...card, borderColor: colors.errorBorder, color: colors.errorText, marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {prompts.map((p) => {
          const [bg, fg] = badgeStyle(p.generatedBy);
          const imageCount = p.imageCount || 0;
          return (
            <Link
              key={p._id}
              to={`/history/${p._id}`}
              style={{ ...card, borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 20, textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ flex: 'none', width: 90, fontSize: 13, fontWeight: 700, color: colors.textMuted }}>{p.date}</div>
              <span style={badge(bg, fg)}>{p.generatedBy}</span>
              <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: colors.textBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content}</div>
              {imageCount > 0 && (
                <div style={{ flex: 'none', position: 'relative', width: imageCount > 1 ? 52 : 44, height: 44 }}>
                  {imageCount > 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 8,
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: 'repeating-linear-gradient(135deg, #f0e6d0, #f0e6d0 8px, #e8dcc3 8px, #e8dcc3 16px)',
                        border: `2px solid ${colors.card}`,
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'repeating-linear-gradient(135deg, #f0e6d0, #f0e6d0 8px, #e8dcc3 8px, #e8dcc3 16px)',
                      border: `2px solid ${colors.card}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: colors.textMuted,
                    }}
                  >
                    {imageCount > 1 ? `+${imageCount}` : ''}
                  </div>
                </div>
              )}
              <span style={{ flex: 'none', color: colors.textFaint }}>→</span>
            </Link>
          );
        })}
        {prompts.length === 0 && <div style={{ color: colors.textMuted, fontSize: 14 }}>No prompts saved yet.</div>}
      </div>
    </PageShell>
  );
}
