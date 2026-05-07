import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CertificateDto } from "@halal/shared";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../features/auth/auth-context.js";
import { useLang } from "../features/lang/lang-context.js";
import { jsPDF } from "jspdf";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function buildFileUrl(filePath: string): string {
  if (!filePath) return "";
  if (filePath.startsWith("http")) return filePath;
  let p = filePath;
  if (p.includes("/uploads/")) p = p.substring(p.indexOf("/uploads/"));
  else if (p.toLowerCase().includes("uploads")) p = "/" + p.substring(p.toLowerCase().indexOf("uploads")).replace(/\\/g, "/");
  return `${API_BASE}${p}`;
}

async function exportCertAsPdf(cert: CertificateDto) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const green: [number,number,number]  = [45, 100, 60];
  const darkGray: [number,number,number] = [40, 40, 40];
  const lightGray: [number,number,number] = [245, 245, 245];
  const red: [number,number,number]    = [200, 50, 50];
  const blue: [number,number,number]   = [20, 80, 160];

  // Header bar
  doc.setFillColor(...green);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("HALAL SUPPLY CHAIN", 14, 9);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("Certificate Export Record", 14, 16);
  doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, 120, 16);

  // Title + status badge
  doc.setTextColor(...darkGray);
  doc.setFontSize(18); doc.setFont("helvetica", "bold");
  doc.text("Halal Certificate", 14, 34);

  const isApproved = cert.status === "APPROVED";
  const isRejected = cert.status === "REJECTED";
  const badgeColor: [number,number,number] = isApproved ? [34,139,34] : isRejected ? red : [180,120,20];
  doc.setFillColor(...badgeColor);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.roundedRect(150, 26, 46, 10, 3, 3, "F");
  doc.text(cert.status.replace(/_/g, " "), 173, 33, { align: "center" });

  // Details table
  const fields = [
    ["Certificate Number", cert.certNumber || "N/A"],
    ["Certificate Type",   cert.certType || "N/A"],
    ["Issuing Authority",  cert.authority || "N/A"],
    ["Issue Date",  cert.issueDate  ? new Date(cert.issueDate).toLocaleDateString("en-GB")  : "N/A"],
    ["Expiry Date", cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString("en-GB") : "N/A"],
    ["Approved By", cert.approvedBy || "Pending"],
    ["Uploaded",    cert.createdAt  ? new Date(cert.createdAt).toLocaleString("en-GB")      : "N/A"],
  ];

  let y = 44;
  fields.forEach(([label, value], i) => {
    if (i % 2 === 0) { doc.setFillColor(...lightGray); doc.rect(14, y - 4, 182, 8, "F"); }
    doc.setTextColor(100, 100, 100); doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(label, 16, y);
    doc.setTextColor(...darkGray); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(value, 80, y);
    y += 9;
  });

  // AI section
  if (cert.aiVerdict) {
    y += 4;
    const boxH = cert.aiReason ? 26 : 16;
    doc.setFillColor(255, 244, 244);
    doc.rect(14, y - 4, 182, boxH, "F");
    doc.setDrawColor(...red); doc.setLineWidth(0.4);
    doc.rect(14, y - 4, 182, boxH);
    doc.setTextColor(...red); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("AI VERIFICATION RESULT", 16, y + 1);
    const { label } = normalizeVerdict_export(cert.aiVerdict);
    const score = cert.aiScore != null ? Math.round(cert.aiScore <= 1 ? cert.aiScore * 100 : cert.aiScore) + "/100" : "N/A";
    doc.setFontSize(10);
    doc.text(`${label}   Score: ${score}`, 16, y + 9);
    if (cert.aiReason) {
      doc.setTextColor(...darkGray); doc.setFontSize(8); doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(cert.aiReason, 172);
      doc.text(lines.slice(0, 2), 16, y + 18);
    }
    y += boxH + 4;
  }

  // Blockchain section
  if (cert.blockchainTxId) {
    y += 2;
    doc.setFillColor(235, 245, 255);
    doc.rect(14, y - 4, 182, 18, "F");
    doc.setTextColor(...blue); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("BLOCKCHAIN TRANSACTION", 16, y + 1);
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    const txLines = doc.splitTextToSize(cert.blockchainTxId, 172);
    doc.text(txLines, 16, y + 8);
    y += 22;
  }

  // Attached certificate image
  if (cert.imagePath) {
    const fileUrl = buildFileUrl(cert.imagePath);
    const isPdf = cert.imagePath.toLowerCase().endsWith(".pdf");
    y += 4;
    doc.setTextColor(...darkGray); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Attached Halal Certificate:", 14, y);
    y += 6;
    if (isPdf) {
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...blue);
      doc.textWithLink("Open attached PDF certificate", 14, y, { url: fileUrl });
      y += 8;
    } else {
      try {
        const resp = await fetch(fileUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          const b64 = await new Promise<string>(res => {
            const r = new FileReader();
            r.onload = () => res((r.result as string).split(",")[1]);
            r.readAsDataURL(blob);
          });
          const ext = cert.imagePath.toLowerCase().endsWith(".png") ? "PNG" : "JPEG";
          const remaining = 280 - y;
          const imgH = Math.min(90, remaining);
          doc.addImage(b64, ext, 14, y, 130, imgH);
          y += imgH + 6;
        } else {
          doc.setFontSize(8); doc.setTextColor(...blue);
          doc.textWithLink("View certificate image", 14, y, { url: fileUrl });
          y += 8;
        }
      } catch {
        doc.setFontSize(8); doc.setTextColor(...blue);
        doc.textWithLink("View certificate image", 14, y, { url: fileUrl });
        y += 8;
      }
    }
  }

  // Health certificate
  if (cert.healthImagePath) {
    const fileUrl = buildFileUrl(cert.healthImagePath);
    const isPdf = cert.healthImagePath.toLowerCase().endsWith(".pdf");
    y += 2;
    doc.setTextColor(...darkGray); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Attached Health Certificate:", 14, y);
    y += 6;
    if (isPdf) {
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...blue);
      doc.textWithLink("Open attached PDF health certificate", 14, y, { url: fileUrl });
    } else {
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...blue);
      doc.textWithLink("View health certificate image", 14, y, { url: fileUrl });
    }
  }

  doc.save(`HalalCert_${(cert.certNumber || cert.id).replace(/[/\\?%*:|"<>]/g, "-")}.pdf`);
}

function normalizeVerdict_export(v: string) {
  const u = (v ?? "").toUpperCase();
  if (u.includes("APPROVED") || u.includes("LIKELY_VALID") || u.includes("PASS")) return { label: "APPROVED" };
  if (u.includes("REJECT") || u.includes("INVALID") || u.includes("FAIL")) return { label: "REJECTED" };
  return { label: v };
}

function CertFileViewer({ cert }: { cert: CertificateDto }) {
  const [halalImgError, setHalalImgError] = useState(false);
  const [healthImgError, setHealthImgError] = useState(false);
  if (!cert.imagePath && !cert.healthImagePath) return null;

  function FileBlock({ filePath, fileData, label, accent, imgError, setImgErr }: {
    filePath: string; fileData: string | null; label: string; accent: string;
    imgError: boolean; setImgErr: (v: boolean) => void;
  }) {
    const urlSrc = buildFileUrl(filePath);
    const isPdf = filePath.toLowerCase().endsWith(".pdf");
    // Use base64 data if available, otherwise fall back to URL
    const imgSrc = fileData ?? urlSrc;
    return (
      <div style={{ margin: "0.8rem 0", border: `1px solid ${accent}33`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.85rem", background: `${accent}18` }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: accent }}>{label}</div>
          <a href={imgSrc} target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: accent, color: "#fff", borderRadius: 6, padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
            {isPdf ? "Open PDF" : "View Full Image"} ↗
          </a>
        </div>
        {!isPdf && (
          <div style={{ background: "#f9f9f9", padding: "0.5rem" }}>
            {imgError ? (
              <div style={{ textAlign: "center", color: "#888", fontSize: "0.8rem", padding: "1rem" }}>
                Preview unavailable — click "View Full Image" above to open directly.
              </div>
            ) : (
              <img
                src={imgSrc}
                alt={label}
                style={{ width: "100%", maxHeight: 380, objectFit: "contain", borderRadius: 6, display: "block", cursor: "zoom-in" }}
                onError={() => setImgErr(true)}
                onClick={() => window.open(imgSrc, "_blank")}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {cert.imagePath && (
        <FileBlock filePath={cert.imagePath} fileData={cert.imageData ?? null} label="Halal Certificate" accent="#2d6440" imgError={halalImgError} setImgErr={setHalalImgError} />
      )}
      {cert.healthImagePath && (
        <FileBlock filePath={cert.healthImagePath} fileData={cert.healthImageData ?? null} label="Health / Food Safety Certificate" accent="#2563eb" imgError={healthImgError} setImgErr={setHealthImgError} />
      )}
    </div>
  );
}

function normalizeVerdict(v: string): { label:string; cls:string; } {
  const u = (v ?? "").toUpperCase();
  if (u.includes("APPROVED") || u.includes("LIKELY_VALID") || u.includes("PASS")) return { label:"APPROVED", cls:"" };
  if (u.includes("REJECT") || u.includes("INVALID") || u.includes("FAIL")) return { label:"REJECTED", cls:"ai-rejected" };
  if (u.includes("FLAG") || u.includes("REVIEW")) return { label:"FLAGGED", cls:"ai-flagged" };
  return { label: v, cls: "" };
}

function normalizeScore(score: number): string {
  if (!score && score !== 0) return "N/A";
  if (score <= 1) return Math.round(score * 100) + "/100";
  return Math.round(score) + "/100";
}

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  let cls = "badge ";
  let label = status;
  if (s === "approved" || s === "active") { cls += "badge-approved"; label = "Approved"; }
  else if (s === "rejected") { cls += "badge-rejected"; label = "Rejected"; }
  else if (s === "under_authority_review") { cls += "badge-pending"; label = "Under Review"; }
  else if (s === "pending_ai") { cls += "badge-pending"; label = "AI Processing"; }
  else { cls += "badge-pending"; label = status; }
  return <span className={cls}>{label}</span>;
}

function AIBox({ cert }: { cert: CertificateDto }) {
  if (!cert.aiVerdict) return null;
  const { label, cls } = normalizeVerdict(cert.aiVerdict);
  return (
    <div className={`ai-box ${cls}`}>
      <div className="ai-box-label">AI Verification Result</div>
      <div className="ai-box-row">
        <span className="ai-verdict-text">{label}</span>
        <span className="ai-score-text">Score: {normalizeScore(cert.aiScore)}</span>
      </div>
      {cert.aiReason && <p className="ai-reason-text">{cert.aiReason}</p>}
    </div>
  );
}

// ── ADMIN VIEW — read only ────────────────────────────────────────────────────
function AdminCertificates() {
  const { token } = useAuth();
  const { tr } = useLang();
  const [certificates, setCertificates] = useState<CertificateDto[]>([]);
  const [copied, setCopied] = useState<string|null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);

  useEffect(() => {
    apiRequest<CertificateDto[]>("/certificates", {}, token ?? undefined)
      .then(setCertificates).catch(() => {});
  }, [token]);

  function copyId(id: string) { navigator.clipboard.writeText(id); setCopied(id); setTimeout(()=>setCopied(null),1500); }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this certificate? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await apiRequest(`/certificates/${encodeURIComponent(id)}`, { method: "DELETE" }, token ?? undefined);
      setCertificates(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete certificate.");
    } finally { setDeleting(null); }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{tr("allCertsTitle")}</h1>
        <p style={{ color:"var(--amber)", fontWeight:500 }}>{tr("adminReadOnlyCerts")}</p>
      </div>
      {certificates.length === 0
        ? <div className="card"><div className="empty-state"><span className="empty-icon">📭</span><p>{tr("noItems")}</p></div></div>
        : <div className="cert-list">
            {certificates.map(cert => (
              <div key={cert.id} className="cert-card">
                <div className="cert-card-header">
                  <div><div className="cert-card-title">{cert.certNumber}</div><div className="cert-card-sub">{cert.certType} · {cert.authority}</div></div>
                  <StatusBadge status={cert.status} />
                </div>
                <div className="cert-card-meta">
                  {cert.issueDate && <div className="cert-field"><div className="cf-label">{tr("issueDate")}</div><div className="cf-value">{new Date(cert.issueDate).toLocaleDateString()}</div></div>}
                  {cert.expiryDate && (() => {
                    const exp = new Date(cert.expiryDate);
                    const now = new Date();
                    const days = Math.floor((exp.getTime() - now.getTime()) / (1000*60*60*24));
                    const isExpired = exp < now;
                    const expiringSoon = !isExpired && days <= 30;
                    return (
                      <div className="cert-field">
                        <div className="cf-label">{tr("expiryDate")}</div>
                        <div className="cf-value" style={{ color: isExpired ? "var(--red)" : expiringSoon ? "#b8860b" : undefined }}>
                          {exp.toLocaleDateString()}
                          {isExpired && " ⛔ EXPIRED"}
                          {expiringSoon && ` ⚠️ Expires in ${days} days`}
                        </div>
                      </div>
                    );
                  })()}
                  {cert.approvedBy && <div className="cert-field"><div className="cf-label">{tr("reviewedBy")}</div><div className="cf-value">{cert.approvedBy}</div></div>}
                </div>
                <AIBox cert={cert} />
                {cert.blockchainTxId && <div className="blockchain-box"><h4>{tr("blockchainVerified")}</h4><p>{cert.blockchainTxId}</p></div>}
                <CertFileViewer cert={cert} />
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => copyId(cert.id)}>{copied===cert.id?"Copied!":"Copy ID"}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => void exportCertAsPdf(cert)}>⬇️ Export PDF</button>
                  <button
                    className="btn btn-sm"
                    style={{ background:"var(--red,#e74c3c)", color:"#fff", border:"none" }}
                    disabled={deleting === cert.id}
                    onClick={() => handleDelete(cert.id)}
                  >
                    {deleting === cert.id ? "Deleting..." : "🗑 Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ── AUTHORITY VIEW — review queue ─────────────────────────────────────────────
function AuthorityCertificates() {
  const { token, user } = useAuth();
  const { tr } = useLang();
  const [certificates, setCertificates] = useState<CertificateDto[]>([]);
  const [notes, setNotes] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<"pending"|"all">("all");

  async function load() {
    apiRequest<CertificateDto[]>("/certificates", {}, token ?? undefined).then(setCertificates).catch(()=>{});
  }
  useEffect(() => { void load(); }, [token]);

  async function review(certId: string, approved: boolean) {
    const noteVal = (notes[certId] || "").trim();
    if (!noteVal) { setError("Please add authority notes before submitting a decision."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      await apiRequest(`/certificates/${encodeURIComponent(certId)}/review`, {
        method:"PATCH",
        body: JSON.stringify({ approved, approvedBy: user?.name||"Authority", authorityNotes: noteVal })
      }, token ?? undefined);
      setSuccess(`Certificate ${approved?"approved":"rejected"} and recorded on the blockchain.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed. Please try again.");
    } finally { setLoading(false); }
  }

  const pending = certificates.filter(c => c.status==="UNDER_AUTHORITY_REVIEW");
  const shown   = filter==="pending" ? pending : certificates;

  return (
    <div>
      <div className="page-header">
        <h1>{tr("allCertificates")}</h1>
        <p>{tr("reviewQueueDesc")}</p>
      </div>
      <div style={{ display:"flex", gap:"0.6rem", marginBottom:"1.1rem", flexWrap:"wrap", alignItems:"center" }}>
        <button className={`btn btn-sm ${filter==="all"?"btn-primary":"btn-ghost"}`} onClick={()=>setFilter("all")}>{tr("allCertificates")} ({certificates.length})</button>
        <button className={`btn btn-sm ${filter==="pending"?"btn-primary":"btn-ghost"}`} onClick={()=>setFilter("pending")}>{tr("pendingReviewQueue")} ({pending.length})</button>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft:"auto" }} onClick={load}>{tr("refreshBtn")}</button>
      </div>
      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}
      {shown.length===0
        ? <div className="card"><div className="empty-state"><span className="empty-icon">✅</span><p>No {filter==="pending"?"pending":""} certificates.</p></div></div>
        : <div className="cert-list">
            {shown.map(cert => {
              const isPending = cert.status==="UNDER_AUTHORITY_REVIEW";
              return (
                <div key={cert.id} className="cert-card">
                  <div className="cert-card-header">
                    <div><div className="cert-card-title">{cert.certNumber}</div><div className="cert-card-sub">{cert.certType} · {cert.authority}</div></div>
                    <StatusBadge status={cert.status} />
                  </div>
                  <div className="cert-card-meta">
                    {cert.issueDate && <div className="cert-field"><div className="cf-label">{tr("issueDate")}</div><div className="cf-value">{new Date(cert.issueDate).toLocaleDateString()}</div></div>}
                    {cert.expiryDate && (() => {
                    const exp = new Date(cert.expiryDate);
                    const now = new Date();
                    const days = Math.floor((exp.getTime() - now.getTime()) / (1000*60*60*24));
                    const isExpired = exp < now;
                    const expiringSoon = !isExpired && days <= 30;
                    return (
                      <div className="cert-field">
                        <div className="cf-label">{tr("expiryDate")}</div>
                        <div className="cf-value" style={{ color: isExpired ? "var(--red)" : expiringSoon ? "#b8860b" : undefined }}>
                          {exp.toLocaleDateString()}
                          {isExpired && " ⛔ EXPIRED"}
                          {expiringSoon && ` ⚠️ Expires in ${days} days`}
                        </div>
                      </div>
                    );
                  })()}
                    {cert.approvedBy && <div className="cert-field"><div className="cf-label">{tr("reviewedBy")}</div><div className="cf-value">{cert.approvedBy}</div></div>}
                  </div>
                  <AIBox cert={cert} />
                  <CertFileViewer cert={cert} />
                  {/* Export + View buttons always visible for authority */}
                  <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap", marginTop:"0.5rem" }}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>void exportCertAsPdf(cert)}>⬇️ Export PDF</button>
                    {cert.imagePath && (
                      <a href={buildFileUrl(cert.imagePath)} target="_blank" rel="noreferrer"
                        className="btn btn-ghost btn-sm" style={{ textDecoration:"none" }}>
                        🖼 View Certificate ↗
                      </a>
                    )}
                    {cert.healthImagePath && (
                      <a href={buildFileUrl(cert.healthImagePath)} target="_blank" rel="noreferrer"
                        className="btn btn-ghost btn-sm" style={{ textDecoration:"none" }}>
                        🔵 View Health Cert ↗
                      </a>
                    )}
                  </div>
                  {isPending && (
                    <>
                      <div className="form-group" style={{ marginBottom:"0.6rem", marginTop:"0.75rem" }}>
                        <label>{tr("authorityNotesRequired")}</label>
                        <textarea value={notes[cert.id]??""} onChange={e=>setNotes(p=>({...p,[cert.id]:e.target.value}))} placeholder={tr("authorityNotesPlaceholder")} style={{ minHeight:"60px" }} />
                      </div>
                      <div style={{ background:"#fff8e1", border:"1px solid #f9a825", borderRadius:6, padding:"0.5rem 0.75rem", marginBottom:"0.6rem", fontSize:"0.8rem", color:"#7c5c00" }}>
                        ⚠️ This decision will be permanently recorded on the blockchain and cannot be changed.
                      </div>
                      <div className="cert-actions">
                        <button className="btn btn-approve btn-sm" disabled={loading} onClick={()=>{if(window.confirm("Approve this certificate? This will be permanently recorded on the blockchain.")) void review(cert.id,true);}}>{tr("approveBtn")}</button>
                        <button className="btn btn-reject btn-sm" disabled={loading} onClick={()=>{if(window.confirm("Reject this certificate? This will be permanently recorded on the blockchain.")) void review(cert.id,false);}}>{tr("rejectBtn")}</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

// ── MANUFACTURER VIEW — upload + own certs ─────────────────────────────────────
function ManufacturerCertificates() {
  const { token } = useAuth();
  const { tr } = useLang();
  const [certificates, setCertificates] = useState<CertificateDto[]>([]);
  const [filter, setFilter] = useState<"all"|"APPROVED"|"UNDER_AUTHORITY_REVIEW"|"REJECTED">("all");
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string|null>(null);
  const [productId, setProductId]   = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [certType, setCertType]     = useState("HALAL");
  const [authority, setAuthority]   = useState("");
  const [issueDate, setIssueDate]   = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile]             = useState<File|null>(null);
  const [healthFile, setHealthFile] = useState<File|null>(null);

  const approved = certificates.filter(c => c.status === "APPROVED").length;
  const pending = certificates.filter(c => c.status === "UNDER_AUTHORITY_REVIEW" || c.status === "PENDING_AI").length;
  const rejected = certificates.filter(c => c.status === "REJECTED").length;
  const filtered = filter === "all" ? certificates : certificates.filter(c => c.status === filter);

  async function load() {
    apiRequest<CertificateDto[]>("/certificates",{},token??undefined).then(setCertificates).catch(()=>{});
  }
  useEffect(()=>{ void load(); },[token]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!productId.trim()) { setError("Product ID is required."); return; }
    if (!certNumber.trim()) { setError("Certificate number is required."); return; }
    if (!authority.trim()) { setError("Issuing authority is required."); return; }
    if (!issueDate) { setError("Issue date is required."); return; }
    if (!expiryDate) { setError("Expiry date is required."); return; }
    if (!file) { setError("Please select a halal certificate file."); return; }
    setError(""); setSuccess(""); setUploading(true);
    try {
      const fd = new FormData();
      fd.append("certificate",file);
      if (healthFile) fd.append("healthCertificate", healthFile);
      fd.append("productId",productId.trim());
      fd.append("certNumber",certNumber.trim()); fd.append("certType",certType);
      fd.append("authority",authority.trim());
      fd.append("issueDate",new Date(issueDate).toISOString());
      fd.append("expiryDate",new Date(expiryDate).toISOString());
      await apiRequest("/certificates/upload",{method:"POST",body:fd},token??undefined);
      setSuccess(tr("certUploadSuccess"));
      setProductId(""); setCertNumber(""); setAuthority(""); setIssueDate(""); setExpiryDate(""); setFile(null); setHealthFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally { setUploading(false); }
  }

  function copyId(id:string) { navigator.clipboard.writeText(id); setCopied(id); setTimeout(()=>setCopied(null),1500); }

  return (
    <div>
      <div className="page-header"><h1>{tr("myCertsTitle")}</h1><p>{tr("certUploadTitle")}</p></div>
      <div className="page-grid">
        <div className="card">
          <div className="card-header"><span className="card-title">{tr("certUploadTitle")}</span></div>
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label>{tr("productId")} <span style={{ color:"var(--red)" }}>*</span></label>
              <input value={productId} onChange={e=>setProductId(e.target.value)} placeholder="PROD-... (copy from Products page)" />
            </div>
            <div className="form-group">
              <label>{tr("certNumber")} <span style={{ color:"var(--red)" }}>*</span></label>
              <input value={certNumber} onChange={e=>setCertNumber(e.target.value)} placeholder="e.g. R-323M0006/17I000004" />
            </div>
            <div className="form-group">
              <label>{tr("certType")} <span style={{ color:"var(--red)" }}>*</span></label>
              <select value={certType} onChange={e=>setCertType(e.target.value)}>
                <option value="HALAL">Halal Certificate</option>
                <option value="FOOD_SAFETY">Food Safety / Health Certificate</option>
              </select>
            </div>
            <div className="form-group">
              <label>{tr("authorityName")} <span style={{ color:"var(--red)" }}>*</span></label>
              <input value={authority} onChange={e=>setAuthority(e.target.value)} placeholder="e.g. GULFTIC, IHC, SGS" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{tr("issueDate")} <span style={{ color:"var(--red)" }}>*</span></label>
                <input type="date" value={issueDate} onChange={e=>setIssueDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>{tr("expiryDate")} <span style={{ color:"var(--red)" }}>*</span></label>
                <input type="date" value={expiryDate} onChange={e=>setExpiryDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>{tr("halalCertFile")} <span style={{ color:"var(--red)" }}>*</span></label>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e:ChangeEvent<HTMLInputElement>)=>setFile(e.target.files?.[0]??null)} />
            </div>
            <div className="form-group">
              <label>{tr("healthCertFile")} <span style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>(optional)</span></label>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e:ChangeEvent<HTMLInputElement>)=>setHealthFile(e.target.files?.[0]??null)} />
            </div>
            {error && <div className="error-msg">{error}</div>}
            {success && <div className="success-msg">{success}</div>}
            <button type="submit" className="btn btn-primary btn-full" disabled={uploading}>
              {uploading ? "Uploading..." : tr("uploadCert")}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">{tr("myCertsTitle")} ({certificates.length})</span>
            <button className="btn btn-ghost btn-sm" onClick={load}>{tr("refreshBtn")}</button>
          </div>
          {certificates.length===0
            ? <div className="empty-state"><span className="empty-icon">📭</span><p>{tr("noItems")}</p></div>
            : <div className="cert-list">
                {certificates.map(cert=>(
                  <div key={cert.id} className="cert-card">
                    <div className="cert-card-header">
                      <div><div className="cert-card-title">{cert.certNumber}</div><div className="cert-card-sub">{cert.certType} · {cert.authority}</div></div>
                      <StatusBadge status={cert.status} />
                    </div>
                    {cert.createdAt && <div style={{ fontSize:"0.75rem", color:"var(--text-muted)", marginBottom:"0.5rem" }}>Uploaded: {new Date(cert.createdAt).toLocaleString()}</div>}
                    <AIBox cert={cert} />
                    {cert.blockchainTxId && <div className="blockchain-box"><h4>{tr("blockchainVerified")}</h4><p>{cert.blockchainTxId}</p></div>}
                    <CertFileViewer cert={cert} />
                    <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>copyId(cert.id)}>{copied===cert.id?"Copied!":"Copy ID"}</button>
                      <button className="btn btn-ghost btn-sm" onClick={()=>void exportCertAsPdf(cert)}>⬇️ Export PDF</button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  );
}

export function CertificatesPage() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  if (role === "AUTHORITY") return <AuthorityCertificates />;
  if (role === "ADMIN")     return <AdminCertificates />;
  return <ManufacturerCertificates />;
}
