import { FormEvent, useState } from "react";
import { useAuth } from "../features/auth/auth-context.js";
import { apiRequest } from "../api/client.js";

export function ProfilePage() {
  const { user, token } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (password && password !== confirm) { setError("Passwords do not match."); return; }
    setError(""); setSuccess(""); setLoading(true);
    try {
      const body: any = { name: name.trim(), email: email.trim() };
      if (password) body.password = password;
      await apiRequest("/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, token ?? undefined);
      setSuccess("Profile updated successfully!");
      setPassword(""); setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="page-header"><h1>My Profile</h1><p>Update your name, email, and password.</p></div>
      <div style={{ maxWidth:480 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Account Details</span></div>
          <div style={{ marginBottom:"1rem", padding:"0.75rem", background:"var(--sage-pale)", borderRadius:"var(--radius)", fontSize:"0.85rem" }}>
            <strong>Role:</strong> {user?.role}<br/>
            <strong>Organization:</strong> {(user as any)?.organization || "N/A"}
          </div>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
            <div className="form-group">
              <label>New Password <span style={{ color:"var(--text-muted)", fontWeight:400 }}>(leave blank to keep current)</span></label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" />
            </div>
            {error && <div className="error-msg">{error}</div>}
            {success && <div className="success-msg">{success}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
