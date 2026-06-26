import { useState } from "react";

const DEFAULT_CATS = [
  { id: 1, name: "Travel", isDefault: true, color: "#14b8a6" },
  { id: 2, name: "Food", isDefault: true, color: "#f59e0b" },
  { id: 3, name: "Medical", isDefault: true, color: "#ef4444" },
  { id: 4, name: "Office", isDefault: true, color: "#3b82f6" },
  { id: 5, name: "Fashion", isDefault: true, color: "#8b5cf6" },
  { id: 6, name: "Subscriptions", isDefault: false, color: "#10b981" },
  { id: 7, name: "Other", isDefault: true, color: "#6b7280" },
];

export default function Categories() {
  const [cats, setCats] = useState(DEFAULT_CATS);
  const [newCat, setNewCat] = useState("");
  const [newColor, setNewColor] = useState("#14b8a6");

  const handleAdd = () => {
    if (!newCat.trim()) return;
    setCats([...cats, { id: Date.now(), name: newCat.trim(), isDefault: false, color: newColor }]);
    setNewCat("");
  };

  const handleDelete = (id) => setCats(cats.filter((c) => c.id !== id));

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
          <div key={cat.id} className="cat-card">
            <div className="cat-left">
              <div className="cat-dot" style={{ background: cat.color }} />
              <span className="cat-name">{cat.name}</span>
              {cat.isDefault && <span className="default-badge">default</span>}
            </div>
            {!cat.isDefault && (
              <button className="icon-btn delete" onClick={() => handleDelete(cat.id)}>🗑</button>
            )}
          </div>
        ))}

        {/* Add new */}
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