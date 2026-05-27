// ============================================================
// Sentio — Weekly Insights Cron Job
// Runs every Sunday at 9 AM (scheduled in index.js)
// Analyses the last 7 sessions per user and creates a
// "weekly-insight" notification if a meaningful trend exists.
// ============================================================

const { User, MoodSession, Notification } = require("../models");

const EMOTIONS = ["joy", "sadness", "anger", "fear", "surprise", "nostalgia", "curiosity", "calm"];

const EMOTION_MESSAGES = {
    joy:       "You've been radiating joy this week ✨ Keep riding that wave.",
    sadness:   "You've been carrying sadness this week 💙 Be gentle with yourself.",
    anger:     "A lot of fire this week 🔥 Channel it into something creative.",
    fear:      "Anxiety has been present for you this week 🌿 Try something calm and grounding.",
    surprise:  "Life's been throwing surprises at you this week ⚡ Embrace the unpredictable.",
    nostalgia: "You've been drifting to the past this week 📼 Something nostalgic might feel perfect.",
    curiosity: "Your curiosity has been off the charts this week 🔭 Dive into something that challenges you.",
    calm:      "You've had a calm, steady week 🌙 Lean into that peace.",
};

function getDominantEmotion(fingerprint) {
    if (!fingerprint) return null;
    return EMOTIONS.reduce((top, e) =>
        (fingerprint[e] || 0) > (fingerprint[top] || 0) ? e : top,
        EMOTIONS[0]
    );
}

async function runWeeklyInsights() {
    try {
        const oneWeekAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

        // Find users who had at least one session in the last 14 days
        const activeUserIds = await MoodSession.distinct("userId", {
            createdAt: { $gte: twoWeeksAgo }
        });

        console.log(`📊 Weekly insights: processing ${activeUserIds.length} active users`);

        for (const userId of activeUserIds) {
            // Get last 7 sessions
            const recentSessions = await MoodSession.find({ userId })
                .sort({ createdAt: -1 })
                .limit(7);

            // Check if a weekly-insight notification was already sent this week
            const alreadySent = await Notification.findOne({
                userId,
                type: "weekly-insight",
                createdAt: { $gte: oneWeekAgo }
            });

            if (alreadySent) continue;

            if (recentSessions.length === 0) {
                // User has older sessions but nothing recent — nudge them
                await Notification.create({
                    userId,
                    type: "weekly-insight",
                    message: "It's been a while since you checked in. How are you feeling this week? 💭",
                    metadata: "no-recent-session"
                });
                continue;
            }

            // Count dominant emotion per session
            const emotionCounts = {};
            for (const session of recentSessions) {
                const dominant = getDominantEmotion(session.emotionFingerprint);
                if (dominant) emotionCounts[dominant] = (emotionCounts[dominant] || 0) + 1;
            }

            // Find most common dominant emotion
            const [topEmotion, count] = Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])[0] || [null, 0];

            // Only fire if ≥ 4 of the last 7 sessions share the same dominant emotion
            if (topEmotion && count >= Math.min(4, Math.ceil(recentSessions.length * 0.55))) {
                const message = `${EMOTION_MESSAGES[topEmotion]} (${count}/${recentSessions.length} sessions this week)`;
                await Notification.create({
                    userId,
                    type: "weekly-insight",
                    message,
                    metadata: `${topEmotion}-${new Date().toISOString().split("T")[0]}`
                });
            }
        }

        console.log(`📊 Weekly insights: done`);
    } catch (err) {
        console.error("❌ Weekly insights cron error:", err.message);
    }
}

module.exports = { runWeeklyInsights };
