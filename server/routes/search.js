const router = require("express").Router();
const axios = require("axios");
const { Content } = require("../models");
const auth = require("../middleware/auth");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// GET /api/search?q=...
router.get("/", auth, async (req, res) => {
    try {
        const query = req.query.q;
        const type = req.query.type;
        if (!query || query.trim() === "") {
            return res.status(400).json({ error: "Query parameter 'q' is required" });
        }

        // 1. Convert text to emotion fingerprint via Flask
        const mlResponse = await axios.post(`${ML_URL}/fingerprint`, {
            text: query,
            cards: [],
            context: { company: "alone", time: "any", mode: "lean" } // Default context for searching
        }, { timeout: 15000 });

        const fingerprint = mlResponse.data.fingerprint;

        if (!fingerprint) {
            return res.status(500).json({ error: "Failed to generate fingerprint for search query" });
        }

        // 2. Fetch all content from the database
        const totalContent = await Content.countDocuments();
        if (totalContent === 0) {
            return res.json({ fingerprint, results: [] });
        }

        const dbQuery = {};
        if (type && type !== "All") {
            dbQuery.type = type.toLowerCase();
        }

        const contents = await Content.find(dbQuery);
        
        if (contents.length === 0) {
            return res.json({ query, fingerprint, results: [] });
        }

        const contentItems = contents.map(c => ({
            id: c._id.toString(),
            title: c.title,
            type: c.type,
            fingerprint: c.emotionFingerprint
        }));

        // 3. Find top 10 matches via cosine similarity in Flask
        const matchResponse = await axios.post(`${ML_URL}/match`, {
            fingerprint,
            content: contentItems,
            top_n: 10
        }, { timeout: 15000 });

        const matches = matchResponse.data.matches || [];

        // Check which items are already saved
        const { Watchlist } = require("../models");
        const watchlistItems = await Watchlist.find({
            userId: req.userId,
            contentId: { $in: matches.map(m => m.id) }
        });
        const savedIds = new Set(watchlistItems.map(w => w.contentId.toString()));

        // 4. Build full response objects
        const results = matches.map(match => {
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
                isSaved: savedIds.has(match.id)
            };
        });

        res.json({
            query,
            fingerprint,
            results
        });

    } catch (err) {
        console.error("Search error:", err.message);
        if (err.code === "ECONNREFUSED") {
            return res.status(503).json({ error: "ML service unavailable. Is Flask running?" });
        }
        if (err.code === "ETIMEDOUT" || err.code === "ECONNABORTED") {
            return res.status(503).json({ error: "ML service timed out — it may be waking up. Please try again in a moment." });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
