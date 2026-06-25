import { useState, useEffect, useRef } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

export default function App() {
  const [step, setStep] = useState("phone"); // phone | otp | dashboard
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timer, setTimer] = useState(0);
  const [user, setUser] = useState(null);
  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("bapp_token");
    const savedUser = localStorage.getItem("bapp_user");
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setStep("dashboard");
    }
  }, []);

  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [timer]);

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 4000);
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) return showError("Enter a valid 10-digit number");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStep("otp");
      setTimer(60);
      showSuccess("OTP sent to your mobile!");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e) {
      showError(e.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) return showError("Enter the 6-digit OTP");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      localStorage.setItem("bapp_token", data.token);
      localStorage.setItem("bapp_user", JSON.stringify(data.user));
      setUser(data.user);
      setStep("dashboard");
    } catch (e) {
      showError(e.message || "Verification failed");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setOtp(["", "", "", "", "", ""]);
    await handleSendOtp();
  };

  const handleLogout = () => {
    localStorage.removeItem("bapp_token");
    localStorage.removeItem("bapp_user");
    setUser(null);
    setPhone("");
    setOtp(["", "", "", "", "", ""]);
    setStep("phone");
  };

  if (step === "dashboard") {
    return (
      <div className="app">
        <div className="dashboard-card">
          <div className="db-logo">B</div>
          <h1 className="db-title">Welcome to B App</h1>
          <p className="db-sub">Business. Budget. Bills.</p>
          <div className="db-phone-badge">
            <span className="db-phone-icon">📱</span>
            <span>{user?.phone}</span>
          </div>
          <div className="db-features">
            <div className="db-feature">
              <span>📊</span><p>Dashboard</p>
            </div>
            <div className="db-feature">
              <span>🧾</span><p>Bills</p>
            </div>
            <div className="db-feature">
              <span>💰</span><p>Budgets</p>
            </div>
            <div className="db-feature">
              <span>📈</span><p>Reports</p>
            </div>
          </div>
          <p className="db-coming">Full dashboard coming in Sprint 2 →</p>
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Background orbs */}
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />

      <div className="auth-card">
        {/* Logo */}
        <div className="logo-wrap">
          <div className="logo-box">B</div>
          <div>
            <h1 className="brand">B App</h1>
            <p className="brand-sub">Business. Budget. Bills.</p>
          </div>
        </div>

        {/* Toast */}
        {error && <div className="toast toast-error">⚠ {error}</div>}
        {success && <div className="toast toast-success">✓ {success}</div>}

        {step === "phone" && (
          <>
            <h2 className="step-title">Sign in</h2>
            <p className="step-desc">No password needed — we'll send you a one-time code.</p>

            <div className="field-wrap">
              <label className="field-label">Phone number</label>
              <div className="phone-input-wrap">
                <span className="country-code">🇮🇳 +91</span>
                <input
                  className="phone-input"
                  type="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  autoFocus
                />
              </div>
            </div>

            <button
              className={`primary-btn ${loading ? "loading" : ""}`}
              onClick={handleSendOtp}
              disabled={loading || phone.length !== 10}
            >
              {loading ? <span className="spinner" /> : "Send OTP →"}
            </button>

            <p className="privacy-note">🔒 We never store your number without consent.</p>
          </>
        )}

        {step === "otp" && (
          <>
            <button className="back-btn" onClick={() => { setStep("phone"); setOtp(["","","","","",""]); }}>
              ← Change number
            </button>
            <h2 className="step-title">Enter OTP</h2>
            <p className="step-desc">
              Sent to <strong>+91 {phone}</strong>
            </p>

            <div className="otp-row">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  className={`otp-box ${digit ? "filled" : ""}`}
                  type="tel"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKey(i, e)}
                />
              ))}
            </div>

            <button
              className={`primary-btn ${loading ? "loading" : ""}`}
              onClick={handleVerify}
              disabled={loading || otp.join("").length !== 6}
            >
              {loading ? <span className="spinner" /> : "Verify & Continue"}
            </button>

            <div className="resend-wrap">
              {timer > 0 ? (
                <span className="resend-timer">Resend in {timer}s</span>
              ) : (
                <button className="resend-btn" onClick={handleResend}>
                  Resend OTP
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
