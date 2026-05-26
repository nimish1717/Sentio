const router = require("express").Router();
const { Notification } = require("../models");
const authMiddleware = require("../middleware/auth");

// ─── Get Notifications ──────────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;

        // Get total unread count
        const unreadCount = await Notification.countDocuments({ userId, read: false });

        // Get the last 10 notifications
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            unreadCount,
            notifications
        });
    } catch (err) {
        console.error("Get notifications error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Mark All as Read ───────────────────────────────────────
router.post("/read", authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        
        await Notification.updateMany(
            { userId, read: false },
            { $set: { read: true } }
        );

        res.json({ message: "Notifications marked as read" });
    } catch (err) {
        console.error("Mark notifications read error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
