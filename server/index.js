// ============================================================
// Sentio — Node/Express Server Entry Point
// ============================================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
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
        app.listen(PORT, () =>
            console.log(`🚀 Server running on http://localhost:${PORT}`)
        );
    })
    .catch((err) => {
        console.error("❌ MongoDB connection failed:", err.message);
        process.exit(1);
    });