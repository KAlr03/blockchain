import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context.js";
import { useLang } from "../features/lang/lang-context.js";
const ROLES = [
  { key:"ADMIN",        label:"Admin",        sub:"System management" },
  { key:"AUTHORITY",    label:"Authority",    sub:"Certificate review" },
  { key:"MANUFACTURER", label:"Manufacturer", sub:"Product registration" },
  { key:"CUSTOMER",     label:"Customer",     sub:"Verify products" },
];

export function LoginPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const { tr, lang, setLang } = useLang();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Email address is required."); return; }
    if (!password)     { setError("Password is required."); return; }
    setError(""); setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error && err.message.includes("pending") ? err.message : "Invalid email or password. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <main className="login-page">
      <button onClick={() => setLang(lang === "en" ? "ar" : "en")}
        style={{ position:"absolute", top:"1.5rem", right:"1.5rem", background:"rgba(255,255,255,0.15)", color:"white", border:"1px solid rgba(255,255,255,0.3)", padding:"0.3rem 0.75rem", borderRadius:"7px", cursor:"pointer", fontSize:"0.8rem" }}>
        {lang === "en" ? "العربية" : "English"}
      </button>

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🌿</div>
          <h1>{tr("appName")}</h1>
          <p>{tr("appSub")}</p>
        </div>

        <div className="role-selector">
          <label>{tr("selectRole")}</label>
          <div className="role-buttons">
            {ROLES.map(r => (
              <button key={r.key} type="button"
                className={`role-btn${selectedRole === r.key ? " active" : ""}`}
                onClick={() => { setSelectedRole(r.key); setError(""); }}>
                <span className="role-label">{r.label}</span>
                <span className="role-sub">{r.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{tr("email")}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" autoComplete="email" />
          </div>
          <div className="form-group">
            <label>{tr("password")}</label>
            <div style={{ position:"relative" }}>
              <input type={showPassword?"text":"password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password" autoComplete="current-password" style={{ paddingRight:"2.5rem" }} />
              <button type="button" onClick={()=>setShowPassword(p=>!p)} style={{ position:"absolute", right:"0.6rem", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:"1rem", color:"#888" }}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? tr("loading") : tr("login")}
          </button>
        </form>

        <p style={{ textAlign:"center", marginTop:"1rem", fontSize:"0.85rem", color:"var(--text-muted)" }}>
          New customer?{" "}
          <Link to="/signup" style={{ color:"var(--green)", fontWeight:600 }}>Create an account</Link>
        </p>
      </div>
    </main>
  );
}

