import { useState, useEffect } from "react";
import { profileAPI } from "../utils/api";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import "./Profile.css";

// Generate last 12 weeks of dates for heatmap
const generateHeatmapDates = () => {
    const dates = [];
    const today = new Date();
    // 12 weeks * 7 days = 84 days
    for (let i = 83; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
};

export default function Profile() {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await profileAPI.get();
                setProfileData(res.data);
            } catch (err) {
                console.error("Error fetching profile:", err);
                setError("Failed to load profile data.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) return <div className="loading-screen">Loading profile...</div>;
    if (error) return <div className="page"><div className="msg-error">{error}</div></div>;
    if (!profileData) return <div className="page">No profile data available.</div>;

    const { user, stats, emotionalDNA, tasteProfile, heatmap, personalityType } = profileData;

    // Format radar chart data
    const radarData = Object.entries(emotionalDNA.averageFingerprint).map(([emotion, value]) => ({
        emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
        value: value * 100 // Scale to 100 for better visualization
    }));

    // Heatmap dates
    const heatmapDates = generateHeatmapDates();

    // Badges definitions (mocking some possible ones since user.badges might be strings)
    const allBadges = [
        { id: "7-day-streak", icon: "🏆", name: "7-day streak", condition: "Capture mood 7 days in a row" },
        { id: "night-owl", icon: "🌙", name: "Night Owl", condition: "Capture a mood after midnight" },
        { id: "first-watch", icon: "🎬", name: "First Watch", condition: "Watch a recommended content" },
        { id: "emotional-depth", icon: "🌊", name: "Emotional Depth", condition: "Log 5 different emotions" },
    ];

    const getInitials = (name) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
    };

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    };

    return (
        <div className="page profile-page">
            
            {/* Section 1 — Identity Card */}
            <div className="profile-identity">
                <div className="avatar">{getInitials(user.name)}</div>
                <div className="identity-info">
                    <h1>{user.name}</h1>
                    <div className="personality-type">"{personalityType}"</div>
                    <div className="member-since">Member since {formatDate(user.createdAt)}</div>
                </div>
            </div>

            {/* Section 2 — Stats row */}
            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-value">{stats.totalSessions}</div>
                    <div className="stat-label">Sessions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">🔥 {user.currentStreak}</div>
                    <div className="stat-label">Streak</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{user.longestStreak}</div>
                    <div className="stat-label">Best</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.watchlistCount}</div>
                    <div className="stat-label">Saved</div>
                </div>
            </div>

            <div className="profile-grid">
                {/* Section 3 — Emotional identity */}
                <div className="card emotion-card">
                    <h3>Emotional DNA</h3>
                    <p className="muted">Average fingerprint across all your sessions</p>
                    
                    <div className="radar-container">
                        <ResponsiveContainer width="100%" height={250}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="#e8e8e8" />
                                <PolarAngleAxis dataKey="emotion" tick={{ fill: "#666", fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Emotion" dataKey="value" stroke="#7F77DD" fill="#7F77DD" fillOpacity={0.6} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="top-emotions">
                        <span className="muted">Top emotions:</span>
                        <div className="emotion-pills">
                            {emotionalDNA.topEmotions.map(e => (
                                <span key={e} className="pill pill-primary">{e}</span>
                            ))}
                        </div>
                    </div>
                    {emotionalDNA.mostUsedCards.length > 0 && (
                        <div className="used-cards">
                            <span className="muted">You frequently feel:</span>
                            <div className="emotion-pills">
                                {emotionalDNA.mostUsedCards.map(c => (
                                    <span key={c} className="pill pill-secondary">{c}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 4 — Badges shelf */}
                <div className="card badges-card">
                    <h3>Badges</h3>
                    <div className="badges-shelf">
                        {allBadges.map(badge => {
                            const earned = user.badges.includes(badge.id) || user.badges.includes(badge.name);
                            return (
                                <div key={badge.id} className={`badge-item ${earned ? 'earned' : 'locked'}`} title={earned ? badge.name : badge.condition}>
                                    <div className="badge-icon">{earned ? badge.icon : "🔒"}</div>
                                    <div className="badge-name">{badge.name}</div>
                                    {!earned && <div className="badge-condition">{badge.condition}</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section 5 — Taste profile */}
                <div className="card taste-card">
                    <h3>Taste Profile</h3>
                    <div className="taste-preferences">
                        <span className="muted">You prefer:</span>
                        <div className="emotion-pills">
                            {tasteProfile.preferredEmotions.length > 0 ? (
                                tasteProfile.preferredEmotions.map(e => (
                                    <span key={e} className="pill pill-teal">{e} content</span>
                                ))
                            ) : (
                                <span className="muted">Not enough data yet.</span>
                            )}
                        </div>
                    </div>
                    
                    {tasteProfile.topRatedContent.length > 0 && (
                        <div className="top-content">
                            <span className="muted">Top Rated:</span>
                            <div className="content-list">
                                {tasteProfile.topRatedContent.map(content => (
                                    <div key={content.id} className="content-mini-card">
                                        <div className="content-title">{content.title}</div>
                                        <div className="content-type">{content.type}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 6 — Activity heatmap */}
            <div className="card heatmap-card">
                <h3>Activity Heatmap</h3>
                <p className="muted">Your sessions over the last 12 weeks</p>
                <div className="heatmap-container">
                    <div className="heatmap-grid">
                        {heatmapDates.map(date => {
                            const count = heatmap[date] || 0;
                            // Determine intensity class (0-4)
                            let intensity = 0;
                            if (count === 1) intensity = 1;
                            else if (count === 2) intensity = 2;
                            else if (count === 3) intensity = 3;
                            else if (count > 3) intensity = 4;

                            return (
                                <div 
                                    key={date} 
                                    className={`heatmap-cell intensity-${intensity}`} 
                                    title={`${count} sessions on ${date}`}
                                ></div>
                            );
                        })}
                    </div>
                    <div className="heatmap-legend">
                        <span className="muted text-sm">Less</span>
                        <div className="heatmap-cell intensity-0"></div>
                        <div className="heatmap-cell intensity-1"></div>
                        <div className="heatmap-cell intensity-2"></div>
                        <div className="heatmap-cell intensity-3"></div>
                        <div className="heatmap-cell intensity-4"></div>
                        <span className="muted text-sm">More</span>
                    </div>
                </div>
            </div>

            {/* Section 7 — Quick actions */}
            <div className="quick-actions">
                <button className="btn btn-primary" onClick={() => window.location.href = '/mood'}>Capture today's mood</button>
                <button className="btn btn-outline" onClick={() => window.location.href = '/watchlist'}>View my watchlist</button>
                <button className="btn btn-ghost" onClick={() => window.location.href = '/report'}>Download monthly report</button>
                <button className="btn btn-ghost" onClick={() => alert('Sharing your fingerprint is coming soon!')}>Share my fingerprint</button>
                <button className="btn btn-ghost" onClick={() => alert('Edit profile is coming soon!')}>Edit profile</button>
                <button className="btn btn-ghost" style={{color: 'var(--coral)'}} onClick={() => alert('Preferences reset is coming soon!')}>Reset taste preferences</button>
            </div>
            
        </div>
    );
}
