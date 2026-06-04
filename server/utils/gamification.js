const { MoodSession, User, Notification } = require("../models");

// Returns YYYY-MM-DD (local time of the server execution environment)
function getDateString(date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}

async function updateGamification(userId, newSession) {
    // 1. Fetch all user sessions to calculate streak
    const sessions = await MoodSession.find({ userId }).sort({ createdAt: -1 });
    
    if (sessions.length === 0) return { newlyEarned: [], currentStreak: 0 };

    // Group by unique days (YYYY-MM-DD)
    const uniqueDays = [...new Set(sessions.map(s => getDateString(s.createdAt)))];
    
    let currentStreak = 0;
    const todayStr = getDateString(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getDateString(yesterdayDate);

    // Check if the streak is active (latest session is today or yesterday)
    if (uniqueDays[0] !== todayStr && uniqueDays[0] !== yesterdayStr) {
        // Streak is broken — latest day is older than yesterday
        currentStreak = 0;
    } else {
        // Walk backwards counting consecutive days
        let expectedDate = new Date(uniqueDays[0]);
        for (const dayStr of uniqueDays) {
            if (dayStr === getDateString(expectedDate)) {
                currentStreak++;
                expectedDate.setDate(expectedDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    const user = await User.findById(userId);
    const longestStreak = Math.max(user.longestStreak || 0, currentStreak);

    // 2. Check Badges
    const existingBadges = user.badges || [];
    const newlyEarned = [];

    const award = async (badge) => {
        if (!existingBadges.includes(badge) && !newlyEarned.includes(badge)) {
            newlyEarned.push(badge);
            await Notification.create({
                userId,
                type: "milestone",
                message: `You earned the ${badge.replace(/-/g, ' ')} badge!`,
                metadata: badge
            });
        }
    };

    // Streak Milestones
    if (currentStreak >= 3) await award("3-day-streak");
    if (currentStreak >= 7) await award("7-day-streak");
    if (currentStreak >= 14) await award("14-day-streak");
    if (currentStreak >= 30) await award("30-day-streak");

    // Night Owl: 10+ sessions after 10 PM
    const nightOwlCount = sessions.filter(s => {
        const h = new Date(s.createdAt).getHours();
        return h >= 22 || h < 4; // 10 PM to 4 AM
    }).length;
    
    if (nightOwlCount >= 10) await award("night-owl");

    // Emotionally Complex: 5+ cards in this session
    if (newSession.selectedCards && newSession.selectedCards.length >= 5) {
        await award("complex");
    }

    // Contrast Seeker: 3+ contrast mode sessions
    const contrastCount = sessions.filter(s => s.contextAnswers?.mode === "contrast").length;
    if (contrastCount >= 3) await award("contrast-seeker");

    const updatedBadges = [...existingBadges, ...newlyEarned];

    // 3. Save updates
    await User.findByIdAndUpdate(userId, {
        currentStreak,
        longestStreak,
        badges: updatedBadges,
        lastSessionDate: new Date(),
    });

    return {
        newlyEarned,
        currentStreak,
        longestStreak,
        badges: updatedBadges
    };
}

module.exports = { updateGamification };
