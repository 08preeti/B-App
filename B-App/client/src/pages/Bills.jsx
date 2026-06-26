import { useState, useRef } from "react";
import { uploadToCloudinary } from "../utils/cloudinary";
import Tesseract from "tesseract.js";
const MOCK_BILLS = [
  { id: 1, vendor: "Indigo Airlines", date: "2026-06-15", category: "Travel", amount: 5840, tax: 420, payment: "UPI", billNo: "IN-4013" },
  { id: 2, vendor: "Cafe Coffee Day", date: "2026-06-16", category: "Food", amount: 540, tax: 0, payment: "UPI", billNo: "CCD-2291" },
  { id: 3, vendor: "Apollo Pharmacy", date: "2026-06-12", category: "Medical", amount: 1260, tax: 63, payment: "Card", billNo: "AP-7314" },
  { id: 4, vendor: "Reliance Digital", date: "2026-06-10", category: "Office", amount: 4200, tax: 756, payment: "Card", billNo: "RD-5417" },
  { id: 5, vendor: "Myntra", date: "2026-06-11", category: "Fashion", amount: 2150, tax: 0, payment: "UPI", billNo: "MY-4411" },
  { id: 6, vendor: "Airtel Postpaid", date: "2026-06-10", category: "Subscriptions", amount: 799, tax: 144, payment: "Auto-pay", billNo: "AT-4438" },
];

const DEFAULT_CATEGORIES = ["Travel", "Food", "Medical", "Office", "Fashion", "Subscriptions"];
const CAT_COLORS = { Travel: "#14b8a6", Food: "#f59e0b", Medical: "#ef4444", Office: "#3b82f6", Fashion: "#8b5cf6", Subscriptions: "#10b981" };

function fmt(n) { return "₹" + n.toLocaleString("en-IN"); }

export default function Bills() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [taxOnly, setTaxOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [bills, setBills] = useState(MOCK_BILLS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newCategory, setNewCategory] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);   
  const [uploading, setUploading] = useState(false);  
  
  const fileInputRef = useRef(null);                         
  const [form, setForm] = useState({
    vendor: "", date: "", category: "Food",
    amount: "", tax: "", payment: "UPI", billNo: "", notes: ""
  });

  const [ocrLoading, setOcrLoading] = useState(false);
  const runOCR = async (file) => {
  setOcrLoading(true);
  try {
    const { data: { text } } = await Tesseract.recognize(file, "eng");
    console.log("OCR Text:", text); // see what it reads

    // Try to extract amount - looks for patterns like ₹1,234 or Total: 500
    const amountMatch = text.match(/(?:total|amount|₹|rs\.?)\s*:?\s*([\d,]+)/i);
    if (amountMatch) {
      setForm(f => ({ ...f, amount: amountMatch[1].replace(/,/g, "") }));
    }

    // Try to extract date - looks for DD/MM/YYYY or YYYY-MM-DD
    const dateMatch = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (dateMatch) {
      setForm(f => ({ ...f, date: `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` }));
    }

    // Try to extract bill number - looks for INV-xxx or Bill No: xxx
    const billNoMatch = text.match(/(?:invoice|bill|receipt|no\.?|#)\s*:?\s*([A-Z0-9\-]+)/i);
    if (billNoMatch) {
      setForm(f => ({ ...f, billNo: billNoMatch[1] }));
    }

  } catch (err) {
    console.error("OCR failed:", err);
  } finally {
    setOcrLoading(false);
  }
};

  const filtered = bills.filter((b) => {
    if (catFilter !== "All" && b.category !== catFilter) return false;
    if (taxOnly && b.tax === 0) return false;
    if (search && !b.vendor.toLowerCase().includes(search.toLowerCase()) &&
        !b.billNo.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAdd = async () => {
    if (!form.vendor || !form.date || !form.amount) return;

    let fileUrl = null;
    let fileName = null;

    if (uploadedFile) {
      try {
        setUploading(true);
        const result = await uploadToCloudinary(uploadedFile);
        fileUrl = result.url;
        fileName = uploadedFile.name;
      } catch (err) {
        alert("File upload failed. Please try again.");
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    setBills([{
      ...form, id: Date.now(),
      amount: +form.amount, tax: +form.tax || 0,
      fileUrl, fileName,
    }, ...bills]);

    setShowModal(false);
    setUploadedFile(null);
    setForm({ vendor: "", date: "", category: "Food", amount: "", tax: "", payment: "UPI", billNo: "", notes: "" });
  };

  const handleDelete = (id) => setBills(bills.filter((b) => b.id !== id));

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    setCategories([...categories, trimmed]);
    setForm({ ...form, category: trimmed });
    setNewCategory("");
    setShowAddCat(false);
  };

  const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { alert("File too large. Max 5MB."); return; }
  setUploadedFile(file);
  runOCR(file); // ← auto-runs when file is picked
};

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File too large. Max 5MB."); return; }
    setUploadedFile(file);
  };

  const openModal = () => { setUploadedFile(null); setShowModal(true); };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bills</h1>
          <p className="page-sub">{filtered.length} of {bills.length} entries</p>
        </div>
        <button className="primary-btn" onClick={openModal}>+ Add Bill</button>
      </div>

      <div className="filter-bar">
        <input className="search-input" placeholder="🔍 Search vendor or bill number..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="select-input" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option>All</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="tax-toggle">
          <input type="checkbox" checked={taxOnly} onChange={(e) => setTaxOnly(e.target.checked)} />
          <span>Tax only</span>
        </label>
      </div>

      <div className="table-card">
        {filtered.map((bill) => (
          <div key={bill.id} className="bill-row">
            <div className="bill-icon">
              {bill.fileUrl
                ? <a href={bill.fileUrl} target="_blank" rel="noreferrer" title={bill.fileName} style={{ textDecoration: "none" }}>📎</a>
                : "🧾"}
            </div>
            <div className="bill-info">
              <div className="bill-vendor">{bill.vendor}</div>
              <div className="bill-meta">{bill.date} · {bill.billNo} · {bill.payment}</div>
            </div>
            <span className="cat-badge" style={{
              background: (CAT_COLORS[bill.category] || "#6b7280") + "22",
              color: CAT_COLORS[bill.category] || "#6b7280"
            }}>
              {bill.category}
            </span>
            <div className="bill-amount">{fmt(bill.amount)}</div>
            <div className="bill-actions">
              <button className="icon-btn edit">✏</button>
              <button className="icon-btn delete" onClick={() => handleDelete(bill.id)}>🗑</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty-state">No bills found</div>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Bill</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">

                {/* ✅ File Upload UI */}
                <div className="field full">
                  <label>Upload Bill (Image / PDF)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="file-input-hidden"
                    onChange={handleFileChange}
                  />
                  <div
                    className={`file-upload-area ${uploadedFile ? "has-file" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <div className="file-upload-icon">
  {uploadedFile ? "✅" : "📁"}
</div>

{ocrLoading && (
  <div
    style={{
      fontSize: "12px",
      color: "var(--teal)",
      marginTop: "6px",
    }}
  >
    🔍 Reading bill... fields will auto-fill
  </div>
)}

{uploadedFile ? (
  <>
    <div className="file-upload-text">File selected</div>
    <div className="file-name">{uploadedFile.name}</div>
    <div
      style={{
        fontSize: "11px",
        color: "var(--muted)",
        marginTop: "4px",
      }}
    >
      Click to change
    </div>
  </>
) : (
  <div className="file-upload-text">
    <strong>Click to upload</strong> or drag &amp; drop
    <br />
    JPG, PNG, PDF up to 5MB
  </div>
)}
                  </div>
                </div>

                <div className="field">
                  <label>Vendor Name *</label>
                  <input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. Swiggy" />
                </div>
                <div className="field">
                  <label>Bill Date *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="field">
                  <label>Amount (₹) *</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                </div>
                <div className="field">
                  <label>Tax (₹)</label>
                  <input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} placeholder="0" />
                </div>

                <div className="field">
                  <label>Category</label>
                  <select value={form.category} onChange={(e) => {
                    if (e.target.value === "__add__") setShowAddCat(true);
                    else setForm({ ...form, category: e.target.value });
                  }}>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="__add__">+ Add new category</option>
                  </select>
                  {showAddCat && (
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <input
                        placeholder="New category name"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                        style={{ flex: 1 }}
                      />
                      <button className="primary-btn" onClick={handleAddCategory}>Add</button>
                      <button className="cancel-btn" onClick={() => { setShowAddCat(false); setNewCategory(""); }}>✕</button>
                    </div>
                  )}
                </div>

                <div className="field">
                  <label>Payment Mode</label>
                  <select value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })}>
                    {["UPI", "Card", "Cash", "Net Banking", "Auto-pay"].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Bill Number</label>
                  <input value={form.billNo} onChange={(e) => setForm({ ...form, billNo: e.target.value })} placeholder="e.g. INV-001" />
                </div>
                <div className="field full">
                  <label>Notes</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleAdd} disabled={uploading}>
                {uploading ? "Uploading..." : "Save Bill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
