const DATA = [
  { month: "Jan", travel: 3200, food: 1800, medical: 500, office: 2100 },
  { month: "Feb", travel: 5400, food: 2200, medical: 800, office: 1900 },
  { month: "Mar", travel: 2100, food: 1600, medical: 1200, office: 3400 },
  { month: "Apr", travel: 6800, food: 2800, medical: 600, office: 2800 },
  { month: "May", travel: 4200, food: 2100, medical: 900, office: 2200 },
  { month: "Jun", travel: 6840, food: 540, medical: 1260, office: 4200 },
];

const COLORS = { travel: "#14b8a6", food: "#f59e0b", medical: "#ef4444", office: "#3b82f6" };

function fmt(n) { return "₹" + n.toLocaleString("en-IN"); }

export default function Analytics() {
  const maxVal = Math.max(...DATA.flatMap((d) => [d.travel, d.food, d.medical, d.office]));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Spending trends across categories</p>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="dash-card full">
          <h3 className="card-title">Monthly Breakdown by Category</h3>
          <div className="bar-chart">
            {DATA.map((d) => (
              <div key={d.month} className="bar-group">
                {["travel", "food", "medical", "office"].map((key) => (
                  <div key={key} className="bar-wrap" title={`${key}: ${fmt(d[key])}`}>
                    <div className="bar" style={{ height: `${(d[key] / maxVal) * 140}px`, background: COLORS[key] }} />
                  </div>
                ))}
                <div className="bar-label">{d.month}</div>
              </div>
            ))}
          </div>
          <div className="legend" style={{ marginTop: 16 }}>
            {Object.entries(COLORS).map(([key, color]) => (
              <div key={key} className="legend-item">
                <span className="legend-dot" style={{ background: color }} />
                <span className="legend-name" style={{ textTransform: "capitalize" }}>{key}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stat-grid" style={{ marginTop: 0 }}>
          {[
            { label: "Highest Month", value: "June 2026", sub: "₹16,629 total" },
            { label: "Most Spent Category", value: "Travel", sub: "₹6,840 in June" },
            { label: "Avg Monthly Spend", value: "₹11,240", sub: "Last 6 months" },
            { label: "GST This Year", value: "₹4,820", sub: "CGST + SGST + IGST" },
          ].map((s) => (
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