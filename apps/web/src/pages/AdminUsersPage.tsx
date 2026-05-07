import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../features/auth/auth-context.js";
import { useLang } from "../features/lang/lang-context.js";

interface UserItem {
  id: string; name: string; email: string; role: string;
  status: string; organizationName: string; country: string;
}

export function AdminUsersPage() {
  const { token } = useAuth();
  const { tr } = useLang();
  const [users, setUsers]       = useState<UserItem[]>([]);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [editing, setEditing]   = useState<string|null>(null);
  const [editData, setEditData] = useState({ name:"", email:"", password:"", status:"ACTIVE" });
  const [search, setSearch]     = useState("");

  async function load() {
    try {
      const r = await apiRequest<UserItem[]>("/users", {}, token ?? undefined);
      setUsers(r);
    } catch { setError("Failed to load users."); }
  }

  useEffect(() => { void load(); }, [token]);

  function startEdit(user: UserItem) {
    setEditing(user.id);
    setEditData({ name: user.name, email: user.email, password: "", status: user.status });
    setError(""); setSuccess("");
  }

  async function saveEdit(id: string) {
    const body: Record<string, string> = { name: editData.name, email: editData.email, status: editData.status };
    if (editData.password && editData.password.length >= 8) body.password = editData.password;
    else if (editData.password && editData.password.length > 0 && editData.password.length < 8) {
      setError("New password must be at least 8 characters."); return;
    }
    try {
      await apiRequest(`/users/${id}`, { method:"PATCH", body: JSON.stringify(body) }, token ?? undefined);
      setSuccess("User updated successfully.");
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  async function toggleStatus(user: UserItem) {
    const newStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await apiRequest(`/users/${user.id}`, { method:"PATCH", body: JSON.stringify({ status: newStatus }) }, token ?? undefined);
      setSuccess(`User ${newStatus === "ACTIVE" ? "activated" : "suspended"}.`);
      await load();
    } catch { setError("Status update failed."); }
  }

  const roleColors: Record<string, string> = {
    ADMIN: "#7c3aed", AUTHORITY: "#0f6e56", MANUFACTURER: "#1d4ed8", CUSTOMER: "#b8972a"
  };

  // Filter users by search query
  const filtered = users.filter(u =>
    search.trim() === "" ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1>{tr("userManagement")}</h1>
        <p>{tr("userManagementDesc")}</p>
      </div>

      {error   && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg" style={{ marginBottom:"1rem" }}>{success}</div>}

      <div className="card">
        {/* Search bar */}
        <div style={{ marginBottom:"1rem" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search by name, email, or role..."
            style={{ width:"100%", padding:"0.55rem 0.85rem", border:"1px solid var(--border)", borderRadius:"var(--radius)", fontSize:"0.875rem", outline:"none" }}
          />
          {search && (
            <div style={{ fontSize:"0.8rem", color:"var(--text-muted)", marginTop:"0.35rem" }}>
              Showing {filtered.length} of {users.length} users
            </div>
          )}
        </div>

        <div className="card-header">
          <span className="card-title">{tr("allUsersTable")} ({filtered.length})</span>
          <button className="btn btn-ghost btn-sm" onClick={load}>{tr("refreshBtn")}</button>
        </div>

        {filtered.length === 0
          ? <div className="empty-state">
              <span className="empty-icon">{search ? "🔍" : "👥"}</span>
              <p>{search ? `No users found for "${search}"` : tr("noItems")}</p>
            </div>
          : filtered.map(user => (
              <div key={user.id} className="user-row">
                {editing === user.id ? (
                  <div style={{ padding:"0.75rem 0" }}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>{tr("name")}</label>
                        <input value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>{tr("email")}</label>
                        <input value={editData.email} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>{tr("newPasswordOptional")}</label>
                        <input type="password" value={editData.password} onChange={e => setEditData(p => ({ ...p, password: e.target.value }))} placeholder="Leave blank to keep current" />
                      </div>
                      <div className="form-group">
                        <label>{tr("statusLabel")}</label>
                        <select value={editData.status} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}>
                          <option value="ACTIVE">Active</option>
                          <option value="PENDING_APPROVAL">Pending Approval</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:"0.5rem" }}>
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(user.id)}>{tr("saveBtn")}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>{tr("cancelBtn")}</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.65rem 0", flexWrap:"wrap", gap:"0.5rem" }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:"0.9rem" }}>{user.name}</div>
                      <div style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>{user.email} · {user.organizationName}</div>
                      <div style={{ display:"flex", gap:"0.4rem", marginTop:"0.3rem", flexWrap:"wrap" }}>
                        <span style={{ background: roleColors[user.role]||"#666", color:"#fff", borderRadius:4, fontSize:"0.7rem", padding:"0.15rem 0.5rem", fontWeight:600 }}>{user.role}</span>
                        <span style={{ background: user.status==="ACTIVE"?"#dcfce7":"#fee2e2", color: user.status==="ACTIVE"?"#166534":"#991b1b", borderRadius:4, fontSize:"0.7rem", padding:"0.15rem 0.5rem", fontWeight:600 }}>{user.status}</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(user)}>{tr("editBtn")}</button>
                      {user.status === "PENDING_APPROVAL" && (
                        <button className="btn btn-sm" style={{ background:"var(--green)", color:"#fff", border:"none" }}
                          onClick={async () => {
                            await apiRequest(`/users/${user.id}`, { method:"PATCH", body: JSON.stringify({ status: "ACTIVE" }) }, token ?? undefined);
                            setSuccess("User approved and activated!");
                            await load();
                          }}>
                          ✅ Approve
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(user)}>
                        {user.status === "ACTIVE" ? tr("suspendBtn") : user.status === "PENDING_APPROVAL" ? "Reject" : tr("activateBtn")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
        }
      </div>
    </div>
  );
}
