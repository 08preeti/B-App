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
  };

  const handleDelete = async (id) => {
    await api(`/categories/${id}`, { method: "DELETE" });
    setCats(cats.filter((c) => c._id !== id));
  };

  if (loading) return <div className="page"><p>Loading categories...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-sub">Organise bills into default and custom categories</p>
        </div>
      </div>

      <div className="cat-grid">
        {cats.map((cat) => (
          <div key={cat._id} className="cat-card">
            <div className="cat-left">
              <div className="cat-dot" style={{ background: cat.color }} />
              <span className="cat-name">{cat.name}</span>
              {cat.isDefault && <span className="default-badge">default</span>}
            </div>
            {!cat.isDefault && (
              <button className="icon-btn delete" onClick={() => handleDelete(cat._id)}>🗑</button>
            )}
          </div>
        ))}

        <div className="cat-card add-cat">
          <input className="cat-input" placeholder="New category name..."
            value={newCat} onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <input type="color" className="color-picker" value={newColor}
            onChange={(e) => setNewColor(e.target.value)} title="Pick color" />
          <button className="add-cat-btn" onClick={handleAdd}>+ Add</button>
        </div>
      </div>
    </div>
  );
}