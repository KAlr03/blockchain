import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLang } from "../features/lang/lang-context.js";
import { apiRequest } from "../api/client.js";

export function SignupPage() {
  const navigate = useNavigate();
  const { tr, lang, setLang } = useLang();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [country, setCountry]   = useState("Kuwait");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim())    { setError("Full name is required."); return; }
    if (!email.trim())   { setError("Email address is required."); return; }
    if (!password)       { setError("Password is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setError(""); setLoading(true);
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, country, organizationName: "Customer", manufacturerId: "CUSTOMER", role: "CUSTOMER", status: "ACTIVE" })
      });
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
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
          <p>Create a customer account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          </div>
          <div className="form-group">
            <label>{tr("email")}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div className="form-group">
            <label>Country</label>
            <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Kuwait" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{tr("password")}</label>
              <div style={{ position:"relative" }}>
                <input type={showPassword?"text":"password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" style={{ paddingRight:"2.5rem" }} />
                <button type="button" onClick={()=>setShowPassword(p=>!p)} style={{ position:"absolute", right:"0.6rem", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:"1rem", color:"#888" }}>
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <div style={{ position:"relative" }}>
                <input type={showPassword?"text":"password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" style={{ paddingRight:"2.5rem" }} />
              </div>
            </div>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? tr("loading") : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign:"center", marginTop:"1rem", fontSize:"0.85rem", color:"var(--text-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color:"var(--green)", fontWeight:600 }}>Sign in</Link>
        </p>
      </div>
    </main>
  );
}
