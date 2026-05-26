import { useState, useEffect } from "react";
import EmotionRadar from "../components/EmotionRadar";
import { moodAPI, roomAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useDialog } from "../context/DialogContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

const TOP_EMOTION = (fp) => {
    if (!fp) return "calm";
    return Object.entries(fp).sort((a, b) => b[1] - a[1])[0]?.[0] || "calm";
};

const EMOTION_COLORS = {
    joy: "#FAEEDA", sadness: "#E6F1FB", anger: "#FCEBEB",
    fear: "#FBEAF0", surprise: "#EEEDFE", nostalgia: "#FAEEDA",
    curiosity: "#E1F5EE", calm: "#F1EFE8",
};

export default function History() {
    const { user } = useAuth();
    const { showAlert, showConfirm } = useDialog();
    const [sessions, setSessions] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null); // expanded session id
    const [expandedRoom, setExpandedRoom] = useState(null); // expanded room code

    const BADGES = [
        { id: "3-day-streak", label: "3 Day Streak", icon: "🔥" },
        { id: "7-day-streak", label: "7 Day Streak", icon: "🔥" },
        { id: "14-day-streak", label: "14 Day Streak", icon: "🔥" },
        { id: "30-day-streak", label: "30 Day Streak", icon: "🔥" },
        { id: "night-owl", label: "Night Owl", icon: "🦉" },
        { id: "complex", label: "Emotionally Complex", icon: "🧩" },
        { id: "contrast-seeker", label: "Contrast Seeker", icon: "🌗" }
    ];

    const hasBadge = (badgeId) => user?.badges?.includes(badgeId);

    const fetchAllData = () => {
        Promise.all([moodAPI.history(), moodAPI.insights(), roomAPI.history()])
            .then(([hRes, iRes, rRes]) => {
                setSessions(hRes.data.sessions);
                setInsights(iRes.data.insights);
                setRooms(rRes.data.rooms.filter(r => r.status === "complete")); // Only show completed group moods
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        
        showConfirm("Are you sure you want to delete this mood session?", "Delete Session", async () => {
            try {
                await moodAPI.remove(id);
                fetchAllData(); // Refetch everything to update charts and patterns in real-time
            } catch (err) {
                console.error("Failed to delete session", err);
                showAlert("Failed to delete session", "Error");
            }
        });
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    return (
        <div className="page" style={{ maxWidth: 700, margin: "0 auto" }}>
            <h2 style={{ marginBottom: "0.25rem" }}>Your mood history</h2>
            <p className="muted" style={{ marginBottom: "1.5rem" }}>Every session saved — your emotional pattern over time.</p>

            {/* Gamification Shelf */}
            <div className="card" style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Streak & Badges</h3>
                    <div style={{ 
                        background: user?.currentStreak > 0 ? "#FDEAE6" : "#f0f0f0", 
                        padding: "0.4rem 0.8rem", 
                        borderRadius: "20px",
                        display: "flex", alignItems: "center", gap: "0.5rem",
                        fontWeight: 600, color: user?.currentStreak > 0 ? "#D85A30" : "#888"
                    }}>
                        <span style={{ fontSize: "1.1rem" }}>🔥</span>
                        {user?.currentStreak || 0} Day Streak
                    </div>
                </div>
                
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                    {BADGES.map(badge => {
                        const earned = hasBadge(badge.id);
                        return (
                            <div key={badge.id} style={{ 
                                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                                opacity: earned ? 1 : 0.4,
                                filter: earned ? "none" : "grayscale(100%)",
                                transition: "all 0.3s ease"
                            }}>
                                <div style={{ 
                                    width: 50, height: 50, borderRadius: "50%",
                                    background: earned ? "#EEEDFE" : "#e0e0e0",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "1.8rem",
                                    boxShadow: earned ? "0 4px 10px rgba(83, 74, 183, 0.2)" : "none"
                                }}>
                                    {badge.icon}
                                </div>
                                <span style={{ fontSize: "0.75rem", fontWeight: 500, textAlign: "center", maxWidth: 70, lineHeight: 1.2 }}>
                                    {badge.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Insights */}
            {insights && insights.totalSessions > 0 && (
                <div className="card" style={{ background: "#EEEDFE", border: "none", marginBottom: "2rem" }}>
                    <h3 style={{ color: "#3C3489", marginBottom: "0.75rem" }}>✨ Your patterns</h3>
                    
                    {/* Basic insight cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: insights.totalSessions >= 3 ? "1.5rem" : 0 }}>
                        <div style={{ background: "#fff", borderRadius: 8, padding: "0.75rem" }}>
                            <div style={{ fontSize: "0.72rem", color: "#888", marginBottom: 3 }}>TOTAL SESSIONS</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#534AB7" }}>{insights.totalSessions}</div>
                        </div>
                        {insights.totalSessions >= 3 && (
                            <>
                                <div style={{ background: "#fff", borderRadius: 8, padding: "0.75rem" }}>
                                    <div style={{ fontSize: "0.72rem", color: "#888", marginBottom: 3 }}>DOMINANT MOOD</div>
                                    <div style={{ fontSize: "1rem", fontWeight: 600, color: "#534AB7", textTransform: "capitalize" }}>
                                        {insights.dominantEmotion}
                                    </div>
                                </div>
                                {insights.topCards?.length > 0 && (
                                    <div style={{ background: "#fff", borderRadius: 8, padding: "0.75rem" }}>
                                        <div style={{ fontSize: "0.72rem", color: "#888", marginBottom: 3 }}>TOP FEELINGS</div>
                                        <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "#534AB7", textTransform: "capitalize" }}>
                                            {insights.topCards.join(", ")}
                                        </div>
                                    </div>
                                )}
                                {insights.saddestDay && (
                                    <div style={{ background: "#fff", borderRadius: 8, padding: "0.75rem" }}>
                                        <div style={{ fontSize: "0.72rem", color: "#888", marginBottom: 3 }}>MOST EMOTIONAL DAY</div>
                                        <div style={{ fontSize: "0.9rem", fontWeight: 500, color: "#534AB7" }}>{insights.saddestDay}</div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Graphs (Only show if sufficient sessions exist) */}
                    {insights.totalSessions >= 3 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                            {/* Average Radar Graph */}
                            <div style={{ flex: "1 1 300px", background: "#fff", borderRadius: 8, padding: "1rem" }}>
                                <h4 style={{ color: "#534AB7", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Average Emotional State</h4>
                                <EmotionRadar fingerprint={insights.averageFingerprint} size={250} />
                            </div>
                            
                            {/* Trend Graph */}
                            {insights.trend && insights.trend.length > 1 && (
                                <div style={{ flex: "1 1 400px", background: "#fff", borderRadius: 8, padding: "1rem" }}>
                                    <h4 style={{ color: "#534AB7", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Mood Trend (Recent)</h4>
                                    <div style={{ width: "100%", height: 250 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={insights.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }} />
                                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                                {/* Only plot 2 contrasting moods as requested */}
                                                <Line type="monotone" dataKey="joy" stroke="#D85A30" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                                <Line type="monotone" dataKey="sadness" stroke="#5C85B5" strokeWidth={3} dot={{ r: 3 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Group Sessions (Room History) */}
            {rooms.length > 0 && (
                <div style={{ marginBottom: "2.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "#444" }}>Group Sessions</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {rooms.map((room) => {
                            const topEmotion = TOP_EMOTION(room.groupFingerprint);
                            const isOpen = expandedRoom === room.code;
                            const date = new Date(room.createdAt);

                            return (
                                <div key={room.code} className="card" style={{ padding: 0, overflow: "hidden", border: "1.5px solid #EEEDFE" }}>
                                    <button
                                        onClick={() => setExpandedRoom(isOpen ? null : room.code)}
                                        style={{
                                            width: "100%", background: "none", border: "none",
                                            padding: "1rem 1.25rem", cursor: "pointer",
                                            display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                                        }}
                                    >
                                        <div style={{ fontSize: "1.2rem" }}>👥</div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#3C3489" }}>
                                                Room {room.code}
                                            </div>
                                            <div style={{ fontSize: "0.78rem", color: "#888", marginTop: 2 }}>
                                                {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                                {" · "}
                                                {room.members.length} members ({room.members.map(m => m.name).join(", ")})
                                            </div>
                                        </div>

                                        <div style={{ textAlign: "right", marginRight: "1rem" }}>
                                            <div style={{ fontSize: "0.85rem", fontWeight: 500, textTransform: "capitalize", color: "#534AB7" }}>
                                                {topEmotion}
                                            </div>
                                        </div>

                                        <span style={{ color: "#aaa", fontSize: "0.85rem" }}>{isOpen ? "▲" : "▼"}</span>
                                    </button>

                                    {/* Expanded detail */}
                                    {isOpen && room.groupFingerprint && (
                                        <div style={{ padding: "1.25rem", borderTop: "1px solid #EEEDFE", background: "#fbfbfe" }}>
                                            <h4 style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem", textAlign: "center" }}>Group Emotion Fingerprint</h4>
                                            <EmotionRadar fingerprint={room.groupFingerprint} size={220} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Personal Timeline */}
            <div>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "#444" }}>Personal Timeline</h3>
                {sessions.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
                        No sessions yet. <a href="/mood" style={{ color: "#7F77DD" }}>Capture your first mood →</a>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {sessions.map((session) => {
                            const topEmotion = TOP_EMOTION(session.emotionFingerprint);
                            const isOpen = expanded === session._id;
                            const date = new Date(session.createdAt);

                            return (
                                <div key={session._id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                                    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                                        {/* Session header */}
                                        <button
                                            onClick={() => setExpanded(isOpen ? null : session._id)}
                                            style={{
                                                flex: 1, background: "none", border: "none",
                                                padding: "1rem 1.25rem", cursor: "pointer",
                                                display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                                            }}
                                        >
                                            {/* Color dot */}
                                            <div style={{
                                                width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                                                background: EMOTION_COLORS[topEmotion] || "#e8e8e8",
                                                border: "2px solid #ccc",
                                            }} />

                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 500, fontSize: "0.9rem", textTransform: "capitalize" }}>
                                                    {topEmotion}
                                                    {session.selectedCards?.length > 0 &&
                                                        <span style={{ color: "#888", fontWeight: 400 }}> · {session.selectedCards.slice(0, 3).join(", ")}</span>
                                                    }
                                                </div>
                                                <div style={{ fontSize: "0.78rem", color: "#aaa", marginTop: 1 }}>
                                                    {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                                    {" · "}
                                                    {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                            </div>

                                            <span style={{ color: "#aaa", fontSize: "0.85rem" }}>{isOpen ? "▲" : "▼"}</span>
                                        </button>
                                        
                                        {/* Delete Button */}
                                        <button 
                                            onClick={(e) => handleDelete(e, session._id)}
                                            style={{
                                                background: "none", border: "none", padding: "1rem 1.25rem", cursor: "pointer",
                                                color: "#E24B4A", fontSize: "1.1rem", opacity: 0.7, transition: "opacity 0.2s"
                                            }}
                                            onMouseOver={(e) => e.target.style.opacity = 1}
                                            onMouseOut={(e) => e.target.style.opacity = 0.7}
                                            title="Delete Session"
                                        >
                                            🗑
                                        </button>
                                    </div>

                                    {/* Expanded detail */}
                                    {isOpen && (
                                        <div style={{ padding: "0 1.25rem 1.25rem", borderTop: "1px solid #f0f0f0" }}>
                                            {session.freeText && (
                                                <p style={{ fontSize: "0.875rem", color: "#555", fontStyle: "italic", margin: "1rem 0 0.75rem", lineHeight: 1.6 }}>
                                                    "{session.freeText}"
                                                </p>
                                            )}
                                            <EmotionRadar fingerprint={session.emotionFingerprint} size={220} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}