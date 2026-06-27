import { useState, useEffect } from "react";
import { api } from "../api";

const CAT_COLORS = { Travel: "#14b8a6", Food: "#f59e0b", Medical: "#ef4444", Office: "#3b82f6", Fashion: "#8b5cf6", Subscriptions: "#10b981", Other: "#6b7280" };

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN"); }

function statusInfo(spent, limit) {
  const pct = (spent / limit) * 100;
  if (pct >= 100) return { label: "Over budget", cls: "over" };
  if (pct >= 80)  return { label: `⚠ ${Math.round(pct)}% used`, cls: "warn" };
  return { label: "On track", cls: "ok" };
}

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ categoryId: "", limit: "", start: "", end: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api("/budgets"), api("/categories")])
      .then(([budgetsData, catsData]) => {
        setBudgets(budgetsData);
        setCategories(catsData);
        if (catsData.length > 0) setForm(f => ({ ...f, categoryId: catsData[0]._id }));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!form.limit || !form.start || !form.end || !form.categoryId) return;
    const saved = await api("/budgets", {
      method: "POST",
      body: JSON.stringify({ ...form, limit: +form.limit }),
    });
    // Server returns computed spent=0 for new budget; add category name for display
    const cat = categories.find(c => c._id === form.categoryId);
    setBudgets([...budgets, { ...saved, spent: 0, category: cat?.name,
      start: form.start, end: form.end }]);
    setShowModal(false);
    setForm({ categoryId: categories[0]?._id || "", limit: "", start: "", end: "" });
  };

  const handleDelete = async (id) => {
    await api(`/budgets/${id}`, { method: "DELETE" });
    setBudgets(budgets.filter((b) => b._id !== id && b.id !== id));
  };

  if (loading) return <div className="page"><p>Loading budgets...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-sub">Set a limit per category and track utilisation</p>
        </div>
        <button className="primary-btn" onClick={() => setShowModal(true)}>+ New Budget</button>
      </div>

      <div className="budget-cards">
        {budgets.map((b) => {
          const pct = Math.min((b.spent / b.limit) * 100, 100);
          const { label, cls } = statusInfo(b.spent, b.limit);
          const color = CAT_COLORS[b.category] || "#14b8a6";
          return (
            <div key={b._id || b.id} className="budget-card">
              <div className="bc-top">
                <div className="bc-left">
                  <span className="cat-badge" style={{ background: color + "22", color }}>{b.category}</span>
                  <div className="bc-dates">{b.start} → {b.end}</div>
                </div>
                <div className="bc-right">
                  <span className={`budget-badge ${cls}`}>{label}</span>
                  <button className="icon-btn delete" onClick={() => handleDelete(b._id || b.id)}>🗑</button>
                </div>
              </div>
              <div className="bc-amounts">
                <span className="bc-spent">{fmt(b.spent)}</span>
                <span className="bc-limit">of {fmt(b.limit)}</span>
              </div>
              <div className="progress-bar">
                <div className={`progress-fill ${cls}`} style={{ width: `${pct}%`, background: cls === "ok" ? color : undefined }} />
              </div>
              <div className="bc-pct">{Math.round(pct)}% used</div>
            </div>
          );
        })}
        {budgets.length === 0 && <div className="empty-state">No budgets yet</div>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Budget</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field">
                  <label>Category</label>
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Limit (₹) *</label>
                  <input type="number" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} placeholder="e.g. 5000" />
                </div>
                <div className="field">
                  <label>Start Date *</label>
                  <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
                </div>
                <div className="field">
                  <label>End Date *</label>
                  <input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleAdd}>Create Budget</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}