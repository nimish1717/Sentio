const router = require("express").Router();
const auth = require("../middleware/auth");
const { Rating } = require("../models");

router.post("/", auth, async (req, res) => {
    try {
        const { contentId, sessionId, rating } = req.body;
        if (!contentId || !rating)
            return res.status(400).json({ error: "contentId and rating required" });
        if (![1, -1].includes(rating))
            return res.status(400).json({ error: "rating must be 1 or -1" });

        const result = await Rating.findOneAndUpdate(
            { userId: req.userId, contentId },
            { userId: req.userId, contentId, sessionId, rating },
            { upsert: true, new: true }
        );
        res.json({ rating: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset all ratings (taste preference reset)
router.delete("/", auth, async (req, res) => {
    try {
        const result = await Rating.deleteMany({ userId: req.userId });
        res.json({ deleted: result.deletedCount, message: "Taste preferences reset successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;