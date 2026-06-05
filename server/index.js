// ============================================================
// Sentio — Node/Express Server Entry Point
// ============================================================

const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const cron = require("node-cron");

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Trust Render/Vercel/Heroku proxy (needed for rate-limiter + IP detection)
app.set("trust proxy", 1);


// ── Socket.io initialisation ─────────────────────────────────
const { initSocket } = require("./socket");
initSocket(httpServer);

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || origin.includes('localhost') || origin.includes('vercel.app')) {
            callback(null, true);
        } else {
            callback(null, process.env.CLIENT_URL || true);
        }
    },
    credentials: true
}));
app.use(express.json({ limit: "10kb" })); // block huge payloads

// Rate limiting — 100 requests per 15 min per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests, slow down." },
});
app.use("/api", limiter);

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

app.use("/api/auth", require("./routes/auth"));
app.use("/api/mood", require("./routes/mood"));
app.use("/api/recommend", require("./routes/recommend"));
app.use("/api/content", require("./routes/content"));
app.use("/api/rating", require("./routes/rating"));
app.use("/api/room", require("./routes/room"));
app.use("/api/watchlist", require("./routes/watchlist"));
app.use("/api/search", require("./routes/search"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/share", require("./routes/share"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/report", require("./routes/report"));
app.use("/api/admin", require("./routes/admin"));


// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "Sentio API" });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.message || "Something went wrong",
    });
});

// ─────────────────────────────────────────────
// DATABASE + START
// ─────────────────────────────────────────────

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB connected");
        const PORT = process.env.PORT || 5000;
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);

            // ── Keep ML service alive on Render free tier ──────────────
            // Render free tier spins down services after 15 min of inactivity.
            // Ping the ML /health endpoint every 14 min to prevent cold starts.
            const ML_URL = process.env.ML_SERVICE_URL;
            if (ML_URL && !ML_URL.includes("localhost")) {
                console.log(`🔁 Keep-alive ping scheduled for ML service: ${ML_URL}`);
                setInterval(async () => {
                    try {
                        await axios.get(`${ML_URL}/health`, { timeout: 10000 });
                        console.log("🏓 ML service keep-alive ping OK");
                    } catch (e) {
                        console.warn("⚠️  ML service keep-alive ping failed:", e.message);
                    }
                }, 14 * 60 * 1000); // every 14 minutes
            }

            // ── Weekly cron insights — every Sunday at 9 AM ─────────────
            const { runWeeklyInsights } = require("./utils/weeklyInsights");
            cron.schedule("0 9 * * 0", async () => {
                console.log("📊 Running weekly insights cron...");
                await runWeeklyInsights();
                console.log("📊 Weekly insights cron complete.");
            });
            console.log("⏰ Weekly insights cron scheduled (Sundays 9AM)");
        });
    })
    .catch((err) => {
        console.error("❌ MongoDB connection failed:", err.message);
        process.exit(1);
    });