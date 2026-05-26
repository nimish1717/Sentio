// ============================================================
// Sentio — Mood Routes
// POST /api/mood/analyze   → build fingerprint, save session
// GET  /api/mood/history   → get user's past sessions
// GET  /api/mood/insights  → patterns from history
// ============================================================

const router = require("express").Router();
const axios = require("axios");
const auth = require("../middleware/auth");
const { MoodSession, User } = require("../models");
const { updateGamification } = require("../utils/gamification");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// ─── Analyze mood (main route) ───────────────
// Called after user completes all 3 inputs
router.post("/analyze", auth, async (req, res) => {
    try {
        const { text, cards, context } = req.body;

        if (!cards || !context)
            return res.status(400).json({ error: "cards and context required" });

        // Call Flask to build fingerprint
        const mlResponse = await axios.post(`${ML_URL}/fingerprint`, {
            text: text || "",
            cards: cards || [],
            context: context,
        });

        const { fingerprint, text_scores } = mlResponse.data;

        // Save session to MongoDB
        const session = await MoodSession.create({
            userId: req.userId,
            freeText: text || "",
            selectedCards: cards,
            contextAnswers: context,
            textScores: text_scores,
            emotionFingerprint: fingerprint,
        });

        // Increment user session count
        await User.findByIdAndUpdate(req.userId, { $inc: { totalSessions: 1 } });

        // Update Gamification (Streak & Badges)
        const gamification = await updateGamification(req.userId, session);

        res.status(201).json({
            sessionId: session._id,
            fingerprint,
            text_scores,
            gamification,
        });
    } catch (err) {
        if (err.code === "ECONNREFUSED")
            return res.status(503).json({ error: "ML service unavailable. Is Flask running?" });
        res.status(500).json({ error: err.message });
    }
});

// ─── Get mood history ─────────────────────────
router.get("/history", auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const sessions = await MoodSession.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("recommendationIds", "title type imageUrl feelDescription");

        const total = await MoodSession.countDocuments({ userId: req.userId });

        res.json({
            sessions,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Get insights from history ────────────────
// Analyzes patterns — "You feel sad most on Sundays" etc.
router.get("/insights", auth, async (req, res) => {
    try {
        const sessions = await MoodSession.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(50); // last 50 sessions

        if (sessions.length < 3)
            return res.json({ insights: [], message: "Need at least 3 sessions for insights" });

        const emotions = ["joy", "sadness", "anger", "fear", "surprise", "nostalgia", "curiosity", "calm"];

        // Average emotion scores across all sessions
        const averages = {};
        emotions.forEach(e => {
            const avg = sessions.reduce((sum, s) => sum + (s.emotionFingerprint[e] || 0), 0) / sessions.length;
            averages[e] = parseFloat(avg.toFixed(3));
        });

        // Dominant emotion overall
        const dominant = Object.entries(averages).sort((a, b) => b[1] - a[1])[0][0];

        // Most used cards
        const cardCounts = {};
        sessions.forEach(s => {
            (s.selectedCards || []).forEach(card => {
                cardCounts[card] = (cardCounts[card] || 0) + 1;
            });
        });
        const topCards = Object.entries(cardCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([card]) => card);

        // Day of week patterns
        const dayEmotions = {};
        sessions.forEach(s => {
            const day = new Date(s.createdAt).toLocaleDateString("en-US", { weekday: "long" });
            if (!dayEmotions[day]) dayEmotions[day] = [];
            dayEmotions[day].push(s.emotionFingerprint);
        });

        // Find which day has highest sadness on average
        let saddestDay = null;
        let maxSadness = 0;
        Object.entries(dayEmotions).forEach(([day, fps]) => {
            const avgSad = fps.reduce((s, fp) => s + fp.sadness, 0) / fps.length;
            if (avgSad > maxSadness) { maxSadness = avgSad; saddestDay = day; }
        });

        // Trend calculation (oldest to newest for charting) - limited to 2 moods
        const trend = [...sessions].reverse().map(s => ({
            date: new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            joy: parseFloat(((s.emotionFingerprint.joy || 0) * 100).toFixed(1)),
            sadness: parseFloat(((s.emotionFingerprint.sadness || 0) * 100).toFixed(1)),
        }));

        res.json({
            insights: {
                totalSessions: sessions.length,
                averageFingerprint: averages,
                dominantEmotion: dominant,
                topCards,
                saddestDay,
                trend,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Delete a session ─────────────────────────
router.delete("/:id", auth, async (req, res) => {
    try {
        const session = await MoodSession.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }
        
        // Decrement user session count
        await User.findByIdAndUpdate(req.userId, { $inc: { totalSessions: -1 } });
        
        res.json({ message: "Session deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Share Mood Session ───────────────────────────────────────
router.post("/share/:sessionId", auth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await MoodSession.findOne({ _id: sessionId, userId: req.userId });
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        const { ShareToken } = require("../models");
        
        // Generate a random 8-character token
        const token = Math.random().toString(36).substring(2, 10);
        
        await ShareToken.create({
            token,
            sessionId
        });

        res.json({ token });
    } catch (err) {
        console.error("Share error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;