import { useState, useEffect } from "react";
import { api } from "../api";

const MOCK = {
  totalSpend: 16629,
  topVendor: "Indigo Airlines",
  gstPaid: 1150,
  activeBudgets: 4,
  spendByCategory: [
    { name: "Travel", amount: 6840, color: "#14b8a6" },
    { name: "Food", amount: 540, color: "#f59e0b" },
    { name: "Medical", amount: 1260, color: "#ef4444" },
    { name: "Office", amount: 4200, color: "#3b82f6" },
    { name: "Fashion", amount: 2150, color: "#8b5cf6" },
    { name: "Subscriptions", amount: 799, color: "#10b981" },
  ],
  monthlyTrend: [
    { month: "Feb", amount: 8200 },
    { month: "Mar", amount: 11400 },
    { month: "Apr", amount: 9800 },
    { month: "May", amount: 13200 },
    { month: "Jun", amount: 16629 },
  ],
  budgets: [
    { name: "Food", spent: 1380, limit: 3000, status: "on-track" },
    { name: "Fashion", spent: 2150, limit: 2000, status: "over" },
    { name: "Travel", spent: 6840, limit: 7000, status: "warning" },
    { name: "Office", spent: 4200, limit: 5000, status: "warning" },
  ],
};

function fmt(n) { return "₹" + n.toLocaleString("en-IN"); }

export default function Dashboard() {
  const now = new Date();
  const monthStr = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  const total = MOCK.spendByCategory.reduce((s, c) => s + c.amount, 0);
  const maxTrend = Math.max(...MOCK.monthlyTrend.map((m) => m.amount));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">{monthStr} · {8} bills logged</p>
        </div>
        <button className="primary-btn">+ Add Bill</button>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Spend</div>
          <div className="stat-value teal">{fmt(MOCK.totalSpend)}</div>
          <div className="stat-note">This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Top Vendor</div>
          <div className="stat-value teal">{MOCK.topVendor}</div>
          <div className="stat-note">MUMU</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Budgets</div>
          <div className="stat-value">{MOCK.activeBudgets}</div>
          <div className="stat-note warning">2 need attention</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">GST Paid</div>
          <div className="stat-value teal">{fmt(MOCK.gstPaid)}</div>
          <div className="stat-note">CGST + SGST + IGST</div>
        </div>
      </div>

      <div className="dash-row">
        {/* Spend by Category */}
        <div className="dash-card">
          <h3 className="card-title">Spend by Category</h3>
          <div className="donut-wrap">
            <svg viewBox="0 0 120 120" className="donut-svg">
              {(() => {
                let offset = 0;
                const r = 40, circ = 2 * Math.PI * r;
                return MOCK.spendByCategory.map((c) => {
                  const pct = c.amount / total;
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
            {MOCK.spendByCategory.map((c) => (
              <div key={c.name} className="legend-item">
                <span className="legend-dot" style={{ background: c.color }} />
                <span className="legend-name">{c.name}</span>
                <span className="legend-val">{fmt(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="dash-card">
          <h3 className="card-title">Monthly Trend</h3>
          <div className="trend-chart">
            <svg viewBox="0 0 300 120" className="trend-svg">
              <polyline
                fill="none" stroke="#14b8a6" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                points={MOCK.monthlyTrend.map((m, i) => {
                  const x = 20 + (i / (MOCK.monthlyTrend.length - 1)) * 260;
                  const y = 100 - (m.amount / maxTrend) * 80;
                  return `${x},${y}`;
                }).join(" ")} />
              {MOCK.monthlyTrend.map((m, i) => {
                const x = 20 + (i / (MOCK.monthlyTrend.length - 1)) * 260;
                const y = 100 - (m.amount / maxTrend) * 80;
                return <circle key={i} cx={x} cy={y} r="4" fill="#14b8a6" />;
              })}
            </svg>
            <div className="trend-labels">
              {MOCK.monthlyTrend.map((m) => <span key={m.month}>{m.month}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Budget Tracker */}
      <div className="dash-card full">
        <h3 className="card-title">Budget Tracker</h3>
        <div className="budget-list">
          {MOCK.budgets.map((b) => {
            const pct = Math.min((b.spent / b.limit) * 100, 100);
            const cls = b.status === "over" ? "over" : b.status === "warning" ? "warn" : "ok";
            return (
              <div key={b.name} className="budget-row">
                <div className="budget-top">
                  <span className="budget-name">{b.name}</span>
                  <div className="budget-right">
                    <span className="budget-amounts">{fmt(b.spent)} / {fmt(b.limit)}</span>
                    <span className={`budget-badge ${cls}`}>
                      {b.status === "over" ? "Over budget" : b.status === "warning" ? "⚠ 90% used" : "On track"}
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
      </div>
    </div>
  );
}
