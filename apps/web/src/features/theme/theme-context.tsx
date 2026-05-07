import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface ThemeCtx { isDark: boolean; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeCtx>({ isDark: false, toggleTheme: () => {} });

const DARK_CSS = `
  body { background: #0F172A !important; color: #F1F5F9 !important; }
  .app-nav { background: #0F172A !important; border-bottom: 1px solid #334155 !important; }
  .app-nav .nav-brand strong { color: #F1F5F9 !important; }
  .app-nav .nav-brand p { color: #94A3B8 !important; }
  .nav-links a { color: #94A3B8 !important; }
  .nav-links a.active { background: #1E40AF !important; color: #fff !important; }
  .nav-links a:hover { background: #1E293B !important; color: #F1F5F9 !important; }
  .card { background: #1E293B !important; border-color: #334155 !important; color: #F1F5F9 !important; }
  .card-title { color: #F1F5F9 !important; }
  .stat-card { background: #1E293B !important; border-color: #334155 !important; color: #F1F5F9 !important; }
  .stat-value { color: #F1F5F9 !important; }
  .stat-label { color: #94A3B8 !important; }
  .stat-card.stat-blue { background: #1E3A5F !important; }
  .stat-card.stat-amber { background: #2D1E00 !important; }
  .stat-card.stat-red { background: #2D0A0A !important; }
  .page-header h1 { color: #93C5FD !important; }
  .page-header p { color: #94A3B8 !important; }
  input, select, textarea { background: #0F172A !important; color: #F1F5F9 !important; border-color: #334155 !important; }
  input::placeholder, textarea::placeholder { color: #64748B !important; }
  input:focus, select:focus, textarea:focus { border-color: #2563EB !important; }
  .btn-primary { background: #2563EB !important; border-color: #2563EB !important; color: #fff !important; }
  .btn-primary:hover { background: #1D4ED8 !important; }
  .btn-outline { border-color: #2563EB !important; color: #93C5FD !important; background: transparent !important; }
  .btn-ghost { color: #94A3B8 !important; background: transparent !important; }
  .btn-ghost:hover { background: #1E293B !important; color: #F1F5F9 !important; }
  .btn-approve { background: #1E40AF !important; }
  .cert-card { background: #1E293B !important; border-color: #334155 !important; }
  .cert-card-title { color: #F1F5F9 !important; }
  .cert-card-sub { color: #94A3B8 !important; }
  .cert-field .cf-label { color: #94A3B8 !important; }
  .cert-field .cf-value { color: #F1F5F9 !important; }
  .ai-box { background: #162032 !important; border-color: #334155 !important; }
  .ai-box-label { color: #94A3B8 !important; }
  .ai-verdict-text { color: #93C5FD !important; }
  .blockchain-box { background: #162032 !important; border-color: #334155 !important; }
  .blockchain-box h4 { color: #93C5FD !important; }
  .blockchain-box p { color: #94A3B8 !important; }
  .history-item { border-bottom-color: #334155 !important; }
  .history-item-name { color: #F1F5F9 !important; }
  .history-item-meta { color: #94A3B8 !important; }
  .empty-state { color: #94A3B8 !important; }
  .empty-icon { filter: grayscale(0.5) !important; }
  .product-card { background: #1E293B !important; border-color: #334155 !important; }
  .product-name { color: #F1F5F9 !important; }
  .product-meta { color: #94A3B8 !important; }
  .product-id-chip { background: #162032 !important; color: #93C5FD !important; }
  .badge { opacity: 0.9 !important; }
  .modal-overlay { background: rgba(0,0,0,0.8) !important; }
  .modal-card { background: #1E293B !important; border-color: #334155 !important; color: #F1F5F9 !important; }
  .form-group label { color: #94A3B8 !important; }
  .error-msg { background: #2D0A0A !important; color: #FCA5A5 !important; border-color: #991B1B !important; }
  .success-msg { background: #052e16 !important; color: #86EFAC !important; border-color: #166534 !important; }
  .app-content { background: #0F172A !important; }
  .page-nav button { background: #1E293B !important; color: #94A3B8 !important; border-color: #334155 !important; }
  .workflow-step { background: #162032 !important; border-color: #334155 !important; }
  .workflow-step-num { background: #2563EB !important; }
  .workflow-step-label { color: #94A3B8 !important; }
  .workflow-arrow { color: #334155 !important; }
  .capability-item { color: #94A3B8 !important; }
  .user-row { border-bottom-color: #334155 !important; }
  .user-role-badge { filter: brightness(0.8) !important; }
  .trace-item .trace-dot { background: #1E293B !important; border-color: #334155 !important; }
  .trace-stage { color: #F1F5F9 !important; }
  .trace-meta { color: #94A3B8 !important; }
  .verify-standalone { background: linear-gradient(135deg, #0F172A 0%, #0a1e3a 100%) !important; }
  .verify-container .card, .verify-result { background: #1E293B !important; border-color: #334155 !important; }
  :root { --green: #2563EB; --sage: #1D4ED8; --sage-dark: #93C5FD; --sage-pale: #1e3a5f; --charcoal: #F1F5F9; --cream: #1E293B; --border: #334155; --text-muted: #94A3B8; }
  .history-item { background: transparent !important; }
  .page-grid { background: transparent !important; }
  .stats-grid { background: transparent !important; }
  .cert-list { background: transparent !important; }
  .product-list { background: transparent !important; }
  .workflow-steps { background: transparent !important; }
  .capability-list { background: transparent !important; }
  .cert-actions { background: transparent !important; }
  .landing-page, .landing-hero { background: #0a1628 !important; }
  .landing-how-step { background: #1E293B !important; }
  .landing-how-step p { color: #94A3B8 !important; }
  .landing-how-step span { color: #F1F5F9 !important; }
  .verify-container > div { background: #1E293B !important; }
  .verify-result { background: #1E293B !important; }
  .verify-grid > div { background: transparent !important; }
  .vd-label { color: #94A3B8 !important; }
  .vd-value { color: #F1F5F9 !important; }
  .status-banner.approved { background: #052e16 !important; }
  .status-banner.rejected { background: #2D0A0A !important; }
  .status-banner.pending  { background: #2D1E00 !important; }
  .info-msg { background: #1E293B !important; color: #94A3B8 !important; }
  .trace-timeline { background: transparent !important; }
  .qr-scanner-container { background: #0F172A !important; }
  .cert-card-meta { background: transparent !important; }
  [class*="form-row"] { background: transparent !important; }
  .page-header { background: transparent !important; }
  h1, h2, h3, h4 { color: #F1F5F9 !important; }
  p { color: #94A3B8; }
  label { color: #94A3B8 !important; }
`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("halal-theme") === "dark"; } catch { return false; }
  });

  useEffect(() => {
    let styleEl = document.getElementById("halal-dark-mode") as HTMLStyleElement | null;
    if (isDark) {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "halal-dark-mode";
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = DARK_CSS;
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      if (styleEl) styleEl.textContent = "";
      document.documentElement.removeAttribute("data-theme");
    }
    try { localStorage.setItem("halal-theme", isDark ? "dark" : "light"); } catch {}
  }, [isDark]);

  function toggleTheme() { setIsDark(d => !d); }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
