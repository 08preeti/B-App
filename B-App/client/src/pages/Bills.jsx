import { useState, useRef, useEffect } from "react";
import { uploadToCloudinary } from "../utils/cloudinary";
import Tesseract from "tesseract.js";
import { api } from "../api";

const CAT_COLORS = {
  Travel: "#0ea5a0", Food: "#f59e0b", Medical: "#ef4444",
  Office: "#3b82f6", Fashion: "#8b5cf6", Subscriptions: "#10b981", Other: "#64748b"
};

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN"); }

const emptyForm = {
  vendor: "", date: "", categoryId: "", category: "",
  amount: "", cgst: "", sgst: "", igst: "",
  payment: "UPI", billNo: "", notes: ""
};

export default function Bills() {
  const [search, setSearch]         = useState("");
  const [catFilter, setCatFilter]   = useState("All");
  const [taxOnly, setTaxOnly]       = useState(false);
  const [bills, setBills]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);

  // Add modal
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);
  const fileInputRef                = useRef(null);

  // Detail drawer
  const [detail, setDetail]         = useState(null);

  // Edit modal
  const [editBill, setEditBill]     = useState(null);
  const [editForm, setEditForm]     = useState(emptyForm);
  const [saving, setSaving]         = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([api("/bills"), api("/categories")])
      .then(([b, c]) => {
        setBills(b);
        setCategories(c);
        if (c.length) setForm(f => ({ ...f, categoryId: c[0]._id, category: c[0].name }));
      })
      .finally(() => setLoading(false));
  }, []);

  // ── OCR ─────────────────────────────────────────────────────────────────
  const runOCR = async (file, setter) => {
    if (file.type === "application/pdf") return;
    setOcrLoading(true);
    try {
      const { data: { text } } = await Tesseract.recognize(file, "eng");
      const u = {};
      const totalMatch = text.match(/total[\s\S]{0,10}?(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i)
        || text.match(/(?:₹|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i);
      if (totalMatch) u.amount = totalMatch[1].replace(/,/g, "");
      const cgst = text.match(/cgst[\s\S]{0,15}?([\d,]+(?:\.\d{1,2})?)/i);
      const sgst = text.match(/sgst[\s\S]{0,15}?([\d,]+(?:\.\d{1,2})?)/i);
      const igst = text.match(/igst[\s\S]{0,15}?([\d,]+(?:\.\d{1,2})?)/i);
      const gst  = text.match(/gst[\s\S]{0,15}?([\d,]+(?:\.\d{1,2})?)/i);
      if (cgst) u.cgst = cgst[1].replace(/,/g,"");
      if (sgst) u.sgst = sgst[1].replace(/,/g,"");
      if (igst) u.igst = igst[1].replace(/,/g,"");
      if (!cgst && !sgst && !igst && gst) u.igst = gst[1].replace(/,/g,"");
      const dateMatch = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
      if (dateMatch) u.date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      const billNoMatch = text.match(/(?:invoice\s*no|bill\s*no|receipt\s*no)[.\s:]*([A-Z0-9][A-Z0-9\/\-]{3,})/i);
      if (billNoMatch) u.billNo = billNoMatch[1].trim();
      setter(f => ({ ...f, ...u }));
    } catch (e) { console.error("OCR:", e); }
    finally { setOcrLoading(false); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; }
    setUploadedFile(file);
    runOCR(file, setForm);
  };

  // ── Add Bill ─────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.vendor || !form.date || !form.amount) return;
    let fileUrl = null, fileName = null;
    if (uploadedFile) {
      try {
        setUploading(true);
        const r = await uploadToCloudinary(uploadedFile);
        fileUrl = r.url; fileName = uploadedFile.name;
      } catch { alert("Upload failed"); return; }
      finally { setUploading(false); }
    }
    try {
      const saved = await api("/bills", {
        method: "POST",
        body: JSON.stringify({
          vendor: form.vendor, date: form.date, billNo: form.billNo,
          payment: form.payment, amount: +form.amount,
          cgst: +form.cgst||0, sgst: +form.sgst||0, igst: +form.igst||0,
          categoryId: form.categoryId, notes: form.notes, fileUrl, fileName,
        }),
      });
      setBills([{
        ...saved, id: saved._id,
        vendor: form.vendor, date: form.date, billNo: form.billNo,
        payment: form.payment, category: form.category,
        tax: (+form.cgst||0)+(+form.sgst||0)+(+form.igst||0),
        cgst: +form.cgst||0, sgst: +form.sgst||0, igst: +form.igst||0,
      }, ...bills]);
      setShowAdd(false);
      setUploadedFile(null);
      setForm({ ...emptyForm, categoryId: categories[0]?._id||"", category: categories[0]?.name||"" });
    } catch (e) { alert("Save failed: " + e.message); }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this bill?")) return;
    await api(`/bills/${id}`, { method: "DELETE" });
    setBills(bills.filter(b => (b._id||b.id) !== id));
    if (detail && (detail._id||detail.id) === id) setDetail(null);
  };

  // ── Open edit ────────────────────────────────────────────────────────────
  const openEdit = (e, bill) => {
    e.stopPropagation();
    setEditBill(bill);
    setEditForm({
      vendor:     bill.vendor      || "",
      date:       bill.date        || "",
      billNo:     bill.billNo      || "",
      payment:    bill.payment     || "UPI",
      amount:     bill.amount      || "",
      cgst:       bill.cgst        || "",
      sgst:       bill.sgst        || "",
      igst:       bill.igst        || "",
      categoryId: bill.categoryId  || categories.find(c=>c.name===bill.category)?._id || "",
      category:   bill.category    || "",
      notes:      bill.notes       || "",
    });
  };

  // ── Save edit ────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editForm.vendor || !editForm.date || !editForm.amount) return;
    setSaving(true);
    try {
      const id = editBill._id || editBill.id;
      await api(`/bills/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          vendorName:  editForm.vendor,
          billDate:    editForm.date,
          billNumber:  editForm.billNo,
          paymentMode: editForm.payment,
          amount:      +editForm.amount,
          tax: {
            cgst: +editForm.cgst||0,
            sgst: +editForm.sgst||0,
            igst: +editForm.igst||0,
          },
          categoryId: editForm.categoryId,
          notes:      editForm.notes,
        }),
      });
      const cat = categories.find(c => c._id === editForm.categoryId);
      const updated = {
        ...editBill,
        vendor: editForm.vendor, date: editForm.date, billNo: editForm.billNo,
        payment: editForm.payment, amount: +editForm.amount,
        cgst: +editForm.cgst||0, sgst: +editForm.sgst||0, igst: +editForm.igst||0,
        tax: (+editForm.cgst||0)+(+editForm.sgst||0)+(+editForm.igst||0),
        category: cat?.name || editForm.category,
        notes: editForm.notes,
      };
      setBills(bills.map(b => (b._id||b.id) === id ? updated : b));
      if (detail && (detail._id||detail.id) === id) setDetail(updated);
      setEditBill(null);
    } catch (e) { alert("Update failed: " + e.message); }
    finally { setSaving(false); }
  };

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed || categories.find(c=>c.name===trimmed)) return;
    const saved = await api("/categories", {
      method: "POST",
      body: JSON.stringify({ name: trimmed, isDefault: false, color: "#14b8a6" }),
    });
    setCategories([...categories, saved]);
    setForm({ ...form, category: saved.name, categoryId: saved._id });
    setNewCategory(""); setShowAddCat(false);
  };

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = bills.filter(b => {
    if (catFilter !== "All" && b.category !== catFilter) return false;
    if (taxOnly && !b.tax) return false;
    if (search && !b.vendor?.toLowerCase().includes(search.toLowerCase())
               && !b.billNo?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="page"><p style={{color:"var(--muted)",paddingTop:20}}>Loading bills…</p></div>;

  // ── Reusable form fields ─────────────────────────────────────────────────
  const BillFormFields = ({ f, set, cats }) => (
    <div className="form-grid">
      <div className="field full">
        <label>Vendor Name *</label>
        <input value={f.vendor} onChange={e=>set({...f,vendor:e.target.value})} placeholder="e.g. Swiggy" />
      </div>
      <div className="field">
        <label>Bill Date *</label>
        <input type="date" value={f.date} onChange={e=>set({...f,date:e.target.value})} />
      </div>
      <div className="field">
        <label>Bill Number</label>
        <input value={f.billNo} onChange={e=>set({...f,billNo:e.target.value})} placeholder="e.g. INV-001" />
      </div>
      <div className="field">
        <label>Amount (₹) *</label>
        <input type="number" value={f.amount} onChange={e=>set({...f,amount:e.target.value})} placeholder="0" />
      </div>
      <div className="field">
        <label>Payment Mode</label>
        <select value={f.payment} onChange={e=>set({...f,payment:e.target.value})}>
          {["UPI","Card","Cash","Net Banking","Auto-pay"].map(p=><option key={p}>{p}</option>)}
        </select>
      </div>
      <p className="form-section-label">GST Breakdown</p>
      <div className="field">
        <label>CGST (₹)</label>
        <input type="number" value={f.cgst} onChange={e=>set({...f,cgst:e.target.value})} placeholder="0" />
      </div>
      <div className="field">
        <label>SGST (₹)</label>
        <input type="number" value={f.sgst} onChange={e=>set({...f,sgst:e.target.value})} placeholder="0" />
      </div>
      <div className="field">
        <label>IGST (₹)</label>
        <input type="number" value={f.igst} onChange={e=>set({...f,igst:e.target.value})} placeholder="0" />
      </div>
      <div className="field">
        <label>Category</label>
        <select value={f.categoryId} onChange={e=>{
          if(e.target.value==="__add__"){setShowAddCat(true);return;}
          const cat=cats.find(c=>c._id===e.target.value);
          set({...f,categoryId:e.target.value,category:cat?.name||""});
        }}>
          {cats.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}
          <option value="__add__">+ Add new category</option>
        </select>
      </div>
      <div className="field full">
        <label>Notes</label>
        <input value={f.notes} onChange={e=>set({...f,notes:e.target.value})} placeholder="Optional notes…" />
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bills</h1>
          <p className="page-sub">{filtered.length} of {bills.length} entries</p>
        </div>
        <button className="primary-btn" onClick={()=>{ setUploadedFile(null); setShowAdd(true); }}>+ Add Bill</button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input className="search-input" placeholder="🔍 Search vendor or bill number…"
          value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="select-input" value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
          <option>All</option>
          {categories.map(c=><option key={c._id}>{c.name}</option>)}
        </select>
        <label className="tax-toggle">
          <input type="checkbox" checked={taxOnly} onChange={e=>setTaxOnly(e.target.checked)} />
          <span>Tax only</span>
        </label>
      </div>

      {/* Bills table */}
      <div className="table-card">
        {filtered.length === 0 && <div className="empty-state">No bills found. Click <strong>+ Add Bill</strong> to get started.</div>}
        {filtered.map(bill => {
          const id = bill._id || bill.id;
          const color = CAT_COLORS[bill.category] || "#64748b";
          return (
            <div key={id} className="bill-row" onClick={()=>setDetail(bill)} style={{cursor:"pointer"}}>
              <div className="bill-icon">
                {bill.fileUrl
                  ? <a href={bill.fileUrl} target="_blank" rel="noreferrer"
                       onClick={e=>e.stopPropagation()} style={{textDecoration:"none"}}>📎</a>
                  : "🧾"}
              </div>
              <div className="bill-info">
                <div className="bill-vendor">{bill.vendor}</div>
                <div className="bill-meta">{bill.date} · {bill.billNo || "—"} · {bill.payment}</div>
              </div>
              <span className="cat-badge" style={{ background:color+"22", color }}>{bill.category}</span>
              <div className="bill-amount">{fmt(bill.amount)}</div>
              <div className="bill-actions">
                <button className="icon-btn edit" title="Edit" onClick={e=>openEdit(e,bill)}>✏</button>
                <button className="icon-btn delete" title="Delete" onClick={e=>handleDelete(e,id)}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detail Drawer ─────────────────────────────────────────────────── */}
      {detail && (
        <>
          <div className="drawer-backdrop" onClick={()=>setDetail(null)} />
          <div className="drawer">
            <div className="drawer-header">
              <div>
                <h3 className="drawer-title">{detail.vendor}</h3>
                <p className="drawer-sub">{detail.date}</p>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="icon-btn edit" onClick={e=>{ openEdit(e,detail); setDetail(null); }}>✏</button>
                <button className="modal-close" onClick={()=>setDetail(null)}>✕</button>
              </div>
            </div>
            <div className="drawer-body">

              <div className="detail-amount">{fmt(detail.amount)}</div>
              <div className="detail-badge-row">
                <span className="cat-badge" style={{
                  background:(CAT_COLORS[detail.category]||"#64748b")+"22",
                  color:CAT_COLORS[detail.category]||"#64748b"
                }}>{detail.category}</span>
                <span className="cat-badge" style={{background:"#f1f5f9",color:"#64748b"}}>{detail.payment}</span>
              </div>

              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Bill Number</span>
                  <span className="detail-val">{detail.billNo || "—"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date</span>
                  <span className="detail-val">{detail.date}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Amount</span>
                  <span className="detail-val">{fmt(detail.amount)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">CGST</span>
                  <span className="detail-val">{fmt(detail.cgst||0)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">SGST</span>
                  <span className="detail-val">{fmt(detail.sgst||0)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">IGST</span>
                  <span className="detail-val">{fmt(detail.igst||0)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total Tax</span>
                  <span className="detail-val" style={{color:"var(--teal-dark)",fontWeight:700}}>{fmt(detail.tax||0)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Payment</span>
                  <span className="detail-val">{detail.payment}</span>
                </div>
                {detail.notes && (
                  <div className="detail-row full">
                    <span className="detail-label">Notes</span>
                    <span className="detail-val">{detail.notes}</span>
                  </div>
                )}
              </div>

              {detail.fileUrl && (
                <a href={detail.fileUrl} target="_blank" rel="noreferrer" className="drawer-file-btn">
                  📎 View attached receipt
                </a>
              )}
            </div>
            <div className="drawer-footer">
              <button className="danger-btn" onClick={e=>handleDelete(e, detail._id||detail.id)}>Delete Bill</button>
              <button className="primary-btn" onClick={e=>{ openEdit(e,detail); setDetail(null); }}>Edit Bill</button>
            </div>
          </div>
        </>
      )}

      {/* ── Add Bill Modal ─────────────────────────────────────────────────── */}
      {showAdd && (
        <div className="modal-overlay" onClick={()=>setShowAdd(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Bill</h3>
              <button className="modal-close" onClick={()=>setShowAdd(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* File upload */}
              <div className="field full" style={{marginBottom:16}}>
                <label>Upload Bill (Image / PDF)</label>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf"
                  className="file-input-hidden" onChange={handleFileChange} />
                <div className={`file-upload-area ${uploadedFile?"has-file":""}`}
                  onClick={()=>fileInputRef.current?.click()}
                  onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f&&f.size<=5*1024*1024){setUploadedFile(f);runOCR(f,setForm);}}}
                  onDragOver={e=>e.preventDefault()}>
                  <div className="file-upload-icon">{uploadedFile?"✅":"📁"}</div>
                  {ocrLoading && <div style={{fontSize:12,color:"var(--teal)",marginTop:6}}>🔍 Reading bill…</div>}
                  {uploadedFile
                    ? <><div className="file-upload-text">File selected</div><div className="file-name">{uploadedFile.name}</div></>
                    : <div className="file-upload-text"><strong>Click to upload</strong> or drag &amp; drop<br/>JPG, PNG, PDF up to 5MB</div>}
                </div>
              </div>
              <BillFormFields f={form} set={setForm} cats={categories} />
              {showAddCat && (
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <input placeholder="New category" value={newCategory}
                    onChange={e=>setNewCategory(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&handleAddCategory()} style={{flex:1}} />
                  <button className="primary-btn" onClick={handleAddCategory}>Add</button>
                  <button className="cancel-btn" onClick={()=>{setShowAddCat(false);setNewCategory("");}}>✕</button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={()=>setShowAdd(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleAdd} disabled={uploading||ocrLoading}>
                {uploading?"Uploading…":ocrLoading?"Reading bill…":"Save Bill"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Bill Modal ─────────────────────────────────────────────────── */}
      {editBill && (
        <div className="modal-overlay" onClick={()=>setEditBill(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Bill</h3>
              <button className="modal-close" onClick={()=>setEditBill(null)}>✕</button>
            </div>
            <div className="modal-body">
              <BillFormFields f={editForm} set={setEditForm} cats={categories} />
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={()=>setEditBill(null)}>Cancel</button>
              <button className="primary-btn" onClick={handleSaveEdit} disabled={saving}>
                {saving?"Saving…":"Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}