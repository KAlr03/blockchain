import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { VerificationDto } from "@halal/shared";
import { apiRequest } from "../api/client.js";
import { useLang } from "../features/lang/lang-context.js";
import { useAuth } from "../features/auth/auth-context.js";

const STAGE_ICONS: Record<string,string> = { "Slaughter":"🔪","Processing":"🏭","Packaging":"📦","Cold Storage":"❄️","Shipment":"🚢","Port Arrival":"⚓","Customs Clearance":"🛃","Transportation":"🚛","Distribution":"🏪","Retail":"🛒" };

function getStatus(v: VerificationDto) {
  const s = (v.certificate?.status ?? "").toLowerCase();
  if (s==="approved"||s==="valid"||s==="active") return { cls:"approved", icon:"✅", title:"HALAL CERTIFIED", sub:"This product holds a valid, blockchain-verified halal certificate.", color:"var(--green)" };
  if (s==="rejected"||s==="notvalid"||s==="invalid") return { cls:"rejected", icon:"❌", title:"NOT CERTIFIED", sub:"This product's halal certificate was rejected.", color:"var(--red)" };
  if (s==="expired") return { cls:"rejected", icon:"⏰", title:"CERTIFICATE EXPIRED", sub:"The halal certificate for this product has expired.", color:"var(--red)" };
  return { cls:"pending", icon:"⏳", title:"UNDER REVIEW", sub:"This product's certification is currently under review.", color:"var(--amber)" };
}

export function VerifyPage() {
  const { productId: paramId } = useParams();
  const { lang, setLang, tr } = useLang();
  const { user, token } = useAuth(); // ← added token
  const isCustomer = user?.role === "CUSTOMER";
  const [productId, setProductId] = useState(paramId ?? "");
  const [verification, setVerification] = useState<VerificationDto|null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [saved, setSaved] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream|null>(null);

  useEffect(() => { if (paramId) void doVerify(paramId); }, [paramId]);
  useEffect(() => { if (!showCamera) stopCamera(); }, [showCamera]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:"environment" } });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          void scanLoop();
        }
      }, 200);
    } catch { alert("Camera access denied. Please enter Product ID manually."); }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  }

  async function scanLoop() {
    if (!videoRef.current || !streamRef.current) return;
    try {
      const jsQRModule = await import("jsqr");
      const jsQR = (jsQRModule as any).default || jsQRModule;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const check = () => {
        if (!videoRef.current || !streamRef.current) return;
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // @ts-ignore
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
          if (code) {
            const raw = code.data as string;
            const match = raw.match(/\/verify\/(.+)/);
            const id = match ? match[1] : raw;
            stopCamera(); setProductId(id); void doVerify(id);
            return;
          }
        }
        setTimeout(check, 300);
      };
      check();
    } catch (err) {
      console.error("QR scan error:", err);
      setError("QR scanning not supported on this browser. Please enter the Product ID manually.");
    }
  }

  async function doVerify(id: string) {
    if (!id.trim()) { setError(tr("enterProductId")); return; }
    setError(""); setLoading(true); setVerification(null); setSaved(false);
    try {
      const r = await apiRequest<VerificationDto>(`/verify/${id.trim()}`);
      setVerification(r);

      // ← Save scan history to API (not localStorage)
      if (isCustomer && token) {
        try {
          await apiRequest("/scan-history", {
            method: "POST",
            body: JSON.stringify({ productId: id.trim() })
          }, token);
        } catch {
          // non-critical, ignore
        }
      }
    } catch { setError(tr("productNotFound")); }
    finally { setLoading(false); }
  }

  // ← Save favourite to API (not localStorage)
  async function saveToFavourites() {
    if (!token) return;
    try {
      await apiRequest("/favourites", {
        method: "POST",
        body: JSON.stringify({ productId: productId.trim() })
      }, token);
      setSaved(true);
    } catch (err) {
      console.error("Failed to save favourite", err);
    }
  }

  async function handleSubmit(e: FormEvent) { e.preventDefault(); await doVerify(productId); }

  const status = verification ? getStatus(verification) : null;

  return (
    <div className="verify-standalone">
      <div style={{ position:"absolute", top:"1rem", right:"1rem", display:"flex", gap:"0.5rem", zIndex:10 }}>
        <button onClick={() => setLang(lang==="en"?"ar":"en")} className="lang-btn" style={{ background:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.8)", border:"1px solid rgba(255,255,255,0.2)" }}>
          {lang==="en"?"العربية":"English"}
        </button>
      </div>

      <div className="verify-container">
        <div style={{ textAlign:"center", color:"white", marginBottom:"1.75rem", paddingTop:"1.5rem" }}>
          <div style={{ fontSize:"2.2rem", marginBottom:"0.4rem" }}>🌿</div>
          <h1 style={{ fontSize:"1.7rem", fontWeight:800 }}>HalalChain</h1>
          <p style={{ color:"rgba(255,255,255,0.6)", marginTop:"0.35rem", fontSize:"0.875rem" }}>Halal Product Verification — Kuwait P.A.F.N.</p>
        </div>

        <div style={{ background:"white", borderRadius:"var(--radius-lg)", padding:"1.35rem", marginBottom:"1.1rem", boxShadow:"var(--shadow-lg)" }}>
          <p style={{ fontSize:"0.85rem", color:"var(--text-muted)", marginBottom:"0.75rem", fontWeight:500 }}>{tr("verifyPageSub")}</p>
          <form onSubmit={handleSubmit}>
            <div className="verify-input-row">
              <input value={productId} onChange={e => setProductId(e.target.value)} placeholder={tr("enterProductIdPlaceholder")} />
              <button type="button" className="camera-btn" onClick={startCamera} title={tr("verifyBtn")}>📷</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading?tr("checkingLabel"):tr("verifyBtn")}</button>
            </div>
          </form>

          {showCamera && (
            <div className="qr-scanner-container" style={{ marginTop:"1rem" }}>
              <video ref={videoRef} playsInline muted style={{ width:"100%", maxHeight:250, objectFit:"cover", display:"block", borderRadius:10 }} />
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                <div style={{ width:165, height:165, border:"3px solid #7ecf9a", borderRadius:12, boxShadow:"0 0 0 2000px rgba(0,0,0,0.45)" }} />
              </div>
              <button onClick={stopCamera} style={{ position:"absolute", top:"0.5rem", right:"0.5rem", background:"rgba(0,0,0,0.6)", color:"white", border:"none", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:"0.9rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              <p style={{ textAlign:"center", fontSize:"0.78rem", color:"rgba(255,255,255,0.8)", padding:"0.45rem", background:"rgba(0,0,0,0.5)", margin:0 }}>Point camera at the QR code on the product</p>
            </div>
          )}
        </div>

        {error && <div style={{ background:"var(--red-light)", color:"var(--red)", padding:"0.85rem 1rem", borderRadius:"var(--radius)", marginBottom:"1rem", fontWeight:500, fontSize:"0.875rem" }}>{error}</div>}

        {verification && status && (
          <div className="verify-result">
            <div className={`status-banner ${status.cls}`}>
              <div className="status-icon">{status.icon}</div>
              <div>
                <div className="status-title">{status.title}</div>
                <div className="status-sub">{status.sub}</div>
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem" }}>
              <h3 style={{ fontWeight:700 }}>{verification.product.productName}</h3>
              {isCustomer && (
                <button className={`btn btn-sm ${saved?"btn-ghost":"btn-outline"}`} onClick={saveToFavourites} disabled={saved}>
                  {saved ? tr("savedBtn") : tr("saveToFavBtn")}
                </button>
              )}
            </div>

            <div className="verify-grid">
              {verification.product.brand && verification.product.brand !== "N/A" && <div><div className="vd-label">{tr("brandLabel")}</div><div className="vd-value">{verification.product.brand}</div></div>}
              {verification.product.originCountry && <div><div className="vd-label">{tr("originLabel")}</div><div className="vd-value">{verification.product.originCountry}</div></div>}
              {verification.certificate?.certType && <div><div className="vd-label">{tr("certTypeLabel")}</div><div className="vd-value">{verification.certificate.certType}</div></div>}
              {verification.certificate?.authority && <div><div className="vd-label">{tr("issuingAuthLabel")}</div><div className="vd-value">{verification.certificate.authority}</div></div>}
              {isCustomer && verification.certificate?.certNumber && <div><div className="vd-label">{tr("certNumberLabel")}</div><div className="vd-value" style={{ fontFamily:"monospace", fontSize:"0.8rem" }}>{verification.certificate.certNumber}</div></div>}
              {verification.certificate?.expiryDate && <div><div className="vd-label">{tr("validUntilLabel")}</div><div className="vd-value">{new Date(verification.certificate.expiryDate).toLocaleDateString("en-GB")}</div></div>}
            </div>

            {verification.blockchain.isAnchored && !isCustomer && (
              <div className="blockchain-box">
                <h4>{tr("blockchainVerifiedLabel")}</h4>
                <p>{tr("blockchainVerifiedMsg")}</p>
                {verification.blockchain.txId && <p style={{ fontSize:"0.78rem", color:"var(--text-muted)", wordBreak:"break-all", fontFamily:"monospace" }}>{verification.blockchain.txId}</p>}
                {verification.blockchain.timestamp && <p style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>Recorded: {new Date(verification.blockchain.timestamp).toLocaleString()}</p>}
              </div>
            )}
            {verification.blockchain.isAnchored && isCustomer && (
              <div style={{ background:"var(--sage-pale)", borderRadius:"var(--radius)", padding:"0.75rem 1rem", marginTop:"0.75rem", borderLeft:"3px solid var(--sage)" }}>
                <p style={{ fontSize:"0.85rem", fontWeight:600, color:"var(--sage-dark)", margin:0 }}>
                  {lang === "ar" ? "✅ هذه الشهادة مسجّلة بشكل دائم على البلوكشين ولا يمكن تعديلها." : "✅ This certificate is permanently recorded on the blockchain and cannot be altered."}
                </p>
              </div>
            )}

            {isCustomer && verification.traceability?.length > 0 && (
              <div>
                <h4 style={{ fontWeight:700, marginBottom:"0.75rem" }}>{tr("supplyChainSteps")} ({verification.traceability.length})</h4>
                <div className="trace-timeline">
                  {verification.traceability.map(r => (
                    <div key={r.id} className="trace-item">
                      <div className="trace-dot" style={{ width:28,height:28,fontSize:"0.85rem" }}>{STAGE_ICONS[r.stage]??"📍"}</div>
                      <div>
                        <div className="trace-stage">{r.stage}</div>
                        <div className="trace-meta">{r.location}{r.timestamp?` · ${new Date(r.timestamp).toLocaleDateString("en-GB")}`:""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isCustomer && (
              <div className="info-msg">
                <a href="/" style={{ color:"var(--blue)", fontWeight:600 }}>{tr("signIn")}</a> {tr("signInForDetails")}
              </div>
            )}
          </div>
        )}

        <p style={{ textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:"0.72rem", marginTop:"1.5rem" }}>
          Powered by HalalChain · Blockchain-Based Halal Verification · Kuwait
        </p>
      </div>
    </div>
  );
}
