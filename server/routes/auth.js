// ============================================================
// Sentio — Auth Routes
// POST /api/auth/register
// POST /api/auth/login
// GET  /api/auth/me
// ============================================================

const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const authMiddleware = require("../middleware/auth");
const { checkDailyNotifications } = require("../utils/notifications");

// ─── Register ────────────────────────────────
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Basic validation
        if (!name || !email || !password)
            return res.status(400).json({ error: "All fields required" });

        if (password.length < 6)
            return res.status(400).json({ error: "Password min 6 characters" });

        // Check existing user
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing)
            return res.status(409).json({ error: "Email already registered" });

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Save user
        const user = await User.create({ name, email, passwordHash });

        // Sign JWT
        const token = jwt.sign(
            { userId: user._id, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email,
                currentStreak: user.currentStreak,
                badges: user.badges,
                lastSessionDate: user.lastSessionDate
            },
        });
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

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user)
            return res.status(401).json({ error: "Invalid credentials" });

        // Check password
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid)
            return res.status(401).json({ error: "Invalid credentials" });

        // Sign JWT
        const token = jwt.sign(
            { userId: user._id, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email,
                currentStreak: user.currentStreak,
                badges: user.badges,
                lastSessionDate: user.lastSessionDate
            },
        });
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