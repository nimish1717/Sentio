// ============================================================
// Sentio — Watchlist Routes
// POST /api/watchlist/toggle
// GET  /api/watchlist
// ============================================================

const router = require("express").Router();
const { Watchlist } = require("../models");
const authMiddleware = require("../middleware/auth");

// ─── Toggle Watchlist Item ──────────────────────────────────
router.post("/toggle", authMiddleware, async (req, res) => {
    try {
        const { contentId, sessionId } = req.body;
        const userId = req.userId;

        if (!contentId) {
            return res.status(400).json({ error: "contentId required" });
        }

        // Check if it already exists
        const existing = await Watchlist.findOne({ userId, contentId });

        if (existing) {
            // Unsave
            await Watchlist.deleteOne({ _id: existing._id });
            return res.json({ message: "Removed from watchlist", saved: false });
        } else {
            // Save
            const saveObj = { userId, contentId };
            if (sessionId) saveObj.sessionId = sessionId;
            const newItem = await Watchlist.create(saveObj);
            return res.status(201).json({ message: "Added to watchlist", saved: true, item: newItem });
        }
    } catch (err) {
        // Handle duplicate key error gracefully just in case of race conditions
        if (err.code === 11000) {
            return res.status(200).json({ message: "Already in watchlist", saved: true });
        }
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Get User's Watchlist ───────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        
        // Fetch all watchlist items for user, populated with content and session details
        const watchlist = await Watchlist.find({ userId })
            .populate("contentId")
            .populate("sessionId", "textScores emotionFingerprint freeText selectedCards")
            .sort({ createdAt: -1 });

        // Transform the response slightly for the frontend to easily consume
        const formattedList = watchlist.map(item => ({
            id: item._id,
            savedAt: item.createdAt,
            content: item.contentId,
            session: item.sessionId
        }));

        res.json({ watchlist: formattedList });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
