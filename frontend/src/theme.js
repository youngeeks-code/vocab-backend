export const colors = {
  bg: '#f7f1e6',
  card: '#fffaf0',
  cardAlt: '#fdf9f0',
  border: '#e8dcc3',
  inputBorder: '#ddc9a0',
  sidebarBg: '#ecdfc7',

  accent: '#a8391d',
  accentHover: '#8a2d15',
  accentText: '#fff8ee',

  sageBg: '#e3ecd9',
  sageBorder: '#cddab8',
  sageText: '#4a6741',
  sageDot: '#5b7a4c',

  gold: '#d9b972',
  goldBg: '#f4e3c4',
  goldBgAlt: '#faedc9',
  goldText: '#8a6a12',

  errorBg: '#f6dfd4',
  errorBorder: '#eab8a0',
  errorText: '#8a2d15',

  textDark: '#3a2c22',
  textBody: '#5b4c3c',
  textMuted: '#8a7358',
  textFaint: '#a08a6d',
};

export const fonts = {
  heading: "'Quicksand', sans-serif",
  body: "'Nunito', system-ui, sans-serif",
  mono: "ui-monospace, Menlo, monospace",
};

export const headingStyle = { fontFamily: fonts.heading, fontWeight: 700 };

export const card = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 18,
  padding: '22px 24px',
};

export const buttonPrimary = {
  background: colors.accent,
  color: colors.accentText,
  border: 'none',
  padding: '12px 24px',
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 14.5,
  cursor: 'pointer',
  boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
};

export const buttonSecondary = {
  background: 'none',
  border: `1px solid ${colors.inputBorder}`,
  color: colors.textBody,
  padding: '10px 18px',
  borderRadius: 999,
  fontWeight: 600,
  fontSize: 13.5,
  cursor: 'pointer',
};

export const buttonDanger = {
  background: 'none',
  border: `1px solid ${colors.errorBg}`,
  color: colors.accent,
  padding: '10px 18px',
  borderRadius: 999,
  fontWeight: 600,
  fontSize: 13.5,
  cursor: 'pointer',
};

export const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  borderRadius: 12,
  border: `1px solid ${colors.inputBorder}`,
  fontSize: 14.5,
};

export const label = {
  fontSize: 12.5,
  fontWeight: 700,
  color: colors.textBody,
  marginBottom: 6,
};

export const badge = (bg, fg) => ({
  background: bg,
  color: fg,
  fontSize: 11.5,
  fontWeight: 700,
  padding: '3px 10px',
  borderRadius: 999,
});
