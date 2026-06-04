// ============================================================
// Sentio — Auth Routes
// POST /api/auth/send-otp      — send OTP to email
// POST /api/auth/verify-otp    — verify OTP, return a short-lived verified token
// POST /api/auth/register      — requires verifiedToken from verify-otp step
// POST /api/auth/login
// GET  /api/auth/me
// ============================================================

const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, OtpToken } = require("../models");
const authMiddleware = require("../middleware/auth");
const { checkDailyNotifications } = require("../utils/notifications");
const { sendOtpEmail } = require("../utils/email");

// ─── Helper: format user for response ─────────
function formatUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak || 0,
        badges: user.badges,
        lastSessionDate: user.lastSessionDate,
        isAdmin: user.isAdmin || false,
    };
}

// ─── Send OTP ─────────────────────────────────
// POST /api/auth/send-otp
// Body: { email }
router.post("/send-otp", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email required" });

        const emailLower = email.toLowerCase().trim();

        // Check if already registered
        const existing = await User.findOne({ email: emailLower });
        if (existing) return res.status(409).json({ error: "Email already registered. Please log in." });

        // Generate 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        // Delete any previous OTP for this email
        await OtpToken.deleteMany({ email: emailLower });

        // Save new OTP
        await OtpToken.create({ email: emailLower, otp });

        // Send email
        await sendOtpEmail(emailLower, otp);

        res.json({ message: "OTP sent to your email. Check your inbox (and spam)." });
    } catch (err) {
        console.error("Send OTP error:", err);
        if (err.message.includes("EMAIL_USER")) {
            return res.status(503).json({ error: "Email service not configured. Contact admin." });
        }
        res.status(500).json({ error: "Failed to send OTP. Try again." });
    }
});

// ─── Verify OTP ───────────────────────────────
// POST /api/auth/verify-otp
// Body: { email, otp }
// Returns: { verifiedToken } — a short-lived JWT proving email was verified
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });

        const emailLower = email.toLowerCase().trim();

        const record = await OtpToken.findOne({ email: emailLower });

        if (!record) return res.status(400).json({ error: "No OTP found. Request a new one." });

        if (new Date() > record.expiresAt) {
            await OtpToken.deleteOne({ _id: record._id });
            return res.status(400).json({ error: "OTP expired. Request a new one." });
        }

        if (record.otp !== String(otp).trim()) {
            return res.status(400).json({ error: "Incorrect OTP. Try again." });
        }

        // OTP correct — delete it (single use)
        await OtpToken.deleteOne({ _id: record._id });

        // Issue a short-lived "email verified" token (5 min)
        const verifiedToken = jwt.sign(
            { emailVerified: emailLower },
            process.env.JWT_SECRET,
            { expiresIn: "5m" }
        );

        res.json({ verifiedToken, message: "Email verified!" });
    } catch (err) {
        console.error("Verify OTP error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Register ─────────────────────────────────
// POST /api/auth/register
// Body: { name, email, password, verifiedToken }
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, verifiedToken } = req.body;

        if (!name || !email || !password)
            return res.status(400).json({ error: "All fields required" });

        if (password.length < 6)
            return res.status(400).json({ error: "Password min 6 characters" });

        // Validate verifiedToken
        if (!verifiedToken)
            return res.status(400).json({ error: "Email verification required" });

        let verifiedEmail;
        try {
            const decoded = jwt.verify(verifiedToken, process.env.JWT_SECRET);
            if (!decoded.emailVerified) throw new Error("Invalid token");
            verifiedEmail = decoded.emailVerified;
        } catch (e) {
            return res.status(400).json({ error: "Email verification expired. Please verify your email again." });
        }

        if (verifiedEmail !== email.toLowerCase().trim())
            return res.status(400).json({ error: "Email mismatch. Please verify the correct email." });

        // Check existing user (double check)
        const existing = await User.findOne({ email: verifiedEmail });
        if (existing)
            return res.status(409).json({ error: "Email already registered" });

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Save user
        const user = await User.create({ name: name.trim(), email: verifiedEmail, passwordHash });

        // Sign JWT
        const token = jwt.sign(
            { userId: user._id, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({ token, user: formatUser(user) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Login ───────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ error: "Email and password required" });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign(
            { userId: user._id, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token, user: formatUser(user) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Get current user (protected) ────────────
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-passwordHash");
        if (!user) return res.status(404).json({ error: "User not found" });

        // Fire and forget - don't block the response
        checkDailyNotifications(req.userId).catch(console.error);

        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;