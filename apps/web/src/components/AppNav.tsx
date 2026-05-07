import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context.js";
import { useLang } from "../features/lang/lang-context.js";
import { useTheme } from "../features/theme/theme-context.js";
import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";

export function AppNav() {
  const { user, logout, token } = useAuth();
  const { lang, setLang, tr } = useLang();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const role = user?.role ?? "";
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (role !== "AUTHORITY") return;
    async function load() {
      try {
        const certs = await apiRequest<any[]>("/certificates", {}, token ?? undefined);
        setPendingCount(certs.filter((c: any) => c.status === "UNDER_AUTHORITY_REVIEW").length);
      } catch {}
    }
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [role, token]);

  const allLinks = [
    { to: "/dashboard",    labelKey: "dashboard",     roles: ["ADMIN","AUTHORITY","MANUFACTURER","CUSTOMER"] },
    { to: "/users",        labelKey: "userManagement", roles: ["ADMIN"] },
    { to: "/products",     labelKey: "products",       roles: ["ADMIN","MANUFACTURER"] },
    { to: "/certificates", labelKey: "certificates",   roles: ["ADMIN","AUTHORITY","MANUFACTURER"] },
    { to: "/traceability", labelKey: "traceability",   roles: ["ADMIN","AUTHORITY","MANUFACTURER"] },
    { to: "/verify",       labelKey: "publicVerify",   roles: ["ADMIN","AUTHORITY","MANUFACTURER","CUSTOMER"] },
    { to: "/profile",      labelKey: "profile",        roles: ["ADMIN","AUTHORITY","MANUFACTURER","CUSTOMER"] },
  ];

  const links = allLinks.filter(l => l.roles.includes(role));

  return (
    <header className="app-nav">
      <div className="nav-brand">
        <span style={{ fontSize: "1.3rem" }}>🌿</span>
        <div>
          <strong>{tr("appName")}</strong>
          <p>{user?.name} · <span style={{ opacity: 0.6, fontSize: "0.68rem" }}>{role}</span></p>
        </div>
      </div>

      <nav className="nav-links">
        {links.map(link => (
          <NavLink key={link.to} to={link.to} end={link.to === "/dashboard"}
            className={({ isActive }) => isActive ? "active" : ""}>
            <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              {tr(link.labelKey)}
              {link.to === "/certificates" && role === "AUTHORITY" && pendingCount > 0 && (
                <span style={{
                  background: "#e74c3c", color: "#fff", borderRadius: "50%",
                  fontSize: "0.6rem", fontWeight: 700, minWidth: "1.1rem", height: "1.1rem",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 0.2rem"
                }}>
                  {pendingCount}
                </span>
              )}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="nav-right">
        {/* Dark mode toggle — white moon */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "1.2rem",
            padding: "0.25rem 0.4rem",
            borderRadius: "6px",
            lineHeight: 1,
            filter: "brightness(0) invert(1)",
            opacity: isDark ? 1 : 0.7,
            transition: "opacity 0.2s",
          }}
        >
          {isDark ? "☀️" : "🌙"}
        </button>

        <button className="lang-btn" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
          {lang === "en" ? "العربية" : "English"}
        </button>
        <button className="logout-btn" onClick={logout}>{tr("logout")}</button>
      </div>
    </header>
  );
}
