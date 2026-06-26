require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const twilio = require("twilio");

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ─── MongoDB ───────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((e) => console.error("MongoDB error:", e));

const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, unique: true, required: true },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);

// ─── OTP Store (in-memory, 5 min TTL) ─────────────────────────────────────────
const otpStore = {};

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// ─── POST /api/auth/send-otp ───────────────────────────────────────────────────
app.post("/api/auth/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\d{10}$/.test(phone))
    return res.status(400).json({ message: "Enter a valid 10-digit phone number" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[phone] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

  try {
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    await twilioClient.messages.create({
      body: `Your B App OTP is ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE,
      to: `+91${phone}`,
    });
    console.log(`OTP ${otp} sent to +91${phone}`);
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Twilio error:", err.message);
    res.status(500).json({ message: "Failed to send OTP. Try again." });
  }
});

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
app.post("/api/auth/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;
  const record = otpStore[phone];

  if (!record) return res.status(400).json({ message: "Request OTP first" });
  if (Date.now() > record.expiresAt) {
    delete otpStore[phone];
    return res.status(400).json({ message: "OTP expired. Request a new one." });
  }
  if (record.otp !== otp) return res.status(400).json({ message: "Incorrect OTP" });

  delete otpStore[phone];

  let user = await User.findOne({ phoneNumber: `+91${phone}` });
  if (!user) user = await User.create({ phoneNumber: `+91${phone}` });

  const token = jwt.sign(
    { userId: user._id, phone: user.phoneNumber },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, user: { id: user._id, phone: user.phoneNumber } });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ id: user._id, phone: user.phoneNumber });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));