const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const { User, MoodSession, Watchlist, Rating, Content } = require("../models");

// Map dominant emotion to personality type
const personalityTypes = {
    joy:       "The Energetic",
    sadness:   "The Deep Feeler",
    anger:     "The Passionate",
    fear:      "The Overthinker",
    surprise:  "The Adventurer",
    nostalgia: "The Nostalgic",
    curiosity: "The Curious Mind",
    calm:      "The Still One",
};

const defaultFingerprint = {
    joy: 0, sadness: 0, anger: 0, fear: 0,
    surprise: 0, nostalgia: 0, curiosity: 0, calm: 0
};

router.get("/", auth, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);

        // 1. Get User
        const user = await User.findById(userId).select("name email createdAt currentStreak longestStreak badges totalSessions");
        if (!user) return res.status(404).json({ error: "User not found" });

        // 2. Stats
        const totalSessions = await MoodSession.countDocuments({ userId });
        const watchlistCount = await Watchlist.countDocuments({ userId });

        // 3. Emotional DNA & Heatmap
        const sessions = await MoodSession.find({ userId });
        
        let averageFingerprint = { ...defaultFingerprint };
        const cardCounts = {};
        const heatmap = {};

        if (sessions.length > 0) {
            sessions.forEach(session => {
                // Aggregate fingerprint
                if (session.emotionFingerprint) {
                    for (const key of Object.keys(defaultFingerprint)) {
                        averageFingerprint[key] += session.emotionFingerprint[key] || 0;
                    }
                }

                // Aggregate cards
                if (session.selectedCards) {
                    session.selectedCards.forEach(card => {
                        cardCounts[card] = (cardCounts[card] || 0) + 1;
                    });
                }

                // Aggregate heatmap
                const dateStr = session.createdAt.toISOString().split("T")[0];
                heatmap[dateStr] = (heatmap[dateStr] || 0) + 1;
            });

            // Average the fingerprint
            for (const key of Object.keys(averageFingerprint)) {
                averageFingerprint[key] = Number((averageFingerprint[key] / sessions.length).toFixed(2));
            }
        }

        const topEmotions = Object.entries(averageFingerprint)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(e => e[0]);

        const mostUsedCards = Object.entries(cardCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(e => e[0]);

        // 4. Taste Profile
        // Get liked content
        const likedRatings = await Rating.find({ userId, rating: 1 }).populate("contentId");
        const likedContent = likedRatings.map(r => r.contentId).filter(Boolean);

        let tastePreferredEmotions = [];
        let topRatedContent = [];

        if (likedContent.length > 0) {
            let tasteFingerprint = { ...defaultFingerprint };
            let count = 0;

            likedContent.forEach(content => {
                if (content.emotionFingerprint) {
                    for (const key of Object.keys(defaultFingerprint)) {
                        tasteFingerprint[key] += content.emotionFingerprint[key] || 0;
                    }
                    count++;
                }
            });

            if (count > 0) {
                tastePreferredEmotions = Object.entries(tasteFingerprint)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 2)
                    .map(e => e[0]);
            }

            topRatedContent = likedContent.slice(0, 3).map(c => ({
                id: c._id,
                title: c.title,
                type: c.type,
                imageUrl: c.imageUrl
            }));
        }

        // 5. Personality Type
        let personalityType = "The Observer"; // Default if no sessions
        if (sessions.length > 0) {
            const dominantEmotion = Object.entries(averageFingerprint)
                .sort((a, b) => b[1] - a[1])[0][0];
            personalityType = personalityTypes[dominantEmotion] || "The Observer";
        }

        // Return everything
        res.json({
            user: {
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                badges: user.badges || [],
                currentStreak: user.currentStreak || 0,
                longestStreak: user.longestStreak || 0,
            },
            stats: {
                totalSessions,
                watchlistCount
            },
            emotionalDNA: {
                averageFingerprint,
                topEmotions,
                mostUsedCards
            },
            tasteProfile: {
                preferredEmotions: tastePreferredEmotions,
                topRatedContent
            },
            heatmap,
            personalityType
        });

    } catch (err) {
        console.error("Profile fetch error:", err);
        res.status(500).json({ error: "Failed to fetch profile data" });
    }
});

// ─── Update profile name ─────────────────────
router.put("/", auth, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: "Name required" });
        const user = await User.findByIdAndUpdate(
            req.userId,
            { name: name.trim() },
            { new: true, select: "-passwordHash" }
        );
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: "Failed to update profile" });
    }
});

module.exports = router;
