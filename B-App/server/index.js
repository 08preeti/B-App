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

// ─── USER MODEL (existing) ─────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, unique: true, required: true },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);

// ─── ADD BELOW: 3 NEW MODELS ──────────────────────────────────────────────────

const categorySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  name:      { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  color:     { type: String, default: "#14b8a6" },
});
const Category = mongoose.model("Category", categorySchema);

const billSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  vendorName:  { type: String, required: true },
  billNumber:  { type: String },
  billDate:    { type: Date, required: true },
  amount:      { type: Number, required: true },
  tax: {
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
  },
  categoryId:  { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  paymentMode: { type: String },
  notes:       { type: String },
  fileUrl:     { type: String },
  createdAt:   { type: Date, default: Date.now },
});
const Bill = mongoose.model("Bill", billSchema);

const budgetSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  limit:      { type: Number, required: true },
  startDate:  { type: Date, required: true },
  endDate:    { type: Date, required: true },
  createdAt:  { type: Date, default: Date.now },
});
const Budget = mongoose.model("Budget", budgetSchema);

// ─── END OF NEW MODELS ────────────────────────────────────────────────────────

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
  // ─── ADD: seed default categories for brand-new users ─────────────────────
  if (!user) {
    user = await User.create({ phoneNumber: `+91${phone}` });
    const defaults = [
      { name: "Travel",  color: "#14b8a6", isDefault: true },
      { name: "Food",    color: "#f59e0b", isDefault: true },
      { name: "Medical", color: "#ef4444", isDefault: true },
      { name: "Office",  color: "#3b82f6", isDefault: true },
      { name: "Fashion", color: "#8b5cf6", isDefault: true },
      { name: "Other",   color: "#6b7280", isDefault: true },
    ];
    await Category.insertMany(defaults.map(d => ({ ...d, userId: user._id })));
  }
  // ─── END ADD ──────────────────────────────────────────────────────────────

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

// ─── ADD BELOW: ALL NEW ROUTES ────────────────────────────────────────────────

// Categories
app.get("/api/categories", authMiddleware, async (req, res) => {
  const cats = await Category.find({ userId: req.user.userId });
  res.json(cats);
});
app.post("/api/categories", authMiddleware, async (req, res) => {
  const cat = await Category.create({ ...req.body, userId: req.user.userId });
  res.json(cat);
});
app.delete("/api/categories/:id", authMiddleware, async (req, res) => {
  await Category.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
  res.json({ success: true });
});

// Bills
app.get("/api/bills", authMiddleware, async (req, res) => {
  const { from, to, category, taxOnly, search } = req.query;
  const filter = { userId: req.user.userId };
  if (from || to) {
    filter.billDate = {};
    if (from) filter.billDate.$gte = new Date(from);
    if (to)   filter.billDate.$lte = new Date(to);
  }
  if (category) filter.categoryId = category;
  if (taxOnly === "true") filter.$or = [
    { "tax.cgst": { $gt: 0 } },
    { "tax.sgst": { $gt: 0 } },
    { "tax.igst": { $gt: 0 } },
  ];
  if (search) filter.$or = [
    { vendorName: { $regex: search, $options: "i" } },
    { billNumber: { $regex: search, $options: "i" } },
  ];
  const bills = await Bill.find(filter).populate("categoryId").sort({ billDate: -1 });
  // Map DB field names → frontend field names so JSX needs zero changes
  const mapped = bills.map(b => ({
    ...b.toObject(),
    id: b._id,
    vendor: b.vendorName,
    date: b.billDate?.toISOString().split("T")[0],
    billNo: b.billNumber,
    payment: b.paymentMode,
    tax: b.tax.cgst + b.tax.sgst + b.tax.igst,  
cgst: b.tax.cgst,
sgst: b.tax.sgst,
igst: b.tax.igst,
    category: b.categoryId?.name,
  }));
  res.json(mapped);
});
app.post("/api/bills", authMiddleware, async (req, res) => {
  const { vendor, date, billNo, payment, tax, ...rest } = req.body;
  const bill = await Bill.create({
    ...rest,
    userId: req.user.userId,
    vendorName: vendor,
    billDate: date,
    billNumber: billNo,
    paymentMode: payment,
    
tax: {
  cgst: Number(req.body.cgst) || 0,
  sgst: Number(req.body.sgst) || 0,
  igst: Number(req.body.igst) || 0,
},
  });
  res.json(bill);
});
app.put("/api/bills/:id", authMiddleware, async (req, res) => {
  const bill = await Bill.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    req.body,
    { new: true }
  );
  res.json(bill);
});
app.delete("/api/bills/:id", authMiddleware, async (req, res) => {
  await Bill.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
  res.json({ success: true });
});

// Budgets
app.get("/api/budgets", authMiddleware, async (req, res) => {
  const budgets = await Budget.find({ userId: req.user.userId }).populate("categoryId");
  const result = await Promise.all(budgets.map(async (b) => {
    const agg = await Bill.aggregate([
      { $match: { userId: b.userId, categoryId: b.categoryId._id,
          billDate: { $gte: b.startDate, $lte: b.endDate } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const spent = agg[0]?.total || 0;
    // Map field names for frontend
    return {
      ...b.toObject(),
      id: b._id,
      category: b.categoryId?.name,
      start: b.startDate?.toISOString().split("T")[0],
      end:   b.endDate?.toISOString().split("T")[0],
      spent,
    };
  }));
  res.json(result);
});
app.post("/api/budgets", authMiddleware, async (req, res) => {
  const { start, end, categoryId, ...rest } = req.body;
  const budget = await Budget.create({
    ...rest,
    userId: req.user.userId,
    categoryId,
    startDate: start,
    endDate: end,
  });
  res.json(budget);
});
app.delete("/api/budgets/:id", authMiddleware, async (req, res) => {
  await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
  res.json({ success: true });
});

// Dashboard summary
app.get("/api/dashboard/summary", authMiddleware, async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.userId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [byCategory, trend, gstAgg] = await Promise.all([
    Bill.aggregate([
      { $match: { userId, billDate: { $gte: startOfMonth } } },
      { $group: { _id: "$categoryId", total: { $sum: "$amount" } } },
      { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
    ]),
    Bill.aggregate([
      { $match: { userId } },
      { $group: { _id: { $month: "$billDate" }, total: { $sum: "$amount" } } },
      { $sort: { "_id": 1 } },
    ]),
    Bill.aggregate([
      { $match: { userId } },
      { $group: { _id: null,
          cgst: { $sum: "$tax.cgst" },
          sgst: { $sum: "$tax.sgst" },
          igst: { $sum: "$tax.igst" } } },
    ]),
  ]);

  res.json({ byCategory, trend, gst: gstAgg[0] || { cgst: 0, sgst: 0, igst: 0 } });
});

// ─── END OF NEW ROUTES ────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));