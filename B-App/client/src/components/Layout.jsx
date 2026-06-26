import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import heroLogo from "../assets/hero.png";

const navItems = [
  { path: "dashboard", label: "Dashboard", icon: "⊞" },
  { path: "bills", label: "Bills", icon: "🧾" },
  { path: "categories", label: "Categories", icon: "🏷" },
  { path: "budgets", label: "Budgets", icon: "💰" },
  { path: "reports", label: "Reports", icon: "📄" },
  { path: "analytics", label: "Analytics", icon: "📊" },
  { path: "settings", label: "Settings", icon: "⚙" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
  <img src={heroLogo} alt="B App Logo" className="s-logo-img" />
  <div>
    <div className="s-logo-name">B App</div>
    <div className="s-logo-sub">Business • Budget • Bills</div>
  </div>
</div>
<div className="s-subtitle">Track expenses and manage budgets</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink key={item.path} to={`/app/${item.path}`}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="s-user">
            <div className="s-avatar">👤</div>
            <div className="s-phone">{user?.phone}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>↪ Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}