const router = require("express").Router();
const axios = require("axios");
const { Content } = require("../models");
const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

router.get("/", async (req, res) => {
    try {
        const { type, language, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (type) filter.type = type;
        if (language) filter.language = language;
        const items = await Content.find(filter)
            .skip((page - 1) * limit).limit(parseInt(limit))
            .select("-emotionFingerprint");
        const total = await Content.countDocuments(filter);
        res.json({ items, total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/seed", async (req, res) => {
    try {
        const { title, type, description, language, durationMins,
            source, externalId, imageUrl, feelDescription } = req.body;
        if (!title || !type || !description)
            return res.status(400).json({ error: "title, type, description required" });

        const mlRes = await axios.post(`${ML_URL}/classify`, { text: description });
        const emotionFingerprint = mlRes.data.scores;

        const content = await Content.create({
            title, type, description, language: language || "en",
            durationMins: durationMins || 0, source, externalId,
            imageUrl, feelDescription: feelDescription || "", emotionFingerprint,
        });
        res.status(201).json({ content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;