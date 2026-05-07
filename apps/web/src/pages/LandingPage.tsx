import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context.js";
import { useLang } from "../features/lang/lang-context.js";
import { useTheme } from "../features/theme/theme-context.js";
import { apiRequest } from "../api/client.js";
import type { VerificationDto } from "@halal/shared";

interface Review { id: string; name: string; role: string; comment: string; stars: number; createdAt: string; }
function isArabic(text: string) { return /[\u0600-\u06FF]/.test(text); }

const ROLES = [
  { key:"ADMIN",        labelKey:"admin",        subKey:"adminSub" },
  { key:"AUTHORITY",    labelKey:"authority",    subKey:"authoritySub" },
  { key:"MANUFACTURER", labelKey:"manufacturer", subKey:"manufacturerSub" },
  { key:"CUSTOMER",     labelKey:"customer",     subKey:"customerSub" },
];

function getStatus(v: VerificationDto, tr: (k:string)=>string) {
  const s = (v.certificate?.status ?? "").toLowerCase();
  if (s==="approved"||s==="valid"||s==="active") return { cls:"approved", icon:"✅", title:tr("halalCertified"), sub:tr("halalCertifiedSub") };
  if (s==="rejected"||s==="notvalid"||s==="invalid") return { cls:"rejected", icon:"❌", title:tr("notCertified"), sub:tr("notCertifiedSub") };
  if (s==="expired") return { cls:"rejected", icon:"⏰", title:tr("certExpired"), sub:tr("certExpiredSub") };
  return { cls:"pending", icon:"⏳", title:tr("underReviewStatus"), sub:tr("underReviewSub") };
}

export function LandingPage() {
  const navigate = useNavigate();
  const { login, token, authReady } = useAuth();
  const { tr, lang, setLang } = useLang();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => { if (authReady && token) navigate("/dashboard", { replace: true }); }, [authReady, token]);

  const [showVerify, setShowVerify]     = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [modalTab, setModalTab]         = useState<"login"|"signup">("login");
  const [productId, setProductId]       = useState("");
  const [verification, setVerification] = useState<VerificationDto|null>(null);
  const [verifyError, setVerifyError]   = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [showCamera, setShowCamera]     = useState(false);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const [selectedRole, setSelectedRole] = useState<string|null>(null);
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [loginError, setLoginError]     = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [suName, setSuName]             = useState("");
  const [suEmail, setSuEmail]           = useState("");
  const [suPassword, setSuPassword]     = useState("");
  const [suConfirm, setSuConfirm]       = useState("");
  const [suCountry, setSuCountry]       = useState("Kuwait");
  const [suError, setSuError]           = useState("");
  const [suSuccess, setSuSuccess]       = useState("");
  const [suLoading, setSuLoading]       = useState(false);
  const [reviews, setReviews]           = useState<Review[]>([]);
  const [showReviews, setShowReviews]   = useState(false);
  const [revName, setRevName]           = useState("");
  const [revRole, setRevRole]           = useState("Customer");
  const [revComment, setRevComment]     = useState("");
  const [revStars, setRevStars]         = useState(5);
  const [revError, setRevError]         = useState("");
  const [revSuccess, setRevSuccess]     = useState("");
  const [revLoading, setRevLoading]     = useState(false);

  useEffect(() => { if (!showCamera) stopCamera(); }, [showCamera]);
  useEffect(() => { apiRequest<Review[]>("/reviews").then(setReviews).catch(() => {}); }, []);

  async function handleReviewSubmit(e: FormEvent) {
    e.preventDefault();
    if (!revName.trim() || !revComment.trim()) { setRevError("Name and comment are required."); return; }
    if (revComment.trim().length < 10) { setRevError("Comment must be at least 10 characters."); return; }
    setRevError(""); setRevLoading(true);
    try {
      const r = await apiRequest<Review>("/reviews", { method:"POST", body:JSON.stringify({ name:revName.trim(), role:revRole, comment:revComment.trim(), stars:revStars }) });
      setReviews(prev => [r, ...prev]);
      setRevSuccess("Thank you for your review!"); setRevName(""); setRevComment(""); setRevStars(5);
      setTimeout(() => setRevSuccess(""), 3000);
    } catch (err) { setRevError(err instanceof Error ? err.message : "Failed to submit."); }
    finally { setRevLoading(false); }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:"environment" } });
      streamRef.current = stream; setShowCamera(true);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); if ("BarcodeDetector" in window) scanLoop(); } }, 200);
    } catch { alert(tr("cameraAccessDenied")); }
  }
  function stopCamera() { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setShowCamera(false); }
  async function scanLoop() {
    if (!videoRef.current || !streamRef.current) return;
    try {
      const detector = new (window as any).BarcodeDetector({ formats:["qr_code"] });
      const check = async () => {
        if (!videoRef.current || !streamRef.current) return;
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) { const raw = codes[0].rawValue as string; const match = raw.match(/\/verify\/(.+)/); const id = match?match[1]:raw; stopCamera(); setProductId(id); await doVerify(id); }
        else { setTimeout(check, 400); }
      };
      check();
    } catch {}
  }
  async function doVerify(id: string) {
    if (!id.trim()) { setVerifyError(tr("enterProductId")); return; }
    setVerifyError(""); setVerifyLoading(true); setVerification(null);
    try { setVerification(await apiRequest<VerificationDto>(`/verify/${id.trim()}`)); }
    catch { setVerifyError(tr("productNotFound")); }
    finally { setVerifyLoading(false); }
  }
  async function handleVerify(e: FormEvent) { e.preventDefault(); await doVerify(productId); }
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!selectedRole) { setLoginError("Please select your role first."); return; }
    if (!email.trim()) { setLoginError("Email is required."); return; }
    if (!password) { setLoginError("Password is required."); return; }
    setLoginError(""); setLoginLoading(true);
    try { await login(email.trim(), password, selectedRole); setShowModal(false); navigate("/dashboard", { replace: true }); }
    catch (err) { setLoginError(err instanceof Error && err.message==="ROLE_MISMATCH" ? "Wrong role selected." : err instanceof Error && err.message.includes("pending") ? err.message : "Invalid email or password."); }
    finally { setLoginLoading(false); }
  }
  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    if (!suName.trim()) { setSuError("Full name is required."); return; }
    if (!suEmail.trim()) { setSuError("Email is required."); return; }
    if (suPassword.length < 8) { setSuError("Password must be at least 8 characters."); return; }
    if (suPassword !== suConfirm) { setSuError("Passwords do not match."); return; }
    setSuError(""); setSuLoading(true);
    try {
      await apiRequest("/auth/register", { method:"POST", body:JSON.stringify({ name:suName.trim(), email:suEmail.trim(), password:suPassword, country:suCountry, organizationName:"Customer", manufacturerId:"CUSTOMER", role:"CUSTOMER", status:"ACTIVE" }) });
      setSuSuccess("Account created! You can now sign in."); setSuName(""); setSuEmail(""); setSuPassword(""); setSuConfirm("");
      setTimeout(() => { setSuSuccess(""); setModalTab("login"); }, 2000);
    } catch (err) { setSuError(err instanceof Error ? err.message : "Registration failed."); }
    finally { setSuLoading(false); }
  }

  const status = verification ? getStatus(verification, tr) : null;

  return (
    <div className="landing-page">
      <div style={{ position:"fixed", top:"1rem", right:"1rem", zIndex:50, display:"flex", gap:"0.5rem" }}>
        <button onClick={toggleTheme} title={isDark?"Light mode":"Dark mode"} style={{ background:"rgba(45,74,48,0.7)", border:"1px solid rgba(200,217,184,0.3)", borderRadius:6, cursor:"pointer", padding:"0.3rem 0.5rem", filter:"brightness(0) invert(1)", fontSize:"1rem", opacity:isDark?1:0.75 }}>
          {isDark?"☀️":"🌙"}
        </button>
        <button className="lang-btn" style={{ background:"rgba(45,74,48,0.7)", color:"rgba(255,255,255,0.85)", border:"1px solid rgba(200,217,184,0.3)" }} onClick={() => setLang(lang==="en"?"ar":"en")}>
          {lang==="en"?"العربية":"English"}
        </button>
      </div>

      <div className="landing-hero">
        <div className="landing-logo">🌿</div>
        <h1 className="landing-title">{tr("appName")}</h1>
        <p className="landing-tagline">{tr("tagline")}</p>
        <p className="landing-desc">{tr("description")}</p>
        <div className="landing-btns">
          <button className="landing-btn-primary" onClick={() => { setShowVerify(true); setShowModal(false); }}>{tr("verifyHalal")}</button>
          <button className="landing-btn-secondary" onClick={() => { setShowModal(true); setShowVerify(false); setModalTab("login"); }}>{tr("signIn")}</button>
        </div>
        <div style={{ display:"flex", justifyContent:"center", gap:"2rem", marginTop:"2.5rem", flexWrap:"wrap" }}>
          {[{icon:"🏭",key:"howItWorks1"},{icon:"🤖",key:"howItWorks2"},{icon:"⚖️",key:"howItWorks3"},{icon:"🔍",key:"howItWorks4"}].map((item,i)=>(
            <div key={i} style={{ textAlign:"center", maxWidth:"140px" }}>
              <div style={{ fontSize:"1.75rem", marginBottom:"0.4rem" }}>{item.icon}</div>
              <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.55)", lineHeight:1.6 }}>{tr(item.key)}</div>
            </div>
          ))}
        </div>
      </div>

      {showVerify && (
        <div style={{ background:"var(--sage-pale)", padding:"2rem" }}>
          <div className="landing-verify">
            <h2>{tr("verifyTitle")}</h2>
            <p>{tr("verifySubtitle")}</p>
            <form onSubmit={handleVerify}>
              <div className="verify-input-row">
                <input value={productId} onChange={e=>setProductId(e.target.value)} placeholder={tr("enterProductIdPlaceholder")} />
                <button type="button" className="camera-btn" onClick={startCamera} title={tr("pointCamera")}>📷</button>
                <button type="submit" className="btn btn-gold" disabled={verifyLoading}>{verifyLoading?tr("checking"):tr("verify")}</button>
              </div>
            </form>
            {showCamera && (
              <div className="qr-scanner-container" style={{ marginTop:"1rem" }}>
                <video ref={videoRef} playsInline muted style={{ width:"100%", maxHeight:260, objectFit:"cover", display:"block", borderRadius:10 }} />
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                  <div style={{ width:170, height:170, border:"3px solid #c8d9b8", borderRadius:12, boxShadow:"0 0 0 2000px rgba(0,0,0,0.45)" }} />
                </div>
                <button onClick={stopCamera} style={{ position:"absolute", top:"0.5rem", right:"0.5rem", background:"rgba(0,0,0,0.6)", color:"white", border:"none", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:"0.9rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                <p style={{ textAlign:"center", fontSize:"0.8rem", color:"rgba(255,255,255,0.8)", padding:"0.5rem", background:"rgba(0,0,0,0.5)", margin:0 }}>{tr("pointCamera")}</p>
              </div>
            )}
            {verifyError && <div className="error-msg" style={{ marginTop:"1rem" }}>{verifyError}</div>}
            {verification && status && (
              <div style={{ marginTop:"1.25rem" }}>
                <div className={`status-banner ${status.cls}`}>
                  <div className="status-icon">{status.icon}</div>
                  <div><div className="status-title">{status.title}</div><div className="status-sub">{status.sub}</div></div>
                </div>
                <h3 style={{ fontWeight:700, marginBottom:"0.5rem", color:"var(--charcoal)" }}>{verification.product.productName}</h3>
                <div className="verify-grid">
                  {verification.product.originCountry && <div><div className="vd-label">{tr("origin")}</div><div className="vd-value">{verification.product.originCountry}</div></div>}
                  {verification.certificate?.authority && <div><div className="vd-label">{tr("authorityName")}</div><div className="vd-value">{verification.certificate.authority}</div></div>}
                  {verification.certificate?.certType && <div><div className="vd-label">{tr("certType")}</div><div className="vd-value">{verification.certificate.certType}</div></div>}
                  {verification.certificate?.expiryDate && <div><div className="vd-label">{tr("validUntil")}</div><div className="vd-value">{new Date(verification.certificate.expiryDate).toLocaleDateString()}</div></div>}
                </div>
                {verification.blockchain.isAnchored && (
                  <div className="blockchain-box"><h4>⛓️ {tr("blockchainAnchored")}</h4><p>This certificate has been permanently recorded on the blockchain.</p></div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reviews collapsible panel */}
      <div style={{ background: isDark?"#0F172A":"var(--cream)", borderTop:"1px solid var(--border)" }}>
        <div style={{ maxWidth:860, margin:"0 auto" }}>
          <button onClick={() => setShowReviews(o => !o)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1.25rem 1.5rem", background:"transparent", border:"none", cursor:"pointer" }}>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontWeight:700, fontSize:"1rem", color:isDark?"#F1F5F9":"var(--charcoal)" }}>
                Customer Reviews {reviews.length>0 && <span style={{ fontSize:"0.8rem", fontWeight:400, color:"var(--text-muted)" }}>({reviews.length})</span>}
              </div>
              <div style={{ fontSize:"0.78rem", color:"var(--text-muted)", marginTop:"0.15rem" }}>{showReviews?"Click to collapse":"Click to read reviews and write your own"}</div>
            </div>
            <span style={{ fontSize:"0.85rem", color:"var(--text-muted)", display:"inline-block", transition:"transform 0.2s", transform:showReviews?"rotate(180deg)":"rotate(0deg)" }}>▼</span>
          </button>
          {showReviews && (
            <div style={{ padding:"0 1.5rem 2rem" }}>
              {revSuccess && <div className="success-msg" style={{ marginBottom:"1rem" }}>{revSuccess}</div>}
              <div className="card" style={{ marginBottom:"1.5rem" }}>
                <div className="card-header"><span className="card-title">Write a Review</span></div>
                <form onSubmit={handleReviewSubmit}>
                  <div className="form-row">
                    <div className="form-group"><label>Your Name *</label><input value={revName} onChange={e=>setRevName(e.target.value)} placeholder="e.g. Ali Al-Kuwait" /></div>
                    <div className="form-group"><label>Your Role *</label>
                      <select value={revRole} onChange={e=>setRevRole(e.target.value)}>
                        <option value="Customer">Customer</option>
                        <option value="Manufacturer">Manufacturer</option>
                        <option value="Authority">Authority</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Rating *</label>
                    <div style={{ display:"flex", gap:"0.25rem", alignItems:"center" }}>
                      {[1,2,3,4,5].map(s=>(
                        <button key={s} type="button" onClick={()=>setRevStars(s)} style={{ fontSize:"1.6rem", background:"none", border:"none", cursor:"pointer", lineHeight:1, padding:"0.1rem", filter:s<=revStars?"none":"grayscale(1) opacity(0.3)", transform:s<=revStars?"scale(1.1)":"scale(1)", transition:"all 0.1s" }}>⭐</button>
                      ))}
                      <span style={{ fontSize:"0.82rem", color:"var(--text-muted)", marginLeft:"0.4rem" }}>{revStars} / 5</span>
                    </div>
                  </div>
                  <div className="form-group"><label>Comment * (min 10 characters)</label><textarea value={revComment} onChange={e=>setRevComment(e.target.value)} placeholder="Share your experience..." style={{ minHeight:"80px" }} /></div>
                  {revError && <div className="error-msg">{revError}</div>}
                  <button type="submit" className="btn btn-primary" disabled={revLoading}>{revLoading?"Submitting...":"Submit Review"}</button>
                </form>
              </div>
              {reviews.length===0
                ? <div style={{ textAlign:"center", color:"var(--text-muted)", padding:"2rem 0", fontSize:"0.9rem" }}>No reviews yet. Be the first!</div>
                : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"1rem" }}>
                    {reviews.map(r=>(
                      <div key={r.id} dir={isArabic(r.comment)?"rtl":"ltr"} style={{ background:isDark?"#1E293B":"white", borderRadius:"var(--radius-lg)", padding:"1.1rem", boxShadow:"0 1px 4px rgba(0,0,0,0.07)", border:"1px solid var(--border)", color:isDark?"#F1F5F9":"inherit" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.5rem" }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:"0.9rem" }}>{r.name}</div>
                            <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:"0.1rem" }}>{r.role} · {r.createdAt?new Date(r.createdAt).toLocaleString([],{dateStyle:"medium",timeStyle:"short"}):""}</div>
                          </div>
                          <div style={{ fontSize:"0.85rem", color:"#f59e0b" }}>{"★".repeat(r.stars)}{"☆".repeat(5-r.stars)}</div>
                        </div>
                        <p style={{ fontSize:"0.85rem", margin:0, lineHeight:1.6 }}>{r.comment}</p>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}
        </div>
      </div>

      {!showVerify && (
        <div style={{ background:isDark?"#0a1628":"var(--cream)", padding:"2rem", borderTop:"1px solid var(--border)" }}>
          <div style={{ maxWidth:800, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"1.5rem", textAlign:"center" }}>
            {[{value:"P.A.F.N.",key:"pafnKuwait"},{value:"AI",key:"aiVerification"},{value:"Blockchain",key:"tamperProof"},{value:"QR",key:"realTime"}].map(s=>(
              <div key={s.key}><div style={{ fontSize:"1.2rem", fontWeight:800, color:"var(--sage-dark)" }}>{s.value}</div><div style={{ fontSize:"0.78rem", color:"var(--text-muted)", marginTop:"0.25rem" }}>{tr(s.key)}</div></div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) setShowModal(false); }}>
          <div className="modal-card">
            <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            <div className="modal-logo"><span className="modal-logo-icon">🌿</span><h2>{tr("appName")}</h2><p>{tr("appSub")}</p></div>
            <div className="modal-tabs">
              <button className={`modal-tab${modalTab==="login"?" active":""}`} onClick={()=>setModalTab("login")}>{tr("signIn")}</button>
              <button className={`modal-tab${modalTab==="signup"?" active":""}`} onClick={()=>setModalTab("signup")}>{tr("newCustomer")}</button>
            </div>
            {modalTab==="login"?(
              <form onSubmit={handleLogin}>
                <div className="role-selector"><label>{tr("selectRole")}</label>
                  <div className="role-buttons">
                    {ROLES.map(r=>(<button key={r.key} type="button" className={`role-btn${selectedRole===r.key?" active":""}`} onClick={()=>{setSelectedRole(r.key);setLoginError("");}}><span className="role-label">{tr(r.labelKey)}</span><span className="role-sub">{tr(r.subKey)}</span></button>))}
                  </div>
                </div>
                <div className="form-group"><label>{tr("email")}</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" /></div>
                <div className="form-group"><label>{tr("password")}</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></div>
                {loginError && <div className="error-msg">{loginError}</div>}
                <button type="submit" className="btn btn-primary btn-full" disabled={loginLoading}>{loginLoading?tr("signingIn"):tr("signIn")}</button>
              </form>
            ):(
              <form onSubmit={handleSignup}>
                <div className="form-group"><label>{tr("name")} *</label><input value={suName} onChange={e=>setSuName(e.target.value)} placeholder={tr("name")} /></div>
                <div className="form-group"><label>{tr("email")} *</label><input type="email" value={suEmail} onChange={e=>setSuEmail(e.target.value)} placeholder="your@email.com" /></div>
                <div className="form-group"><label>{tr("country")}</label><input value={suCountry} onChange={e=>setSuCountry(e.target.value)} placeholder="Kuwait" /></div>
                <div className="form-row">
                  <div className="form-group"><label>{tr("password")} *</label><input type="password" value={suPassword} onChange={e=>setSuPassword(e.target.value)} placeholder={tr("minPassword")} /></div>
                  <div className="form-group"><label>{tr("confirmPassword")} *</label><input type="password" value={suConfirm} onChange={e=>setSuConfirm(e.target.value)} placeholder={tr("repeatPassword")} /></div>
                </div>
                {suError && <div className="error-msg">{suError}</div>}
                {suSuccess && <div className="success-msg">{suSuccess}</div>}
                <button type="submit" className="btn btn-primary btn-full" disabled={suLoading}>{suLoading?tr("creatingAccount"):tr("createCustomerAccount")}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
