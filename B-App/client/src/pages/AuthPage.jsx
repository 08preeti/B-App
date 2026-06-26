import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:5000/api";

export default function AuthPage() {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timer, setTimer] = useState(0);
  const otpRefs = useRef([]);
  const timerRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [timer]);

  const showError = (msg) => { setError(msg); setTimeout(() => setError(""), 4000); };
  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 4000); };

  const handleSendOtp = async () => {
    if (phone.length !== 10) return showError("Enter a valid 10-digit number");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStep("otp"); setTimer(60);
      showSuccess("OTP sent to your mobile!");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e) { showError(e.message || "Failed to send OTP"); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) return showError("Enter the 6-digit OTP");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      login(data.token, data.user);
      navigate("/app/dashboard");
    } catch (e) {
      showError(e.message || "Verification failed");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo-row">
          <div className="auth-logo">B</div>
          <div>
            <div className="auth-brand">B App</div>
            <div className="auth-brand-sub">Business • Budget • Bills</div>
          </div>
        </div>

        {error && <div className="toast error">⚠ {error}</div>}
        {success && <div className="toast success">✓ {success}</div>}

        {step === "phone" && (
          <>
            <h2 className="auth-title">Welcome back</h2>
            <p className="auth-desc">Enter your phone number to receive a one-time code.</p>
            <label className="field-label">Phone Number</label>
            <div className="phone-row">
              <span className="phone-prefix">🇮🇳 +91</span>
              <input className="phone-input" type="tel" placeholder="9876543210"
                maxLength={10} value={phone} autoFocus
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()} />
            </div>
            <button className="auth-btn" onClick={handleSendOtp}
              disabled={loading || phone.length !== 10}>
              {loading ? <span className="spin" /> : "Send OTP →"}
            </button>
            <p className="auth-note">🔒 Secured with OTP verification</p>
          </>
        )}

        {step === "otp" && (
          <>
            <button className="back-link" onClick={() => { setStep("phone"); setOtp(["","","","","",""]); }}>← Change number</button>
            <h2 className="auth-title">Enter OTP</h2>
            <p className="auth-desc">Sent to <strong>+91 {phone}</strong></p>
            <div className="otp-row">
              {otp.map((d, i) => (
                <input key={i} ref={(el) => (otpRefs.current[i] = el)}
                  className={`otp-box${d ? " filled" : ""}`} type="tel"
                  maxLength={1} value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKey(i, e)} />
              ))}
            </div>
            <button className="auth-btn" onClick={handleVerify}
              disabled={loading || otp.join("").length !== 6}>
              {loading ? <span className="spin" /> : "Verify & Continue"}
            </button>
            <div className="resend-row">
              {timer > 0
                ? <span className="resend-timer">Resend in {timer}s</span>
                : <button className="resend-btn" onClick={() => { setOtp(["","","","","",""]); handleSendOtp(); }}>Resend OTP</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}