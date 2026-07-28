import { Link, useLocation } from 'react-router-dom';
import { colors, fonts, headingStyle } from '../theme';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', shape: '50%', iconColor: colors.accent, match: (p) => p === '/' },
  {
    label: 'Words',
    href: '/words',
    shape: '30% 70% 70% 30% / 60% 40% 60% 40%',
    iconColor: colors.sageDot,
    match: (p) => p === '/words' || (p.startsWith('/words/') && p !== '/words/add'),
  },
  { label: 'Add Word', href: '/words/add', shape: '6px', iconColor: colors.gold, match: (p) => p === '/words/add' },
  { label: 'Generate Prompt', href: '/generate', shape: '50%', iconColor: colors.accent, match: (p) => p === '/generate' },
  {
    label: 'Journal',
    href: '/history',
    shape: '4px',
    iconColor: colors.textMuted,
    match: (p) => p === '/history' || p.startsWith('/history/'),
  },
  { label: 'Master Prompt', href: '/templates', shape: '4px 12px', iconColor: colors.goldText, match: (p) => p === '/templates' },
  { label: 'AI Settings', href: '/settings', shape: '50% 4px', iconColor: colors.sageDot, match: (p) => p === '/settings' },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <div
      style={{
        width: 240,
        flex: 'none',
        height: '100%',
        minHeight: '100vh',
        background: colors.sidebarBg,
        borderRight: `1px solid ${colors.inputBorder}`,
        padding: '28px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        boxSizing: 'border-box',
        fontFamily: fonts.body,
      }}
    >
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={{ position: 'relative', width: 34, height: 44 }}>
          <div style={{ position: 'absolute', left: 15, top: 0, width: 4, height: 44, background: colors.gold, borderRadius: 2 }} />
          <div style={{ position: 'absolute', left: 2, top: 2, width: 30, height: 30, borderRadius: '50%', background: colors.card, border: `2px solid ${colors.border}` }} />
          <div style={{ position: 'absolute', left: 2, top: 18, width: 30, height: 30, borderRadius: '50%', background: colors.goldBg, border: `2px solid ${colors.border}` }} />
          <div style={{ position: 'absolute', left: 6, top: 6, width: 8, height: 6, borderRadius: '50%', background: colors.accent, opacity: 0.85 }} />
          <div style={{ position: 'absolute', left: 18, top: 24, width: 6, height: 5, borderRadius: '50%', background: colors.sageDot, opacity: 0.8 }} />
        </div>
        <div style={{ ...headingStyle, fontSize: 19, color: colors.textDark, letterSpacing: 0.2 }}>Dango</div>
      </Link>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.label}
              to={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 12,
                background: active ? colors.goldBg : 'transparent',
                textDecoration: 'none',
              }}
            >
              <div style={{ width: 22, height: 22, borderRadius: item.shape, background: item.iconColor, flex: 'none' }} />
              <span style={{ fontWeight: active ? 700 : 600, fontSize: 15, color: active ? colors.textDark : colors.textBody }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: 'auto',
          padding: 14,
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          fontSize: 12.5,
          lineHeight: 1.5,
          color: colors.textBody,
        }}
      >
        Sweet consistency beats big pushes. One word a day still counts.
      </div>
    </div>
  );
}
