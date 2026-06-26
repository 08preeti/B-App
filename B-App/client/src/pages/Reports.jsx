export default function Reports() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">Take your data out of the app</p>
        </div>
      </div>
      <div className="report-grid">
        <div className="report-card">
          <div className="report-icon">🧾</div>
          <div>
            <div className="report-title">Export a single bill</div>
            <div className="report-desc">PDF with all entered fields and the attached receipt.</div>
          </div>
          <button className="report-btn">› Choose bill</button>
        </div>
        <div className="report-card">
          <div className="report-icon">📄</div>
          <div>
            <div className="report-title">Monthly report</div>
            <div className="report-desc">PDF summary matching this month's dashboard.</div>
          </div>
          <button className="report-btn">› Pick month</button>
        </div>
        <div className="report-card">
          <div className="report-icon">📊</div>
          <div>
            <div className="report-title">All data</div>
            <div className="report-desc">Every bill as a row, exported to Excel or CSV.</div>
          </div>
          <button className="report-btn">› Export data</button>
        </div>
      </div>
    </div>
  );
}