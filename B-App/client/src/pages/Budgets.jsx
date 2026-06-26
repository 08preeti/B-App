import { useState } from "react";

const MOCK_BUDGETS = [
  { id: 1, category: "Food", limit: 3000, spent: 1380, start: "2026-06-01", end: "2026-06-30" },
  { id: 2, category: "Fashion", limit: 2000, spent: 2150, start: "2026-06-01", end: "2026-06-30" },
  { id: 3, category: "Travel", limit: 7000, spent: 6840, start: "2026-06-01", end: "2026-06-30" },
  { id: 4, category: "Office", limit: 5000, spent: 4200, start: "2026-06-01", end: "2026-06-30" },
];

const CATEGORIES = ["Travel", "Food", "Medical", "Office", "Fashion", "Subscriptions", "Other"];
const CAT_COLORS = { Travel: "#14b8a6", Food: "#f59e0b", Medical: "#ef4444", Office: "#3b82f6", Fashion: "#8b5cf6", Subscriptions: "#10b981", Other: "#6b7280" };

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN"); }

function statusInfo(spent, limit) {
  const pct = (spent / limit) * 100;
  if (pct >= 100) return { label: "Over budget", cls: "over" };
  if (pct >= 80) return { label: `⚠ ${Math.round(pct)}% used`, cls: "warn" };
  return { label: "On track", cls: "ok" };
}

export default function Budgets() {
  const [budgets, setBudgets] = useState(MOCK_BUDGETS);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: "Food", limit: "", start: "", end: "" });

  const handleAdd = () => {
    if (!form.limit || !form.start || !form.end) return;
    setBudgets([...budgets, { ...form, id: Date.now(), spent: 0, limit: +form.limit }]);
    setShowModal(false);
    setForm({ category: "Food", limit: "", start: "", end: "" });
  };

  const handleDelete = (id) => setBudgets(budgets.filter((b) => b.id !== id));

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
            <div key={b.id} className="budget-card">
              <div className="bc-top">
                <div className="bc-left">
                  <span className="cat-badge" style={{ background: color + "22", color }}>{b.category}</span>
                  <div className="bc-dates">{b.start} → {b.end}</div>
                </div>
                <div className="bc-right">
                  <span className={`budget-badge ${cls}`}>{label}</span>
                  <button className="icon-btn delete" onClick={() => handleDelete(b.id)}>🗑</button>
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
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
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
