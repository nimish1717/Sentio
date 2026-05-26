// ============================================================
// Sentio — Recommend Routes
// GET /api/recommend   → get recommendations for a session
// ============================================================

const router = require("express").Router();
const axios = require("axios");
const auth = require("../middleware/auth");
const { MoodSession, Content, Room } = require("../models");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

router.get("/", auth, async (req, res) => {
    try {
        const { sessionId, roomId, mode = "lean", type } = req.query;

        if (!sessionId && !roomId) {
            return res.status(400).json({ error: "sessionId or roomId is required" });
        }

        let fp;
        let session;

        if (roomId) {
            const room = await Room.findOne({ code: roomId.toUpperCase() });
            if (!room || !room.groupFingerprint) {
                return res.status(404).json({ error: "Room not found or not complete" });
            }
            fp = room.groupFingerprint;
        } else {
            session = await MoodSession.findOne({ _id: sessionId, userId: req.userId });
            if (!session) {
                return res.status(404).json({ error: "Session not found" });
            }
            fp = session.emotionFingerprint;
        }

        if (!fp) {
            return res.status(400).json({ error: "No fingerprint available" });
        }

        // 2. Adjust fingerprint based on mode
        let currentFp = {
            joy: fp.joy || 0,
            sadness: fp.sadness || 0,
            anger: fp.anger || 0,
            fear: fp.fear || 0,
            surprise: fp.surprise || 0,
            nostalgia: fp.nostalgia || 0,
            curiosity: fp.curiosity || 0,
            calm: fp.calm || 0
        };

        if (mode === "contrast") {
            Object.keys(currentFp).forEach(key => {
                currentFp[key] = parseFloat((1.0 - currentFp[key]).toFixed(4));
            });
        }

        // 3. Fetch content candidates
        const totalContent = await Content.countDocuments();
        if (totalContent === 0) {
            return res.status(404).json({ error: "No content available in database" });
        }

        const query = {};
        if (type && type !== "all") {
            query.type = type;
        }
        const contents = await Content.find(query);

        if (!contents.length) {
            return res.json({ fingerprint: currentFp, recommendations: [] });
        }

        const contentItems = contents.map(c => ({
            id: c._id.toString(),
            title: c.title,
            type: c.type,
            fingerprint: c.emotionFingerprint
        }));

        // 4. Call ML API for matching
        const mlResponse = await axios.post(`${ML_URL}/match`, {
            fingerprint: currentFp,
            content: contentItems,
            top_n: 15
        });

        const matches = mlResponse.data.matches || [];

        // 5. Build full recommendation objects
        const recommendations = matches.map(match => {
            const content = contents.find(c => c._id.toString() === match.id);
            return {
                id: content._id,
                title: content.title,
                type: content.type,
                description: content.description,
                feelDescription: content.feelDescription,
                imageUrl: content.imageUrl,
                language: content.language,
                durationMins: content.durationMins,
                matchScore: match.score,
            };
        });

        // 6. Optionally update session history (only for lean mode and no type filter)
        if (session && mode === "lean" && (!type || type === "all")) {
            session.recommendationIds = recommendations.map(r => r.id);
            await session.save();
        }

        res.json({
            fingerprint: currentFp,
            recommendations
        });

    } catch (err) {
        console.error("Recommend error:", err.message);
        if (err.code === "ECONNREFUSED") {
            return res.status(503).json({ error: "ML service unavailable. Is Flask running?" });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;