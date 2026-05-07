import { FormEvent, useEffect, useState } from "react";
import type { TraceabilityRecordDto } from "@halal/shared";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../features/auth/auth-context.js";
import { useLang } from "../features/lang/lang-context.js";

const STAGES = ["Slaughter","Processing","Packaging","Cold Storage","Shipment","Port Arrival","Customs Clearance","Transportation","Distribution","Retail"];
const STAGE_ICONS: Record<string,string> = { "Slaughter":"🔪","Processing":"🏭","Packaging":"📦","Cold Storage":"❄️","Shipment":"🚢","Port Arrival":"⚓","Customs Clearance":"🛃","Transportation":"🚛","Distribution":"🏪","Retail":"🛒" };
function icon(s:string) { return STAGE_ICONS[s] ?? "📍"; }

function Timeline({ records, role, token, onDeleted }: { records: TraceabilityRecordDto[], role: string, token: string|null, onDeleted: (id: string) => void }) {
  const [deleting, setDeleting] = useState<string|null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this traceability record? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await apiRequest(`/traceability/${encodeURIComponent(id)}`, { method: "DELETE" }, token ?? undefined);
      onDeleted(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete record.");
    } finally { setDeleting(null); }
  }

  if (records.length===0) return <div className="empty-state"><span className="empty-icon">🔗</span><p>No traceability records found.</p></div>;
  return (
    <div className="trace-timeline">
      {records.map(r=>(
        <div key={r.id} className="trace-item">
          <div className="trace-dot">{icon(r.stage)}</div>
          <div style={{ flex: 1 }}>
            <div className="trace-stage">{r.stage}</div>
            <div className="trace-meta">
              {r.location}{r.country?`, ${r.country}`:""}{r.timestamp?` · ${new Date(r.timestamp).toLocaleString()}`:""}
            </div>
            {r.actorName && <div className="trace-meta">Actor: {r.actorName}</div>}
            {r.notes && <div className="trace-meta" style={{ color:"var(--text)" }}>{r.notes}</div>}
          </div>
          {role === "ADMIN" && (
            <button
              className="btn btn-sm"
              style={{ background:"var(--red,#e74c3c)", color:"#fff", border:"none", alignSelf:"flex-start" }}
              disabled={deleting === r.id}
              onClick={() => handleDelete(r.id)}
            >
              {deleting === r.id ? "..." : "🗑"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function TraceabilityPage() {
  const { token, user } = useAuth();
  const { tr } = useLang();
  const role = user?.role ?? "";
  const canAdd = role === "MANUFACTURER";
  const [records, setRecords]   = useState<TraceabilityRecordDto[]>([]);
  const [searchId, setSearchId] = useState("");
  const [activeId, setActiveId] = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [form, setForm] = useState({ productId:"",batchNumber:"",actorName:"",stage:"",status:"RECORDED",location:"",country:"",notes:"",temperature:"",timestamp:"" });

  async function loadRecords(id:string) {
    if (!id) return;
    try {
      const r = await apiRequest<TraceabilityRecordDto[]>(`/products/${id}/traceability`,{},token??undefined);
      setRecords(r); setActiveId(id);
    } catch { setRecords([]); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.productId.trim()) { setError("Product ID is required."); return; }
    if (!form.stage)            { setError("Please select a stage."); return; }
    if (!form.actorName.trim()) { setError("Actor name is required."); return; }
    if (!form.location.trim())  { setError("Location is required."); return; }
    if (!form.country.trim())   { setError("Country is required."); return; }
    if (!form.timestamp)        { setError("Timestamp is required."); return; }
    setError(""); setSuccess(""); setLoading(true);
    try {
      await apiRequest("/traceability",{method:"POST",body:JSON.stringify({...form,timestamp:new Date(form.timestamp).toISOString()})},token??undefined);
      setSuccess("Trace step added successfully.");
      setActiveId(form.productId); await loadRecords(form.productId);
      setForm({ productId:"",batchNumber:"",actorName:"",stage:"",status:"RECORDED",location:"",country:"",notes:"",temperature:"",timestamp:"" });
    } catch(err) {
      setError(err instanceof Error ? err.message : "Failed to add trace step.");
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Supply Chain Traceability</h1>
        <p>{canAdd ? "Track and record the supply chain journey of halal products." : "View the complete supply chain history of products."}</p>
        {!canAdd && <p style={{ color:"var(--amber)", fontSize:"0.82rem", fontWeight:500, marginTop:"0.25rem" }}>View only — only Manufacturers can add trace steps.</p>}
      </div>
      <div className="page-grid">
        {canAdd && (
          <div className="card">
            <div className="card-header"><span className="card-title">Add Trace Step</span></div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Product ID <span style={{ color:"var(--red)" }}>*</span></label>
                <input value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})} placeholder="PROD-..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Batch Number</label>
                  <input value={form.batchNumber} onChange={e=>setForm({...form,batchNumber:e.target.value})} placeholder="Optional" />
                </div>
                <div className="form-group">
                  <label>Stage <span style={{ color:"var(--red)" }}>*</span></label>
                  <select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}>
                    <option value="">Select stage...</option>
                    {STAGES.map(s=><option key={s} value={s}>{icon(s)} {s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Actor / Company <span style={{ color:"var(--red)" }}>*</span></label>
                  <input value={form.actorName} onChange={e=>setForm({...form,actorName:e.target.value})} placeholder="Company or officer name" />
                </div>
                <div className="form-group">
                  <label>Temperature (°C)</label>
                  <input value={form.temperature} onChange={e=>setForm({...form,temperature:e.target.value})} placeholder="e.g. -18" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Location <span style={{ color:"var(--red)" }}>*</span></label>
                  <input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="City, port, facility" />
                </div>
                <div className="form-group">
                  <label>Country <span style={{ color:"var(--red)" }}>*</span></label>
                  <input value={form.country} onChange={e=>setForm({...form,country:e.target.value})} placeholder="e.g. Kuwait" />
                </div>
              </div>
              <div className="form-group">
                <label>Timestamp <span style={{ color:"var(--red)" }}>*</span></label>
                <input type="datetime-local" value={form.timestamp} onChange={e=>setForm({...form,timestamp:e.target.value})} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Any relevant notes (optional)" />
              </div>
              {error && <div className="error-msg">{error}</div>}
              {success && <div className="success-msg">{success}</div>}
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading?tr("savingBtn"):tr("addTrace")}</button>
            </form>
          </div>
        )}

        <div className="card">
          <div className="card-header"><span className="card-title">Supply Chain Timeline</span></div>
          <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1rem" }}>
            <input value={searchId} onChange={e=>setSearchId(e.target.value)} placeholder="Enter Product ID..."
              style={{ flex:1, padding:"0.65rem 0.9rem", border:"1.5px solid var(--border)", borderRadius:"var(--radius)", fontSize:"0.875rem", outline:"none" }} />
            <button className="btn btn-primary btn-sm" onClick={()=>void loadRecords(searchId)}>Search</button>
          </div>
          {!activeId && <div className="empty-state"><span className="empty-icon">🔗</span><p>Enter a Product ID to view supply chain history.</p></div>}
          {activeId && <Timeline records={records} role={role} token={token} onDeleted={(id) => setRecords(prev => prev.filter(r => r.id !== id))} />}
        </div>
      </div>
    </div>
  );
}
