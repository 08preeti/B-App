import { useState, useEffect } from "react";
import { api } from "../api";

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN"); }

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const monthStr = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  useEffect(() => {
    Promise.all([api("/dashboard/summary"), api("/budgets")])
      .then(([summary, budgetsData]) => {
        setData(summary);
        setBudgets(budgetsData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p>Loading dashboard...</p></div>;
if (!data) return <div className="page"><p>Could not load dashboard. Check server.</p></div>;

  const spendByCategory = (data.byCategory || []).map(c => ({
    name: c.cat?.[0]?.name || "Unknown",
    amount: c.total,
    color: c.cat?.[0]?.color || "#6b7280",
  }));

  const totalSpend = spendByCategory.reduce((s, c) => s + c.amount, 0);

  const monthlyTrend = (data.trend || []).map(t => ({
    month: MONTH_NAMES[(t._id || 1) - 1],
    amount: t.total,
  }));
  const maxTrend = Math.max(...monthlyTrend.map(m => m.amount), 1);

  const gstTotal = (data.gst?.cgst || 0) + (data.gst?.sgst || 0) + (data.gst?.igst || 0);
  const topVendor = spendByCategory[0]?.name || "—";

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">{monthStr}</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Spend</div>
          <div className="stat-value teal">{fmt(totalSpend)}</div>
          <div className="stat-note">This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Top Category</div>
          <div className="stat-value teal">{topVendor}</div>
          <div className="stat-note">Highest spend</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Budgets</div>
          <div className="stat-value">{budgets.length}</div>
          <div className="stat-note warning">
            {budgets.filter(b => (b.spent / b.limit) >= 0.8).length} need attention
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">GST Paid</div>
          <div className="stat-value teal">{fmt(gstTotal)}</div>
          <div className="stat-note">CGST + SGST + IGST</div>
        </div>
      </div>

      <div className="dash-row">
        <div className="dash-card">
          <h3 className="card-title">Spend by Category</h3>
          {spendByCategory.length === 0 ? (
            <div className="empty-state">No bills this month</div>
          ) : (
            <>
              <div className="donut-wrap">
                <svg viewBox="0 0 120 120" className="donut-svg">
                  {(() => {
                    let offset = 0;
                    const r = 40, circ = 2 * Math.PI * r;
                    return spendByCategory.map((c) => {
                      const pct = c.amount / totalSpend;
                      const dash = pct * circ;
                      const el = (
                        <circle key={c.name} r={r} cx={60} cy={60}
                          fill="none" stroke={c.color} strokeWidth={18}
                          strokeDasharray={`${dash} ${circ - dash}`}
                          strokeDashoffset={-offset * circ}
                          style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px" }} />
                      );
                      offset += pct;
                      return el;
                    });
                  })()}
                </svg>
              </div>
              <div className="legend">
                {spendByCategory.map((c) => (
                  <div key={c.name} className="legend-item">
                    <span className="legend-dot" style={{ background: c.color }} />
                    <span className="legend-name">{c.name}</span>
                    <span className="legend-val">{fmt(c.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="dash-card">
          <h3 className="card-title">Monthly Trend</h3>
          {monthlyTrend.length === 0 ? (
            <div className="empty-state">No data yet</div>
          ) : (
            <div className="trend-chart">
              <svg viewBox="0 0 300 120" className="trend-svg">
                <polyline fill="none" stroke="#14b8a6" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  points={monthlyTrend.map((m, i) => {
                    const x = 20 + (i / Math.max(monthlyTrend.length - 1, 1)) * 260;
                    const y = 100 - (m.amount / maxTrend) * 80;
                    return `${x},${y}`;
                  }).join(" ")} />
                {monthlyTrend.map((m, i) => {
                  const x = 20 + (i / Math.max(monthlyTrend.length - 1, 1)) * 260;
                  const y = 100 - (m.amount / maxTrend) * 80;
                  return <circle key={i} cx={x} cy={y} r="4" fill="#14b8a6" />;
                })}
              </svg>
              <div className="trend-labels">
                {monthlyTrend.map((m) => <span key={m.month}>{m.month}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="dash-card full">
        <h3 className="card-title">Budget Tracker</h3>
        {budgets.length === 0 ? (
          <div className="empty-state">No budgets set</div>
        ) : (
          <div className="budget-list">
            {budgets.map((b) => {
              const pct = Math.min((b.spent / b.limit) * 100, 100);
              const cls = pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok";
              return (
                <div key={b._id || b.id} className="budget-row">
                  <div className="budget-top">
                    <span className="budget-name">{b.category}</span>
                    <div className="budget-right">
                      <span className="budget-amounts">{fmt(b.spent)} / {fmt(b.limit)}</span>
                      <span className={`budget-badge ${cls}`}>
                        {cls === "over" ? "Over budget" : cls === "warn" ? `⚠ ${Math.round(pct)}% used` : "On track"}
                      </span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${cls}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}