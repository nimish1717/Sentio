const router = require("express").Router();
const { ShareToken } = require("../models");

// ─── Get Shared Mood Session (PUBLIC) ──────────────────────────
router.get("/:token", async (req, res) => {
    try {
        const { token } = req.params;

        const shareToken = await ShareToken.findOne({ token })
            .populate({
                path: "sessionId",
                populate: {
                    path: "userId",
                    select: "name" // Only fetch the name, no email, no password
                }
            });

        if (!shareToken || !shareToken.sessionId) {
            return res.status(404).json({ error: "Share link not found or has expired." });
        }

        const session = shareToken.sessionId;
        
        // Extract top emotion
        const fingerprint = session.emotionFingerprint;
        let topEmotion = "unknown";
        let maxVal = -1;
        if (fingerprint) {
            for (const em of ["joy", "sadness", "anger", "fear", "surprise", "nostalgia", "curiosity", "calm"]) {
                if (fingerprint[em] > maxVal) {
                    maxVal = fingerprint[em];
                    topEmotion = em;
                }
            }
        }

        // Just return the necessary public data
        res.json({
            userName: session.userId.name.split(" ")[0], // Only first name
            date: session.createdAt,
            topEmotion,
            fingerprint,
            selectedCards: session.selectedCards || [],
        });
    } catch (err) {
        console.error("Get share error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
