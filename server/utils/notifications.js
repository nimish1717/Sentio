const { User, MoodSession, Watchlist, Rating, Notification } = require("../models");

// Helper to get local YYYY-MM-DD
function getDateString(date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}

function getTopEmotion(fingerprint) {
    if (!fingerprint) return null;
    let top = null;
    let max = -1;
    for (const em of ["joy", "sadness", "anger", "fear", "surprise", "nostalgia", "curiosity", "calm"]) {
        if (fingerprint[em] > max) {
            max = fingerprint[em];
            top = em;
        }
    }
    return top;
}

async function checkDailyNotifications(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        const todayDate = new Date();
        const todayStr = getDateString(todayDate);

        // 1. STREAK RISK
        // If streak > 0, time is past 8 PM, and no session today
        if (user.currentStreak > 0 && todayDate.getHours() >= 20) {
            const hasSessionToday = await MoodSession.findOne({
                userId,
                createdAt: { $gte: new Date(todayDate.setHours(0, 0, 0, 0)) }
            });

            if (!hasSessionToday) {
                const existing = await Notification.findOne({
                    userId,
                    type: "streak-risk",
                    metadata: todayStr
                });

                if (!existing) {
                    await Notification.create({
                        userId,
                        type: "streak-risk",
                        message: `Your ${user.currentStreak}-day streak ends at midnight! Capture your mood to keep it burning.`,
                        metadata: todayStr
                    });
                }
            }
        }

        // 2. SAVED BUT UNWATCHED (7 days ago)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Find items saved more than 7 days ago
        const oldWatchlistItems = await Watchlist.find({
            userId,
            createdAt: { $lte: sevenDaysAgo }
        }).populate("contentId");

        for (const item of oldWatchlistItems) {
            if (!item.contentId) continue;
            
            // Did they rate it? (which implies they watched/read it)
            const rating = await Rating.findOne({ userId, contentId: item.contentId._id });
            
            if (!rating) {
                const existing = await Notification.findOne({
                    userId,
                    type: "saved-unwatched",
                    metadata: item.contentId._id.toString()
                });

                if (!existing) {
                    const diffDays = Math.floor((new Date() - item.createdAt) / (1000 * 60 * 60 * 24));
                    const timeAgo = diffDays >= 14 ? "2 weeks" : `${diffDays} days`;
                    
                    await Notification.create({
                        userId,
                        type: "saved-unwatched",
                        message: `You saved ${item.contentId.title} ${timeAgo} ago — have you checked it out yet?`,
                        metadata: item.contentId._id.toString()
                    });
                    
                    // Break after creating one so we don't spam them with 10 unwatched reminders at once
                    break; 
                }
            }
        }

        // 3. WEEKLY PATTERN
        // "Last 3 Fridays you felt nostalgic"
        const currentDayOfWeek = todayDate.getDay(); // 0 = Sunday, 5 = Friday
        const dayNames = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
        
        // Let's only do this check on Fridays or weekends to be thematic, or any day is fine.
        // Get all past sessions
        const allSessions = await MoodSession.find({ userId }).sort({ createdAt: -1 });
        
        // Filter sessions that happened on the same day of the week, but NOT today
        const pastSameDaySessions = allSessions.filter(s => {
            const sDate = new Date(s.createdAt);
            return sDate.getDay() === currentDayOfWeek && getDateString(sDate) !== todayStr;
        });

        // Group by date (so multiple sessions on one Friday count as one Friday)
        const sessionsByDate = {};
        for (const s of pastSameDaySessions) {
            const dStr = getDateString(s.createdAt);
            if (!sessionsByDate[dStr]) sessionsByDate[dStr] = s;
        }
        
        const recentDates = Object.keys(sessionsByDate).slice(0, 3);
        if (recentDates.length >= 2) { // 2 or 3 is fine to form a pattern
            const emotions = recentDates.map(d => getTopEmotion(sessionsByDate[d].emotionFingerprint));
            const allSame = emotions.every(e => e === emotions[0]) && emotions[0] !== null;

            if (allSame) {
                const patternType = `weekly-${currentDayOfWeek}-${emotions[0]}`;
                // Only send this specific pattern once every 7 days
                const recentPattern = await Notification.findOne({
                    userId,
                    type: "weekly-pattern",
                    metadata: patternType,
                    createdAt: { $gte: sevenDaysAgo }
                });

                if (!recentPattern) {
                    const times = recentDates.length;
                    await Notification.create({
                        userId,
                        type: "weekly-pattern",
                        message: `The last ${times} ${dayNames[currentDayOfWeek]} you felt ${emotions[0]} — what's tonight like?`,
                        metadata: patternType
                    });
                }
            }
        }

    } catch (err) {
        console.error("Error in checkDailyNotifications:", err);
    }
}

module.exports = {
    checkDailyNotifications
};
