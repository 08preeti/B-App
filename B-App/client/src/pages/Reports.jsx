import { useState } from "react";
import { api } from "../api";

export default function Reports() {
  const [billModal, setBillModal] = useState(false);
  const [monthModal, setMonthModal] = useState(false);
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const openBillModal = async () => {
    const data = await api("/bills");
    setBills(data);
    setBillModal(true);
  };

  const exportSingleBill = () => {
    const bill = bills.find(b => (b._id || b.id) === selectedBill);
    if (!bill) return;
    const content = [
      "B App — Bill Export",
      "===================",
      `Vendor: ${bill.vendor}`,
      `Date: ${bill.date}`,
      `Bill No: ${bill.billNo || "—"}`,
      `Amount: ₹${bill.amount}`,
      `Tax (CGST+SGST+IGST): ₹${bill.tax || 0}`,
      `Category: ${bill.category}`,
      `Payment: ${bill.payment}`,
      `Notes: ${bill.notes || "—"}`,
      bill.fileUrl ? `Receipt: ${bill.fileUrl}` : "",
    ].join("\n");
    download("bill-export.txt", content);
    setBillModal(false);
  };

  const exportMonthly = async () => {
    setExporting(true);
    try {
      const data = await api("/bills");
      const [yr, mo] = selectedMonth.split("-");
      const filtered = data.filter(b => b.date?.startsWith(`${yr}-${mo}`));
      const totalAmt = filtered.reduce((s, b) => s + b.amount, 0);
      const totalTax = filtered.reduce((s, b) => s + (b.tax || 0), 0);
      const rows = [
        "Vendor,Date,Bill No,Category,Amount,Tax,Payment",
        ...filtered.map(b =>
          `${b.vendor},${b.date},${b.billNo || ""},${b.category},${b.amount},${b.tax || 0},${b.payment}`
        ),
        "",
        `TOTAL,,,,${totalAmt},${totalTax},`,
      ].join("\n");
      download(`B-App-Report-${selectedMonth}.csv`, rows);
    } finally {
      setExporting(false);
      setMonthModal(false);
    }
  };

  const exportAllCSV = async () => {
    setLoading(true);
    try {
      const data = await api("/bills");
      const rows = [
        "Vendor,Date,Bill No,Category,Amount,Tax,Payment,Notes",
        ...data.map(b =>
          `"${b.vendor}","${b.date}","${b.billNo || ""}","${b.category}",${b.amount},${b.tax || 0},"${b.payment}","${b.notes || ""}"`
        ),
      ].join("\n");
      download("B-App-All-Bills.csv", rows);
    } finally {
      setLoading(false);
    }
  };

  const download = (filename, text) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = filename;
    a.click();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">Export your bills and spending data</p>
        </div>
      </div>

      <div className="report-grid">
        <div className="report-card">
          <div className="report-icon">🧾</div>
          <div style={{ flex: 1 }}>
            <div className="report-title">Single Bill Export</div>
            <div className="report-desc">Export one bill as a text file with all details and receipt link.</div>
          </div>
          <button className="report-btn" onClick={openBillModal}>Choose bill →</button>
        </div>

        <div className="report-card">
          <div className="report-icon">📄</div>
          <div style={{ flex: 1 }}>
            <div className="report-title">Monthly Report</div>
            <div className="report-desc">All bills for a month exported as a CSV with totals.</div>
          </div>
          <button className="report-btn" onClick={() => setMonthModal(true)}>Pick month →</button>
        </div>

        <div className="report-card">
          <div className="report-icon">📊</div>
          <div style={{ flex: 1 }}>
            <div className="report-title">Export All Data</div>
            <div className="report-desc">Every bill as a row — download as Excel-compatible CSV.</div>
          </div>
          <button className="report-btn" onClick={exportAllCSV} disabled={loading}>
            {loading ? "Exporting…" : "Export CSV →"}
          </button>
        </div>
      </div>

      {/* Single Bill Modal */}
      {billModal && (
        <div className="modal-overlay" onClick={() => setBillModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Choose a Bill to Export</h3>
              <button className="modal-close" onClick={() => setBillModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {bills.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>No bills found. Add some bills first.</p>
              ) : (
                <div className="field full">
                  <label>Select Bill</label>
                  <select value={selectedBill} onChange={e => setSelectedBill(e.target.value)}>
                    <option value="">— Choose —</option>
                    {bills.map(b => (
                      <option key={b._id || b.id} value={b._id || b.id}>
                        {b.vendor} · {b.date} · ₹{b.amount}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setBillModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={exportSingleBill} disabled={!selectedBill}>Export</button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Report Modal */}
      {monthModal && (
        <div className="modal-overlay" onClick={() => setMonthModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Monthly Report</h3>
              <button className="modal-close" onClick={() => setMonthModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="field full">
                <label>Select Month</label>
                <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setMonthModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={exportMonthly} disabled={exporting}>
                {exporting ? "Exporting…" : "Export CSV"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}