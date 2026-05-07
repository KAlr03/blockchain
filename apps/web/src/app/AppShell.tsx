import { Outlet, useNavigate } from "react-router-dom";
import { AppNav } from "../components/AppNav.js";
import { useLang } from "../features/lang/lang-context.js";

export function AppShell() {
  const navigate = useNavigate();
  const { isRTL } = useLang();
  return (
    <div className="app-shell" dir={isRTL ? "rtl" : "ltr"}>
      <AppNav />
      <main className="app-content">
        <style>{`
          @keyframes halal-page-in {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .page-transition {
            animation: halal-page-in 0.22s ease;
          }
        `}</style>
        <div className="page-nav">
          <button className="back-btn" onClick={() => navigate(-1)}>{isRTL ? "→ رجوع" : "← Back"}</button>
          <button className="forward-btn" onClick={() => navigate(1)}>{isRTL ? "→ أمام" : "Forward →"}</button>
        </div>
        <div className="page-transition">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
