import { useState, useEffect } from "react";
import { api } from "../api";

export default function Categories() {
  const [cats, setCats] = useState([]);
  const [newCat, setNewCat] = useState("");
  const [newColor, setNewColor] = useState("#14b8a6");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/categories")
      .then(setCats)
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newCat.trim()) return;
    const saved = await api("/categories", {
      method: "POST",
      body: JSON.stringify({ name: newCat.trim(), isDefault: false, color: newColor }),
    });
    setCats([...cats, saved]);
    setNewCat("");
    setNewColor("#14b8a6"); // ✅ reset color after adding
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this category?")) return; // ✅ confirmation before delete
    await api(`/categories/${id}`, { method: "DELETE" });
    setCats(cats.filter((c) => c._id !== id));
  };

  if (loading) return <div className="page"><p style={{ color: "var(--muted)", paddingTop: 20 }}>Loading categories…</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-sub">{cats.length} categories · {cats.filter(c => !c.isDefault).length} custom</p>
        </div>
      </div>

      <div className="cat-grid">
        {cats.map((cat) => (
          <div key={cat._id} className="cat-card">
            <div className="cat-left">
              <div className="cat-dot" style={{ background: cat.color || "#14b8a6" }} />
              <span className="cat-name">{cat.name}</span>
              {cat.isDefault && <span className="default-badge">default</span>}
            </div>
            {!cat.isDefault && (
              <button className="icon-btn delete" onClick={() => handleDelete(cat._id)}>🗑</button>
            )}
          </div>
        ))}

        {/* Add new category card */}
        <div className="cat-card add-cat">
          <input
            className="cat-input"
            placeholder="New category name..."
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <input
            type="color"
            className="color-picker"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            title="Pick color"
          />
          <button className="add-cat-btn" onClick={handleAdd}>+ Add</button>
        </div>
      </div>
    </div>
  );
}