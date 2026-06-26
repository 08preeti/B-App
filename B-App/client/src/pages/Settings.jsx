import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currency, setCurrency] = useState("INR (₹)");
  const [notifications, setNotifications] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Manage your account and preferences</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <h3 className="settings-section">Account</h3>
          <div className="settings-row">
            <div>
              <div className="settings-label">Phone Number</div>
              <div className="settings-value">{user?.phone}</div>
            </div>
            <span className="verified-badge">✓ Verified</span>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-section">Preferences</h3>
          <div className="settings-row">
            <div className="settings-label">Currency</div>
            <select className="select-input small" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option>INR (₹)</option>
              <option>USD ($)</option>
              <option>EUR (€)</option>
            </select>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">In-app Notifications</div>
              <div className="settings-hint">Budget alerts and bill reminders</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
              <span className="toggle-track" />
            </label>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Budget Threshold Alerts</div>
              <div className="settings-hint">Alert at 80%, 90%, 100%</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={budgetAlerts} onChange={(e) => setBudgetAlerts(e.target.checked)} />
              <span className="toggle-track" />
            </label>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-section">Data</h3>
          <div className="settings-row">
            <div className="settings-label">Export all data</div>
            <button className="outline-btn">Export CSV</button>
          </div>
          <div className="settings-row">
            <div className="settings-label">Clear all bills</div>
            <button className="danger-btn">Delete all</button>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-section">Session</h3>
          <div className="settings-row">
            <div className="settings-label">Sign out of B App</div>
            <button className="danger-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>
    </div>
  );
}