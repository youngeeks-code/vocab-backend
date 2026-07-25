import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import { api } from '../api/client';
import { colors, headingStyle, card, badge } from '../theme';

function neglectInfo(word) {
  if (word.priority) return { label: 'Priority', bg: colors.errorBg, fg: colors.accent };
  if (!word.lastUsed) return { label: 'never used', bg: colors.errorBg, fg: colors.errorText };
  const days = Math.floor((Date.now() - new Date(word.lastUsed).getTime()) / 86400000);
  if (days <= 3) return { label: days === 0 ? 'used today' : `${days}d ago`, bg: colors.sageBg, fg: colors.sageText };
  if (days <= 10) return { label: `${days}d ago`, bg: colors.goldBgAlt, fg: colors.goldText };
  return { label: `neglected ${days}d`, bg: colors.errorBg, fg: colors.errorText };
}

export default function Dashboard() {
  const [dueWords, setDueWords] = useState([]);
  const [recentPrompts, setRecentPrompts] = useState([]);
  const [guidance, setGuidance] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [words, prompts, guidanceNotes, aiSettings] = await Promise.all([
          api.get('/words?dueOnly=true'),
          api.get('/prompts'),
          api.get('/prompts/guidance?includeUsed=false'),
          api.get('/ai-settings'),
        ]);
        setDueWords(words);
        setRecentPrompts(prompts.slice(0, 3));
        setGuidance(guidanceNotes);
        setAiStatus(aiSettings);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  async function markUsed(id) {
    try {
      await api.patch(`/words/${id}/use`);
      setDueWords((prev) => prev.filter((w) => w._id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <PageShell maxWidth="1080px">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ ...headingStyle, fontSize: 28 }}>Good day 🍡</div>
          <div style={{ color: colors.textMuted, fontSize: 14.5, marginTop: 4 }}>Here's what's ripe for review today.</div>
        </div>
        {aiStatus && (
          <div style={badge(colors.sageBg, colors.sageText)}>
            {aiStatus.providers[aiStatus.activeProvider]?.hasApiKey ? 'AI ready' : 'No AI key configured'}
          </div>
        )}
      </div>

      {error && <div style={{ ...card, borderColor: colors.errorBorder, color: colors.errorText, marginBottom: 20 }}>{error}</div>}

      <section
        style={{
          background: colors.accent,
          borderRadius: 20,
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          boxShadow: '0 8px 24px -8px rgba(168,57,29,0.5)',
          marginBottom: 36,
        }}
      >
        <div>
          <div style={{ ...headingStyle, fontSize: 21, color: colors.accentText }}>Generate today's prompt</div>
          <div style={{ color: '#f3d9c8', fontSize: 14, marginTop: 6 }}>Pulls your due words into one writing prompt for today's journal.</div>
        </div>
        <Link
          to="/generate"
          style={{ flex: 'none', background: colors.accentText, color: colors.accent, border: 'none', padding: '14px 26px', borderRadius: 999, fontWeight: 700, fontSize: 15.5, boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}
        >
          Generate →
        </Link>
      </section>

      <section style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
          <div style={{ ...headingStyle, fontSize: 19 }}>Due today</div>
          <div style={badge(colors.goldBg, colors.goldText)}>{dueWords.length}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: 16 }}>
          {dueWords.map((w) => {
            const n = neglectInfo(w);
            return (
              <div key={w._id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ ...headingStyle, fontSize: 20 }}>{w.word}</span>
                    <span style={{ color: colors.textFaint, fontSize: 13.5, marginLeft: 8 }}>{w.reading}</span>
                  </div>
                  {w.priority && <span style={badge(colors.errorBg, colors.accent)}>Priority</span>}
                </div>
                <div style={{ color: colors.textBody, fontSize: 14, lineHeight: 1.4 }}>{w.definition?.text}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={badge(n.bg, n.fg)}>{n.label}</span>
                  <button onClick={() => markUsed(w._id)} style={{ background: 'none', border: `1px solid ${colors.inputBorder}`, color: colors.textBody, padding: '6px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                    Mark used
                  </button>
                </div>
              </div>
            );
          })}
          {dueWords.length === 0 && <div style={{ color: colors.textMuted, fontSize: 14 }}>Nothing due right now.</div>}
        </div>
      </section>

      <section style={{ marginBottom: 36 }}>
        <div style={{ ...headingStyle, fontSize: 19, marginBottom: 16 }}>Recent prompts</div>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 6 }}>
          {recentPrompts.map((p) => (
            <Link
              key={p._id}
              to={`/history/${p._id}`}
              style={{ flex: 'none', width: 260, ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, color: 'inherit', textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: colors.textFaint, fontWeight: 600 }}>{p.date}</span>
                <span style={badge(colors.goldBgAlt, colors.goldText)}>{p.generatedBy}</span>
              </div>
              <div style={{ fontSize: 13, color: colors.textBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content}</div>
            </Link>
          ))}
          {recentPrompts.length === 0 && <div style={{ color: colors.textMuted, fontSize: 14 }}>No prompts yet.</div>}
        </div>
      </section>

      {guidance.length > 0 && (
        <section>
          <div style={{ ...headingStyle, fontSize: 19, marginBottom: 16 }}>Pending guidance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {guidance.map((g) => (
              <div key={g._id} style={{ ...card, padding: '12px 16px', fontSize: 13.5, color: colors.textBody }}>{g.note}</div>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
