import { useState, useEffect } from "react";
import { api } from "../api";

const CAT_COLORS = {
  Travel: "#0ea5a0", Food: "#f59e0b", Medical: "#ef4444",
  Office: "#3b82f6", Fashion: "#8b5cf6", Subscriptions: "#10b981", Other: "#64748b"
};
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN"); }

export default function Analytics() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/bills").then(setBills).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p style={{color:"var(--muted)",paddingTop:20}}>Loading analytics…</p></div>;

  if (bills.length === 0) return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Analytics</h1><p className="page-sub">Spending trends across categories</p></div>
      </div>
      <div style={{ textAlign:"center", padding:"80px 24px", color:"var(--muted)" }}>
        <div style={{ fontSize:48, marginBottom:12, opacity:0.3 }}>📊</div>
        <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>No data yet</div>
        <div style={{ fontSize:13 }}>Add some bills to see your spending analytics.</div>
      </div>
    </div>
  );


  const monthMap = {};
  bills.forEach(b => {
    if (!b.date) return;
    const [yr, mo] = b.date.split("-");
    const key = `${yr}-${mo}`;
    if (!monthMap[key]) monthMap[key] = { month: MONTH_NAMES[parseInt(mo) - 1], year: yr, cats: {} };
    const cat = b.category || "Other";
    monthMap[key].cats[cat] = (monthMap[key].cats[cat] || 0) + b.amount;
  });

  const months = Object.values(monthMap).sort((a, b) => {
    const ai = MONTH_NAMES.indexOf(a.month), bi = MONTH_NAMES.indexOf(b.month);
    return a.year !== b.year ? a.year - b.year : ai - bi;
  }).slice(-6);

  const allCats = [...new Set(bills.map(b => b.category).filter(Boolean))];
  const maxVal = Math.max(...months.flatMap(m => Object.values(m.cats)), 1);

  // Stats
  const totalByMonth = months.map(m => ({ month: m.month, total: Object.values(m.cats).reduce((s,v)=>s+v,0) }));
  const highestMonth = totalByMonth.reduce((a,b) => a.total > b.total ? a : b, { month:"—", total:0 });
  const catTotals = {};
  bills.forEach(b => { const c = b.category||"Other"; catTotals[c]=(catTotals[c]||0)+b.amount; });
  const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0] || ["—", 0];
  const avgSpend = totalByMonth.length ? Math.round(totalByMonth.reduce((s,m)=>s+m.total,0)/totalByMonth.length) : 0;
  const totalGST = bills.reduce((s,b)=>s+(b.tax||0),0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Spending trends across categories</p>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Bar Chart */}
        <div className="dash-card full">
          <h3 className="card-title">Monthly Breakdown by Category</h3>
          {months.length === 0 ? (
            <p style={{ color:"var(--muted)", fontSize:13 }}>Not enough data yet.</p>
          ) : (
            <>
              <div className="bar-chart">
                {months.map(m => (
                  <div key={m.month + m.year} className="bar-group">
                    {allCats.map(cat => (
                      <div key={cat} className="bar-wrap" title={`${cat}: ${fmt(m.cats[cat]||0)}`}>
                        <div className="bar" style={{
                          height: `${((m.cats[cat]||0) / maxVal) * 150}px`,
                          background: CAT_COLORS[cat] || "#94a3b8"
                        }} />
                      </div>
                    ))}
                    <div className="bar-label">{m.month}</div>
                  </div>
                ))}
              </div>
              <div className="legend" style={{ marginTop: 28, flexDirection:"row", flexWrap:"wrap", gap:"12px 20px" }}>
                {allCats.map(cat => (
                  <div key={cat} className="legend-item">
                    <span className="legend-dot" style={{ background: CAT_COLORS[cat]||"#94a3b8" }} />
                    <span className="legend-name" style={{ textTransform:"capitalize" }}>{cat}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="stat-grid" style={{ marginTop:0 }}>
          {[
            { label:"Highest Month",         value: highestMonth.month,  sub: fmt(highestMonth.total) + " total" },
            { label:"Top Category",          value: topCat[0],           sub: fmt(topCat[1]) + " total" },
            { label:"Avg Monthly Spend",     value: fmt(avgSpend),       sub: `Last ${totalByMonth.length} month${totalByMonth.length!==1?"s":""}` },
            { label:"Total GST Paid",        value: fmt(totalGST),       sub: "CGST + SGST + IGST" },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value teal">{s.value}</div>
              <div className="stat-note">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}