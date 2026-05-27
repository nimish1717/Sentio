import { useState, useEffect } from "react";
import { adminAPI } from "../utils/api";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, Radar,
    PieChart, Pie, Cell, Legend
} from "recharts";

const EMOTION_COLORS = {
    joy: "#F9C74F", sadness: "#577590", anger: "#F94144",
    fear: "#9B5DE5", surprise: "#F8961E", nostalgia: "#90BE6D",
    curiosity: "#43AA8B", calm: "#4D908E"
};

const TYPE_COLORS = ["#7F77DD", "#43AA8B", "#F9C74F", "#F94144", "#F8961E"];

const StatCard = ({ label, value, emoji }) => (
    <div style={{
        background: "#fff",
        borderRadius: 16,
        padding: "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        border: "1px solid #f0f0f0"
    }}>
        <div style={{ fontSize: "2rem" }}>{emoji}</div>
        <div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#2d2d2d" }}>{value}</div>
            <div style={{ fontSize: "0.8rem", color: "#888", marginTop: 2 }}>{label}</div>
        </div>
    </div>
);

export default function Admin() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cronLoading, setCronLoading] = useState(false);
    const [cronMsg, setCronMsg] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        adminAPI.getStats()
            .then(res => setStats(res.data))
            .catch(err => setError(err.response?.data?.error || "Failed to load stats"))
            .finally(() => setLoading(false));
    }, []);

    const handleTriggerCron = async () => {
        setCronLoading(true);
        setCronMsg("");
        try {
            await adminAPI.triggerCron();
            setCronMsg("✅ Weekly insights cron fired successfully! Check the Notifications collection.");
        } catch (e) {
            setCronMsg("❌ " + (e.response?.data?.error || "Failed to trigger cron"));
        } finally {
            setCronLoading(false);
        }
    };

    if (loading) return (
        <div className="page" style={{ textAlign: "center", paddingTop: "4rem" }}>
            <div className="spinner" style={{ width: 40, height: 40, margin: "0 auto" }} />
            <p className="muted" style={{ marginTop: "1rem" }}>Loading admin stats…</p>
        </div>
    );

    if (error) return (
        <div className="page" style={{ textAlign: "center", paddingTop: "4rem" }}>
            <div style={{ fontSize: "3rem" }}>🔒</div>
            <h2 style={{ marginTop: "1rem" }}>Access Denied</h2>
            <p className="muted">{error}</p>
        </div>
    );

    const { overview, sessionsPerDay, topContent, emotionDistribution, contentTypeDistribution, ratings, topRated } = stats;

    const radarData = emotionDistribution.map(d => ({
        emotion: d.emotion.charAt(0).toUpperCase() + d.emotion.slice(1),
        value: Math.round(d.average * 100)
    }));

    const pieData = contentTypeDistribution.map(d => ({
        name: d._id.charAt(0).toUpperCase() + d._id.slice(1),
        value: d.count
    }));

    return (
        <div className="page" style={{ maxWidth: 1100, margin: "0 auto", paddingTop: "2rem" }}>
            {/* Header */}
            <div style={{ marginBottom: "2.5rem" }}>
                <h1 style={{ fontSize: "1.8rem", marginBottom: "0.4rem" }}>⚙️ Admin Dashboard</h1>
                <p className="muted">Platform-wide analytics and controls</p>
            </div>

            {/* Overview Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
                <StatCard emoji="👥" label="Total Users" value={overview.totalUsers} />
                <StatCard emoji="🧠" label="Total Sessions" value={overview.totalSessions} />
                <StatCard emoji="📅" label="Sessions Today" value={overview.sessionsToday} />
                <StatCard emoji="🎬" label="Content Items" value={overview.totalContent} />
                <StatCard emoji="⭐" label="Total Ratings" value={overview.totalRatings} />
                <StatCard emoji="👍" label="Thumbs Up" value={ratings.thumbsUp} />
                <StatCard emoji="👎" label="Thumbs Down" value={ratings.thumbsDown} />
            </div>

            {/* Sessions per day */}
            <div className="card" style={{ marginBottom: "2rem" }}>
                <h3 style={{ marginBottom: "1.5rem" }}>📈 Sessions Per Day (last 30 days)</h3>
                {sessionsPerDay.length === 0 ? (
                    <p className="muted">No session data yet.</p>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={sessionsPerDay} barSize={16}>
                            <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip labelFormatter={l => `Date: ${l}`} />
                            <Bar dataKey="count" name="Sessions" fill="#7F77DD" radius={[4,4,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Two-column: Emotion radar + Content type pie */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                <div className="card">
                    <h3 style={{ marginBottom: "1rem" }}>🌐 Global Emotion Distribution (7 days)</h3>
                    {radarData.length === 0 ? <p className="muted">No data yet.</p> : (
                        <ResponsiveContainer width="100%" height={260}>
                            <RadarChart data={radarData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="emotion" tick={{ fontSize: 11 }} />
                                <Radar name="Avg %" dataKey="value" stroke="#7F77DD" fill="#7F77DD" fillOpacity={0.35} />
                                <Tooltip formatter={v => `${v}%`} />
                            </RadarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: "1rem" }}>🎬 Content Type Distribution</h3>
                    {pieData.length === 0 ? <p className="muted">No data yet.</p> : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                                    {pieData.map((_, i) => (
                                        <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Two-column: Top recommended + Top rated */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                <div className="card">
                    <h3 style={{ marginBottom: "1rem" }}>🔁 Most Recommended Content</h3>
                    {topContent.length === 0 ? <p className="muted">No recommendation data yet.</p> : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {topContent.map((item, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8,
                                        background: TYPE_COLORS[i % TYPE_COLORS.length],
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: "#fff", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0
                                    }}>{i + 1}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                                        <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "capitalize" }}>{item.type}</div>
                                    </div>
                                    <div style={{ fontSize: "0.85rem", color: "#7F77DD", fontWeight: 600 }}>{item.count}x</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: "1rem" }}>👍 Top Rated Content</h3>
                    {topRated.length === 0 ? <p className="muted">No ratings yet.</p> : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {topRated.map((item, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8,
                                        background: "#43AA8B",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: "#fff", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0
                                    }}>{i + 1}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                                        <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "capitalize" }}>{item.type}</div>
                                    </div>
                                    <div style={{ fontSize: "0.85rem", color: "#43AA8B", fontWeight: 600 }}>👍 {item.likes}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Cron trigger */}
            <div className="card" style={{ borderLeft: "4px solid #7F77DD" }}>
                <h3 style={{ marginBottom: "0.5rem" }}>⏰ Weekly Insights Cron</h3>
                <p className="muted" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
                    Runs automatically every Sunday at 9AM. Use this to trigger it manually for testing or demo.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={handleTriggerCron}
                    disabled={cronLoading}
                    style={{ width: "auto" }}
                >
                    {cronLoading ? "Running…" : "▶ Trigger Weekly Insights Now"}
                </button>
                {cronMsg && (
                    <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: cronMsg.startsWith("✅") ? "#1D9E75" : "#E24B4A" }}>
                        {cronMsg}
                    </p>
                )}
            </div>
        </div>
    );
}
