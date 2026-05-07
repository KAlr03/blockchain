import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context.js";
import { apiRequest } from "../api/client.js";
import { useLang } from "../features/lang/lang-context.js";

interface Stats { certs:number; pending:number; approved:number; rejected:number; products:number; }
interface Fav   { productId:string; addedAt:string; }
interface Scan  { productId:string; scannedAt:string; }

export function DashboardPage() {
  const { user, token } = useAuth();
  const { tr } = useLang();
  const role = user?.role ?? "";
  const [stats, setStats]             = useState<Stats>({ certs:0, pending:0, approved:0, rejected:0, products:0 });
  const [favourites, setFavourites]   = useState<Fav[]>([]);
  const [scanHistory, setScanHistory] = useState<Scan[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [recentCerts, setRecentCerts] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [reviews, setReviews]               = useState<any[]>([]);
  const [deletingReview, setDeletingReview] = useState<string|null>(null);

  async function deleteReview(id: string) {
    if (!confirm("Delete this review?")) return;
    setDeletingReview(String(id));
    try {
      await apiRequest(`/reviews/${encodeURIComponent(String(id))}`, { method:"DELETE" }, token??undefined);
      setReviews(prev => prev.filter(r => String(r.id) !== String(id)));
    } catch {} finally { setDeletingReview(null); }
  }

  useEffect(() => {
    async function load() {
      try {
        const [certs, products] = await Promise.all([
          apiRequest<any[]>("/certificates",{},token??undefined).catch(()=>[]),
          apiRequest<any[]>("/products",{},token??undefined).catch(()=>[]),
        ]);
        setStats({
          certs:    certs.length,
          pending:  certs.filter((c:any)=>c.status==="PENDING_AI"||c.status==="UNDER_AUTHORITY_REVIEW").length,
          approved: certs.filter((c:any)=>c.status==="APPROVED").length,
          rejected: certs.filter((c:any)=>c.status==="REJECTED").length,
          products: products.length,
        });
        if (role === "MANUFACTURER") {
          const cutoff = Date.now() - 7*24*60*60*1000;
          setRecentCerts(certs.filter((c:any)=>(c.status==="APPROVED"||c.status==="REJECTED")&&new Date(c.updatedAt||c.createdAt||0).getTime()>cutoff).slice(0,5));
        }
        if (role === "ADMIN") {
          const ca = certs.slice(-5).reverse().map((c:any)=>({ type:"certificate", text:`Certificate ${c.certNumber||c.id?.slice(0,8)} — ${c.status}`, at:c.updatedAt||c.createdAt }));
          const pa = products.slice(-5).reverse().map((p:any)=>({ type:"product", text:`Product: ${p.productName||p.ProductName||p.id}`, at:p.createdAt||p.CreatedAt }));
          setRecentActivity([...ca,...pa].sort((a,b)=>new Date(b.at||0).getTime()-new Date(a.at||0).getTime()).slice(0,5));
          // Load reviews for admin management
          apiRequest<any[]>("/reviews").then(setReviews).catch(()=>{});
        }
      } catch {}
    }
    if (role !== "CUSTOMER") load();
  }, [token, role]);

  useEffect(() => {
    if (role !== "CUSTOMER") return;
    async function loadCustomer() {
      setLoadingData(true);
      try {
        const [favs, hist] = await Promise.all([
          apiRequest<Fav[]>("/favourites",{},token??undefined).catch(()=>[]),
          apiRequest<Scan[]>("/scan-history",{},token??undefined).catch(()=>[]),
        ]);
        setFavourites(favs);
        setScanHistory(hist);
      } catch {} finally { setLoadingData(false); }
    }
    loadCustomer();
  }, [token, role]);

  async function removeFavourite(productId: string) {
    try {
      await apiRequest(`/favourites/${encodeURIComponent(productId)}`,{method:"DELETE"},token??undefined);
      setFavourites(prev => prev.filter(f => f.productId !== productId));
    } catch {}
  }

  async function clearHistory() {
    try {
      await apiRequest("/scan-history",{method:"DELETE"},token??undefined);
      setScanHistory([]);
    } catch {}
  }

  if (role === "ADMIN") return (
    <div>
      <div className="page-header"><h1>Admin Control Center</h1><p>Monitor system activity, manage users, and audit blockchain records.</p></div>
      <div className="stats-grid">
        <div className="stat-card stat-blue"><div className="stat-value">{stats.products}</div><div className="stat-label">Total Products</div></div>
        <div className="stat-card stat-amber"><div className="stat-value">{stats.pending}</div><div className="stat-label">Pending Review</div></div>
        <div className="stat-card"><div className="stat-value">{stats.approved}</div><div className="stat-label">Approved</div></div>
        <div className="stat-card stat-red"><div className="stat-value">{stats.rejected}</div><div className="stat-label">Rejected</div></div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:"1.25rem" }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Quick Actions</span></div>
          <div style={{ display:"grid", gap:"0.5rem" }}>
            <Link to="/users" className="btn btn-outline btn-full" style={{ justifyContent:"flex-start" }}>Manage Users</Link>
            <Link to="/certificates" className="btn btn-ghost btn-full" style={{ justifyContent:"flex-start" }}>View All Certificates</Link>
            <Link to="/products" className="btn btn-ghost btn-full" style={{ justifyContent:"flex-start" }}>View All Products</Link>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Admin Responsibilities</span></div>
          <div className="capability-list">
            {["Approve manufacturer registrations","Manage user roles and permissions","Monitor blockchain transactions","Audit system logs","Suspend products or accounts"].map(t=>(
              <div key={t} className="capability-item"><span style={{ color:"var(--green)", fontWeight:700 }}>•</span><span>{t}</span></div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Recent Activity</span></div>
          {recentActivity.length===0
            ? <div className="empty-state"><span className="empty-icon">📋</span><p>No recent activity.</p></div>
            : recentActivity.map((a,i)=>(
                <div key={i} className="history-item">
                  <div className="history-item-name" style={{fontSize:"0.82rem"}}>{a.type==="certificate"?"📄":"📦"} {a.text}</div>
                  {a.at && <div className="history-item-meta">{new Date(a.at).toLocaleDateString("en-GB")}</div>}
                </div>
              ))
          }
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Reviews Management ({reviews.length})</span></div>
          {reviews.length===0
            ? <div className="empty-state"><span className="empty-icon">💬</span><p>No reviews yet.</p></div>
            : reviews.map(r=>(
                <div key={r.id} className="history-item" style={{alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div className="history-item-name" style={{fontWeight:600}}>
                      {r.name} <span style={{fontSize:"0.72rem",color:"var(--text-muted)",fontWeight:400}}>· {r.role}</span>
                      <span style={{marginLeft:"0.4rem",fontSize:"0.8rem"}}>{"⭐".repeat(r.stars)}</span>
                    </div>
                    <div className="history-item-meta" style={{marginTop:"0.2rem"}}>{r.comment}</div>
                  </div>
                  <button className="btn btn-sm" style={{background:"#e74c3c",color:"#fff",border:"none",flexShrink:0,marginLeft:"0.5rem"}}
                    disabled={deletingReview===String(r.id)} onClick={()=>deleteReview(r.id)}>
                    {deletingReview===String(r.id)?"...":"🗑"}
                  </button>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );

  if (role === "AUTHORITY") return (
    <div>
      <div className="page-header"><h1>Halal Certification Authority</h1><p>Review submitted certificates and make final approval decisions for P.A.F.N.</p></div>
      <div className="stats-grid">
        <div className="stat-card stat-amber"><div className="stat-value">{stats.pending}</div><div className="stat-label">Pending Review</div></div>
        <div className="stat-card"><div className="stat-value">{stats.approved}</div><div className="stat-label">Approved</div></div>
        <div className="stat-card stat-red"><div className="stat-value">{stats.rejected}</div><div className="stat-label">Rejected</div></div>
        <div className="stat-card stat-blue"><div className="stat-value">{stats.certs}</div><div className="stat-label">Total Certificates</div></div>
      </div>
      {stats.pending > 0
        ? <div className="card" style={{ borderLeft:"4px solid var(--amber)" }}>
            <p style={{ color:"var(--amber)", fontWeight:600 }}>
              {stats.pending} certificate(s) are waiting for your review.{" "}
              <Link to="/certificates" style={{ color:"var(--green)" }}>Go to Certificates →</Link>
            </p>
          </div>
        : <div className="card" style={{ borderLeft:"4px solid var(--green)" }}>
            <p style={{ color:"var(--green)", fontWeight:600 }}>No pending certificates. All submissions have been reviewed.</p>
          </div>
      }
    </div>
  );

  if (role === "MANUFACTURER") return (
    <div>
      <div className="page-header"><h1>Manufacturer Dashboard</h1><p>Register products and submit halal certificates for P.A.F.N. verification.</p></div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{stats.products}</div><div className="stat-label">My Products</div></div>
        <div className="stat-card stat-amber"><div className="stat-value">{stats.pending}</div><div className="stat-label">Pending Review</div></div>
        <div className="stat-card"><div className="stat-value">{stats.approved}</div><div className="stat-label">Approved</div></div>
        <div className="stat-card stat-red"><div className="stat-value">{stats.rejected}</div><div className="stat-label">Rejected</div></div>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">Certificate Workflow</span></div>
        <div className="workflow-steps">
          {[{n:"1",l:"Register Product"},{n:null,l:null},{n:"2",l:"Upload Certificate"},{n:null,l:null},{n:"3",l:"AI Verification"},{n:null,l:null},{n:"4",l:"P.A.F.N. Review"},{n:null,l:null},{n:"5",l:"Blockchain Record"}].map((s,i) =>
            s.n === null
              ? <div key={i} className="workflow-arrow">→</div>
              : <div key={i} className="workflow-step"><div className="workflow-step-num">{s.n}</div><div className="workflow-step-label">{s.l}</div></div>
          )}
        </div>
      </div>
      {recentCerts.length > 0 && (
        <div className="card" style={{marginTop:"1.25rem"}}>
          <div className="card-header"><span className="card-title">Recent Certificate Decisions</span></div>
          {recentCerts.map((c:any)=>(
            <div key={c.id} className="history-item" style={{borderLeft:`3px solid ${c.status==="APPROVED"?"var(--green)":"#e74c3c"}`,paddingLeft:"0.75rem"}}>
              <div className="history-item-name" style={{fontWeight:600}}>
                {c.status==="APPROVED"?"✅":"❌"} Certificate {c.certNumber||c.id?.slice(0,8)}
                <span style={{marginLeft:"0.4rem",fontSize:"0.72rem",color:c.status==="APPROVED"?"var(--green)":"#e74c3c"}}>{c.status}</span>
              </div>
              {c.authorityNotes && <div className="history-item-meta">Note: {c.authorityNotes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // CUSTOMER
  return (
    <div>
      <div className="page-header"><h1>My Dashboard</h1><p>Welcome back, {user?.name}. Track your verified products and scan history.</p></div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:"1.25rem" }}>

        <div className="card">
          <div className="card-header"><span className="card-title">Verify a Product</span></div>
          <p style={{ fontSize:"0.85rem", color:"var(--text-muted)", marginBottom:"1rem" }}>Enter a Product ID or use the camera scanner to verify halal status.</p>
          <Link to="/verify" className="btn btn-primary btn-full">Open Verifier</Link>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Saved Products ({favourites.length})</span></div>
          {loadingData
            ? <div className="empty-state"><p>Loading...</p></div>
            : favourites.length === 0
              ? <div className="empty-state"><span className="empty-icon">⭐</span><p>No saved products yet. Verify a product and save it to your favourites.</p></div>
              : favourites.map(f => (
                  <div key={f.productId} className="history-item">
                    <div>
                      <div className="history-item-name">{f.productId}</div>
                      <div className="history-item-meta">Saved {f.addedAt ? new Date(f.addedAt).toLocaleDateString("en-GB") : ""}</div>
                    </div>
                    <div style={{ display:"flex", gap:"0.35rem" }}>
                      <Link to={`/verify/${f.productId}`} className="btn btn-outline btn-sm">Verify</Link>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeFavourite(f.productId)}>Remove</button>
                    </div>
                  </div>
                ))
          }
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Scan History ({scanHistory.length})</span>
            {scanHistory.length > 0 && <button className="btn btn-ghost btn-sm" onClick={clearHistory}>Clear</button>}
          </div>
          {scanHistory.length === 0
            ? <div className="empty-state"><span className="empty-icon">🕐</span><p>No scan history yet.</p></div>
            : scanHistory.map((h, i) => (
                <div key={i} className="history-item">
                  <div>
                    <div className="history-item-name">{h.productId}</div>
                    <div className="history-item-meta">{h.scannedAt ? new Date(h.scannedAt).toLocaleDateString("en-GB") : "Previously verified"}</div>
                  </div>
                  <Link to={`/verify/${h.productId}`} className="btn btn-outline btn-sm">View</Link>
                </div>
              ))
          }
        </div>

      </div>
    </div>
  );
}
