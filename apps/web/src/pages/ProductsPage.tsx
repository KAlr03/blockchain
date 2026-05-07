import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import type { ProductDto } from "@halal/shared";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../features/auth/auth-context.js";
import { useLang } from "../features/lang/lang-context.js";
import QRCode from "qrcode";

const CATEGORIES = ["Meat","Poultry","Dairy","Seafood","Processed Food","Beverages","Grains & Cereals","Confectionery","Other"];

export function ProductsPage() {
  const { token, user } = useAuth();
  const { tr } = useLang();
  const role = user?.role ?? "";
  const isReadOnly = role === "ADMIN" || role === "AUTHORITY";
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [copied, setCopied]     = useState<string|null>(null);
  const [qrUrl, setQrUrl]       = useState<string|null>(null);
  const [qrProduct, setQrProduct] = useState<string|null>(null);

  const [deleting, setDeleting] = useState<string|null>(null);

  async function handleDelete(productId: string, productName: string) {
    if (!confirm(`Are you sure you want to delete "${productName}"? This cannot be undone.`)) return;
    setDeleting(productId);
    try {
      await apiRequest(`/products/${encodeURIComponent(productId)}`, { method: "DELETE" }, token ?? undefined);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product.");
    } finally { setDeleting(null); }
  }

  async function showQr(productId: string, productName: string) {
    const url = `${import.meta.env.VITE_WEB_URL || "http://localhost:5173"}/verify/${productId}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
    setQrUrl(dataUrl);
    setQrProduct(productName);
  }
  const [productName, setProductName]     = useState("");
  const [batchNumber, setBatchNumber]     = useState("");
  const [brand, setBrand]                 = useState("");
  const [category, setCategory]           = useState("");
  const [manufacturer, setManufacturer]   = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [healthFile, setHealthFile]       = useState<File|null>(null);
  const [weight, setWeight]               = useState("");

  async function load() {
    apiRequest<ProductDto[]>("/products",{},token??undefined).then(setProducts).catch(()=>{});
  }
  useEffect(() => { void load(); }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!productName.trim()) { setError("Product name is required."); return; }
    if (!batchNumber.trim()) { setError("Batch number is required."); return; }
    if (!category)           { setError("Please select a category."); return; }
    if (!originCountry.trim()){ setError("Country of origin is required."); return; }
    if (!weight.trim())      { setError("Weight is required."); return; }
    setError(""); setSuccess(""); setLoading(true);
    try {
      let healthRef = "N/A";
      // If health file provided, upload it first (or just store the name for now)
      if (healthFile) { healthRef = `HEALTH-${healthFile.name}`; }

      await apiRequest("/products",{ method:"POST", body: JSON.stringify({
        productName: productName.trim(), batchNumber: batchNumber.trim(),
        brand: brand.trim()||"N/A", category,
        manufacturer: manufacturer.trim()||user?.name||"N/A",
        originCountry: originCountry.trim(), halalRef:"PENDING_CERTIFICATE",
        healthRef, weight: weight.trim()
      })}, token??undefined);
      setSuccess(tr("productRegistered"));
      setProductName(""); setBatchNumber(""); setBrand(""); setCategory(""); setManufacturer(""); setOriginCountry(""); setHealthFile(null); setWeight("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register product.");
    } finally { setLoading(false); }
  }

  function copyId(id: string) { navigator.clipboard.writeText(id); setCopied(id); setTimeout(()=>setCopied(null),1500); }

  return (
    <div>
      <div className="page-header">
        <h1>{tr("products")}</h1>
        <p>{isReadOnly ? tr("adminReadOnlyProducts") : tr("manufacturerDesc")}</p>
      </div>
      <div className="page-grid">
        {!isReadOnly && (
          <div className="card">
            <div className="card-header"><span className="card-title">{tr("registerNewProduct")}</span></div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{tr("productName")} <span className="required-star">*</span></label>
                <input value={productName} onChange={e=>setProductName(e.target.value)} placeholder="e.g. Australian Lamb Chops" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{tr("batchNumber")} <span className="required-star">*</span></label>
                  <input value={batchNumber} onChange={e=>setBatchNumber(e.target.value)} placeholder="BATCH-2025-001" />
                </div>
                <div className="form-group">
                  <label>{tr("category")} <span className="required-star">*</span></label>
                  <select value={category} onChange={e=>setCategory(e.target.value)}>
                    <option value="">{tr("selectCategoryPlaceholder")}</option>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{tr("brandOptional")}</label>
                  <input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="Brand name" />
                </div>
                <div className="form-group">
                  <label>{tr("manufacturerOptional")}</label>
                  <input value={manufacturer} onChange={e=>setManufacturer(e.target.value)} placeholder="Company name" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{tr("countryOfOrigin")} <span className="required-star">*</span></label>
                  <input value={originCountry} onChange={e=>setOriginCountry(e.target.value)} placeholder="e.g. Australia" />
                </div>
                <div className="form-group">
                  <label>{tr("weightLabel")} <span className="required-star">*</span></label>
                  <input value={weight} onChange={e=>setWeight(e.target.value)} placeholder="e.g. 500g" />
                </div>
              </div>
              {error && <div className="error-msg">{error}</div>}
              {success && <div className="success-msg">{success}</div>}
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? tr("savingBtn") : tr("registerProductBtn")}
              </button>
            </form>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <span className="card-title">{isReadOnly ? tr("viewAllProducts") : tr("myProductsTitle")} ({products.length})</span>
            <button className="btn btn-ghost btn-sm" onClick={load}>{tr("refreshBtn")}</button>
          </div>
          {products.length===0
            ? <div className="empty-state"><span className="empty-icon">📦</span><p>{tr("noProducts")}</p></div>
            : <div className="product-list">
                {products.map(p => (
                  <div key={p.id} className="product-card">
                    <div>
                      <div className="product-name">{p.productName}</div>
                      <div className="product-meta">{p.brand&&p.brand!=="N/A"?`${p.brand} · `:""}{p.category} · {p.originCountry}</div>
                      <span className="product-id-chip">{p.productId}</span>
                    </div>
                    <div style={{ display:"flex", gap:"0.5rem" }}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>copyId(p.productId)}>
                        {copied===p.productId?tr("copiedLabel"):tr("copyIdLabel")}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={()=>showQr(p.productId, p.productName)}>
                        📷 QR
                      </button>
                      {role === "ADMIN" && (
                        <button
                          className="btn btn-sm"
                          style={{ background:"var(--red,#e74c3c)", color:"#fff", border:"none" }}
                          disabled={deleting === p.productId}
                          onClick={()=>handleDelete(p.productId, p.productName)}
                        >
                          {deleting === p.productId ? "Deleting..." : "🗑 Delete"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* QR Code Modal */}
      {qrUrl && (
        <div className="modal-overlay" onClick={() => { setQrUrl(null); setQrProduct(null); }}>
          <div className="modal-card" style={{ textAlign:"center", maxWidth:340 }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setQrUrl(null); setQrProduct(null); }}>✕</button>
            <h3 style={{ marginBottom:"0.5rem" }}>QR Code</h3>
            <p style={{ fontSize:"0.85rem", color:"var(--text-muted)", marginBottom:"1rem" }}>{qrProduct}</p>
            <img src={qrUrl} alt="QR Code" style={{ width:250, height:250, margin:"0 auto", display:"block" }} />
            <p style={{ fontSize:"0.75rem", color:"var(--text-muted)", marginTop:"1rem" }}>Scan to verify this product</p>
            <a href={qrUrl} download={`qr-${qrProduct}.png`} className="btn btn-primary" style={{ marginTop:"1rem", display:"inline-block" }}>
              ⬇️ Download QR
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
