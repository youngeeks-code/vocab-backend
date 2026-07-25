import Sidebar from './Sidebar';
import { colors, fonts } from '../theme';

export default function PageShell({ maxWidth = '1080px', children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg, fontFamily: fonts.body, color: colors.textDark }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, padding: '40px 48px 56px', maxWidth, boxSizing: 'border-box' }}>
        {children}
      </main>
    </div>
  );
}
