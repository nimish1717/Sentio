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
        }, { timeout: 15000 });

        const matches = mlResponse.data.matches || [];

        // ─────────────────────────────────────────────
        // 5. FEEDBACK LOOP RE-RANKING
        // Use the user's past ratings to boost/penalize
        // content with similar emotional fingerprints.
        // ─────────────────────────────────────────────
        const EMOTIONS = ["joy", "sadness", "anger", "fear", "surprise", "nostalgia", "curiosity", "calm"];

        const pastRatings = await Rating.find({ userId: req.userId }).populate("contentId");

        // Build average fingerprint for liked and disliked content
        const likedFp    = Object.fromEntries(EMOTIONS.map(e => [e, 0]));
        const dislikedFp = Object.fromEntries(EMOTIONS.map(e => [e, 0]));
        let likedCount = 0, dislikedCount = 0;

        for (const r of pastRatings) {
            if (!r.contentId?.emotionFingerprint) continue;
            const efp = r.contentId.emotionFingerprint;
            if (r.rating === 1) {
                EMOTIONS.forEach(e => { likedFp[e] += efp[e] || 0; });
                likedCount++;
            } else if (r.rating === -1) {
                EMOTIONS.forEach(e => { dislikedFp[e] += efp[e] || 0; });
                dislikedCount++;
            }
        }

        if (likedCount > 0)    EMOTIONS.forEach(e => { likedFp[e]    /= likedCount; });
        if (dislikedCount > 0) EMOTIONS.forEach(e => { dislikedFp[e] /= dislikedCount; });

        // Cosine similarity helper
        const cosineSim = (a, b) => {
            const dot   = EMOTIONS.reduce((s, e) => s + (a[e] || 0) * (b[e] || 0), 0);
            const normA = Math.sqrt(EMOTIONS.reduce((s, e) => s + (a[e] || 0) ** 2, 0));
            const normB = Math.sqrt(EMOTIONS.reduce((s, e) => s + (b[e] || 0) ** 2, 0));
            if (normA === 0 || normB === 0) return 0;
            return dot / (normA * normB);
        };

        // Re-rank: apply preference multiplier clamped to [0.5, 1.5]
        const hasPreferenceData = likedCount > 0 || dislikedCount > 0;
        const reranked = matches.map(match => {
            const content = contents.find(c => c._id.toString() === match.id);
            const efp = content?.emotionFingerprint;
            let finalScore = match.score;

            if (hasPreferenceData && efp) {
                const simToLiked    = likedCount    > 0 ? cosineSim(efp, likedFp)    : 0;
                const simToDisliked = dislikedCount > 0 ? cosineSim(efp, dislikedFp) : 0;
                const boost = 1 + (0.3 * simToLiked) - (0.2 * simToDisliked);
                finalScore = match.score * Math.min(1.5, Math.max(0.5, boost));
            }

            return { ...match, baseScore: match.score, finalScore };
        });

        // Sort by finalScore descending
        reranked.sort((a, b) => b.finalScore - a.finalScore);

        // 6. Build full recommendation objects
        const recommendations = reranked.map(match => {
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
                matchScore: parseFloat(match.finalScore.toFixed(4)),
                // Include feedback context so frontend can show "personalised" badge
                personalisedByFeedback: hasPreferenceData,
            };
        });

        // 7. Optionally update session history (only for lean mode and no type filter)
        if (session && mode === "lean" && (!type || type === "all")) {
            session.recommendationIds = recommendations.map(r => r.id);
            await session.save();
        }

        res.json({
            fingerprint: currentFp,
            recommendations,
            personalisedByFeedback: hasPreferenceData,
        });

    } catch (err) {
        console.error("Recommend error:", err.message);
        if (err.code === "ECONNREFUSED") {
            return res.status(503).json({ error: "ML service unavailable. Is Flask running?" });
        }
        if (err.code === "ETIMEDOUT" || err.code === "ECONNABORTED") {
            return res.status(503).json({ error: "ML service timed out — try again in a moment." });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;