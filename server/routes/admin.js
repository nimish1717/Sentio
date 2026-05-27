// ============================================================
// Sentio — Admin Routes
// GET  /api/admin/stats        → platform-wide analytics
// POST /api/admin/trigger-cron → manually fire weekly insights
// Protected: requires auth + isAdmin === true
// ============================================================

const router = require("express").Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const { User, MoodSession, Content, Rating, Notification } = require("../models");

// ── isAdmin middleware ────────────────────────────────────────
const isAdmin = async (req, res, next) => {
    const user = await User.findById(req.userId).select("isAdmin");
    if (!user?.isAdmin) return res.status(403).json({ error: "Admin access required" });
    next();
};

// GET /api/admin/stats
router.get("/stats", auth, isAdmin, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // ── Basic counts ──────────────────────────────────────
        const [totalUsers, totalSessions, sessionsToday, totalContent, totalRatings] =
            await Promise.all([
                User.countDocuments(),
                MoodSession.countDocuments(),
                MoodSession.countDocuments({ createdAt: { $gte: today } }),
                Content.countDocuments(),
                Rating.countDocuments(),
            ]);

        // ── Sessions per day (last 30 days) ───────────────────
        const sessionsPerDay = await MoodSession.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // ── Top 5 most recommended content ────────────────────
        const topContent = await MoodSession.aggregate([
            { $match: { recommendationIds: { $exists: true, $ne: [] } } },
            { $unwind: "$recommendationIds" },
            { $group: { _id: "$recommendationIds", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "contents",
                    localField: "_id",
                    foreignField: "_id",
                    as: "content"
                }
            },
            { $unwind: "$content" },
            {
                $project: {
                    title: "$content.title",
                    type: "$content.type",
                    imageUrl: "$content.imageUrl",
                    count: 1
                }
            }
        ]);

        // ── Global emotion distribution (last 7 days) ─────────
        const emotionDimensions = ["joy", "sadness", "anger", "fear", "surprise", "nostalgia", "curiosity", "calm"];
        const recentSessions = await MoodSession.find(
            { createdAt: { $gte: sevenDaysAgo } },
            { emotionFingerprint: 1 }
        );

        const emotionTotals = Object.fromEntries(emotionDimensions.map(e => [e, 0]));
        for (const session of recentSessions) {
            if (session.emotionFingerprint) {
                emotionDimensions.forEach(e => {
                    emotionTotals[e] += session.emotionFingerprint[e] || 0;
                });
            }
        }

        const n = recentSessions.length || 1;
        const emotionDistribution = Object.entries(emotionTotals).map(([emotion, total]) => ({
            emotion,
            average: parseFloat((total / n).toFixed(3))
        })).sort((a, b) => b.average - a.average);

        // ── Content type distribution ──────────────────────────
        const contentTypeDistribution = await Content.aggregate([
            { $group: { _id: "$type", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // ── Ratings breakdown ──────────────────────────────────
        const ratingsBreakdown = await Rating.aggregate([
            { $group: { _id: "$rating", count: { $sum: 1 } } }
        ]);
        const thumbsUp   = ratingsBreakdown.find(r => r._id ===  1)?.count || 0;
        const thumbsDown = ratingsBreakdown.find(r => r._id === -1)?.count || 0;

        // ── Top rated content (most 👍) ────────────────────────
        const topRated = await Rating.aggregate([
            { $match: { rating: 1 } },
            { $group: { _id: "$contentId", likes: { $sum: 1 } } },
            { $sort: { likes: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "contents",
                    localField: "_id",
                    foreignField: "_id",
                    as: "content"
                }
            },
            { $unwind: "$content" },
            {
                $project: {
                    title: "$content.title",
                    type: "$content.type",
                    imageUrl: "$content.imageUrl",
                    likes: 1
                }
            }
        ]);

        res.json({
            overview: { totalUsers, totalSessions, sessionsToday, totalContent, totalRatings },
            sessionsPerDay,
            topContent,
            emotionDistribution,
            contentTypeDistribution,
            ratings: { thumbsUp, thumbsDown },
            topRated,
        });

    } catch (err) {
        console.error("Admin stats error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/trigger-cron  — manually fire weekly insights (for demo/testing)
router.post("/trigger-cron", auth, isAdmin, async (req, res) => {
    try {
        const { runWeeklyInsights } = require("../utils/weeklyInsights");
        await runWeeklyInsights();
        res.json({ message: "Weekly insights cron triggered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
