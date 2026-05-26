const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const { User, MoodSession, Rating, Content } = require("../models");

const emotionsList = ["joy", "sadness", "anger", "fear", "surprise", "nostalgia", "curiosity", "calm"];

router.get("/", auth, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);
        
        // Define the 30-day window
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Get User
        const user = await User.findById(userId).select("name longestStreak");
        if (!user) return res.status(404).json({ error: "User not found" });

        // 2. Fetch sessions in the last 30 days
        const sessions = await MoodSession.find({
            userId,
            createdAt: { $gte: thirtyDaysAgo }
        }).sort({ createdAt: 1 });

        // Generate line chart data
        // We want an array of 30 days. If a day has no sessions, scores are 0 (or we can just include days with data).
        // It's usually better for Recharts to have a continuous date line, so we fill in the 30 days.
        const chartDataMap = {};
        
        // Pre-fill 30 days
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            chartDataMap[dateStr] = {
                date: dateStr,
                joy: 0, sadness: 0, anger: 0, fear: 0,
                surprise: 0, nostalgia: 0, curiosity: 0, calm: 0,
                count: 0
            };
        }

        const uniqueEmotions = new Set();
        let dominantEmotionCount = {};

        sessions.forEach(session => {
            const dateStr = session.createdAt.toISOString().split("T")[0];
            if (chartDataMap[dateStr] && session.emotionFingerprint) {
                const fp = session.emotionFingerprint;
                chartDataMap[dateStr].count += 1;
                
                emotionsList.forEach(emotion => {
                    chartDataMap[dateStr][emotion] += (fp[emotion] || 0);
                    if ((fp[emotion] || 0) > 0.2) {
                        uniqueEmotions.add(emotion);
                    }
                });

                // Calculate dominant emotion for the insight
                const dominant = Object.entries(fp).sort((a, b) => b[1] - a[1])[0][0];
                dominantEmotionCount[dominant] = (dominantEmotionCount[dominant] || 0) + 1;
            }
        });

        // Average out the days with multiple sessions
        const chartData = Object.values(chartDataMap).map(day => {
            if (day.count > 0) {
                emotionsList.forEach(emotion => {
                    day[emotion] = Number((day[emotion] / day.count).toFixed(2));
                });
            }
            delete day.count; // Clean up
            return day;
        });

        const overallDominantEmotion = Object.entries(dominantEmotionCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutrality";

        // 3. Get Top Rated Content in last 30 days
        const recentRatings = await Rating.find({
            userId,
            rating: 1,
            createdAt: { $gte: thirtyDaysAgo }
        }).populate("contentId");
        
        let topRatedTitle = "None yet";
        if (recentRatings.length > 0) {
            // Find the most frequently rated +1 content, or just the most recently discovered
            topRatedTitle = recentRatings[recentRatings.length - 1].contentId.title;
        }

        // 4. Generate Insight Paragraph
        const insight = `Over the past 30 days, you recorded ${sessions.length} sessions. 
Your emotional journey was primarily defined by ${overallDominantEmotion}, showing up most frequently in your logs. 
You experienced a rich spectrum of ${uniqueEmotions.size} unique emotional dimensions. 
${topRatedTitle !== "None yet" ? `Your standout content discovery was "${topRatedTitle}".` : "You haven't found any standout content this month."} 
Keep capturing to see how your patterns evolve!`;

        res.json({
            user: { name: user.name, longestStreak: user.longestStreak },
            stats: {
                totalSessions: sessions.length,
                uniqueEmotionsCount: uniqueEmotions.size,
                longestStreak: user.longestStreak,
                topContent: topRatedTitle
            },
            chartData,
            insight
        });

    } catch (err) {
        console.error("Report generation error:", err);
        res.status(500).json({ error: "Failed to generate report" });
    }
});

module.exports = router;
